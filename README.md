# SoukPay Rewards App

A full-stack rewards mobile app built with React Native (Expo) + Express.js + PostgreSQL.

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop (for PostgreSQL)
- Expo Go app on your phone **or** an iOS/Android emulator

---

### 1. Start the Database

```bash
docker-compose up postgres -d
```

---

### 2. Start the Backend

```bash
cd backend
npm install
npm run db:push      # Push Prisma schema to DB
npm run db:seed      # Seed users, rewards, and ledger entries
npm run dev          # Start Express API on http://localhost:3000
```

**Test accounts** (all use password: `password123`):
| Email | Balance |
|---|---|
| alice@soukpay.com | 12,480 pts |
| bob@soukpay.com | 24,850 pts |
| carol@soukpay.com | 8,000 pts |

---

### 3. Configure Mobile API URL

Edit [mobile/services/api.ts](mobile/services/api.ts):

```ts
// iOS Simulator
export const BASE_URL = 'http://localhost:3000';

// Android Emulator
export const BASE_URL = 'http://10.0.2.2:3000';

// Physical device — replace with your machine's LAN IP
export const BASE_URL = 'http://192.168.1.XXX:3000';
```

---

### 4. Start the Mobile App

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` for iOS simulator / `a` for Android emulator.

---

### Docker (Full Stack)

To run backend + database together with one command:

```bash
docker-compose up --build
```

Then follow step 3 and 4 above for the mobile app.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | ❌ | Login, returns JWT |
| GET | `/users/me` | ✅ | Profile + balance |
| GET | `/users/me/transactions` | ✅ | Paginated ledger (`?page=&limit=`) |
| GET | `/users/me/redemptions` | ✅ | Redemption history |
| GET | `/rewards` | ✅ | Active rewards (stock > 0) |
| POST | `/rewards/:id/redeem` | ✅ | Redeem (requires `X-Idempotency-Key`) |
| GET | `/rewards/leaderboard` | ✅ | Top 10 users by points |

---

## Running Tests

```bash
cd backend
npm test
```

Tests cover:
- Successful redemption
- Duplicate idempotency key (returns 200, not 201)
- Insufficient points (returns 422)
- Missing idempotency key header (returns 400)
- Unauthenticated request (returns 401)

---

## Architecture Decisions

### Backend

- **Express.js + Prisma + PostgreSQL**: Prisma gives type-safe database access with zero SQL boilerplate. Migrations are version-controlled via `prisma/schema.prisma`.

- **Atomic Redemption via `prisma.$transaction`**: The redeem endpoint checks balance, deducts points, decrements stock, and records the redemption inside a single database transaction. This prevents race conditions — no double-spend.

- **Idempotency Key**: The `X-Idempotency-Key` header prevents duplicate redemptions. If the same key is sent twice, the second request returns the original redemption (status 200) instead of creating a new one.

- **JWT Auth**: Tokens expire in 7 days. The expiry timestamp is returned alongside the token so the mobile app can validate locally without a round-trip.

- **Push Notifications**: On successful redemption, the backend sends an Expo push notification fire-and-forget (doesn't block the response if it fails).

### Mobile

- **Expo Router (file-based routing)**: Routes map directly to files. `(auth)` group = unauthenticated screens, `(tabs)` group = protected screens with auth guard.

- **Redux Toolkit**: Three slices — `auth` (token/session), `user` (profile/transactions), `rewards` (rewards/redeem state). `createAsyncThunk` handles loading/error states cleanly.

- **Optimistic Updates**: After redemption, balance and transaction list update instantly (before server confirmation) using `deductBalance` and `prependTransaction` actions. The UI never waits for a full page reload.

- **expo-secure-store**: JWT and expiry timestamp are stored in the device's encrypted keychain, not AsyncStorage.

- **Count-up Animation**: The balance on the Home screen animates from 0 to the current value using `Animated.timing` with a listener — no third-party animation library needed.

- **Skeleton Loaders**: Pulsing skeleton placeholders replace spinners while data loads, matching the content layout.

---

## What I'd Add With More Time

- **Token refresh flow**: Silently refresh the JWT 1 hour before expiry using a background task.
- **Real reward images**: Integrate Unsplash or serve static images from the backend instead of icon placeholders.
- **Offline mode**: `expo-network` integration to detect connectivity and show a banner + disable the Redeem button.
- **Leaderboard screen**: A 4th tab showing the top 10 users with rank badges.
- **Biometric auth**: Use `expo-local-authentication` to re-authenticate before redemption.
- **E2E tests**: Detox tests for the full login → redeem flow.
- **CI/CD**: GitHub Actions pipeline running `npm test` on each PR.
- **Rate limiting**: `express-rate-limit` on auth endpoints to prevent brute force.

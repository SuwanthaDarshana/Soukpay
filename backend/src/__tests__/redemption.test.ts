/**
 * Jest tests for the redemption service logic.
 * These test the happy path, insufficient points, and duplicate idempotency key scenarios.
 *
 * Run: npm test
 */

import request from 'supertest';
import app from '../index';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

let authToken: string;
let rewardId: string;
let userId: string;

beforeAll(async () => {
  // Clean up and create fresh test data
  await prisma.redemption.deleteMany({ where: { user: { email: 'test@soukpay.com' } } });
  await prisma.pointLedger.deleteMany({ where: { user: { email: 'test@soukpay.com' } } });
  await prisma.user.deleteMany({ where: { email: 'test@soukpay.com' } });

  const user = await prisma.user.create({
    data: {
      email: 'test@soukpay.com',
      name: 'Test User',
      password: await bcrypt.hash('password123', 10),
    },
  });
  userId = user.id;

  await prisma.pointLedger.create({
    data: { user_id: userId, delta: 5000, reason: 'Test seed balance' },
  });

  const reward = await prisma.reward.create({
    data: {
      name: 'Test Reward',
      description: 'Test reward for unit tests',
      points_cost: 3000,
      stock_remaining: 5,
      is_active: true,
    },
  });
  rewardId = reward.id;

  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'test@soukpay.com', password: 'password123' });

  authToken = loginRes.body.token;
});

afterAll(async () => {
  await prisma.redemption.deleteMany({ where: { user_id: userId } });
  await prisma.pointLedger.deleteMany({ where: { user_id: userId } });
  await prisma.reward.deleteMany({ where: { id: rewardId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe('POST /rewards/:id/redeem', () => {
  it('should redeem a reward successfully', async () => {
    const res = await request(app)
      .post(`/rewards/${rewardId}/redeem`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Idempotency-Key', 'test-key-success-1')
      .send();

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Redemption successful');
    expect(res.body.redemption).toBeDefined();
    expect(res.body.reward.points_cost).toBe(3000);
  });

  it('should return 200 for duplicate idempotency key (idempotent)', async () => {
    const res = await request(app)
      .post(`/rewards/${rewardId}/redeem`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Idempotency-Key', 'test-key-success-1')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Already redeemed');
  });

  it('should return 422 for insufficient points', async () => {
    const expensiveReward = await prisma.reward.create({
      data: {
        name: 'Expensive Test Reward',
        description: 'Too expensive',
        points_cost: 99999,
        stock_remaining: 5,
        is_active: true,
      },
    });

    const res = await request(app)
      .post(`/rewards/${expensiveReward.id}/redeem`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Idempotency-Key', 'test-key-insufficient')
      .send();

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Insufficient points');

    await prisma.reward.delete({ where: { id: expensiveReward.id } });
  });

  it('should return 400 when X-Idempotency-Key header is missing', async () => {
    const res = await request(app)
      .post(`/rewards/${rewardId}/redeem`)
      .set('Authorization', `Bearer ${authToken}`)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('X-Idempotency-Key');
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app)
      .post(`/rewards/${rewardId}/redeem`)
      .set('X-Idempotency-Key', 'test-key-no-auth')
      .send();

    expect(res.status).toBe(401);
  });
});

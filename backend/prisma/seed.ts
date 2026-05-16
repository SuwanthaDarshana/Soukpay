import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log('Seeding database...');

  await prisma.redemption.deleteMany();
  await prisma.pointLedger.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create 3 users
  const alice = await prisma.user.create({
    data: { email: 'alice@soukpay.com', name: 'Alice Chen', password: hashedPassword },
  });
  const bob = await prisma.user.create({
    data: { email: 'bob@soukpay.com', name: 'Bob Martinez', password: hashedPassword },
  });
  const carol = await prisma.user.create({
    data: { email: 'carol@soukpay.com', name: 'Carol Johnson', password: hashedPassword },
  });

  // Create 4 rewards
  await prisma.reward.createMany({
    data: [
      {
        name: 'Pro Sound Headphones',
        description: 'Studio-quality audio with active noise cancellation for the ultimate focus.',
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
        points_cost: 15000,
        stock_remaining: 12,
        is_active: true,
      },
      {
        name: 'Zen Spa Escape',
        description: 'A full-day immersive relaxation experience at our partner luxury retreats.',
        image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80',
        points_cost: 8500,
        stock_remaining: 5,
        is_active: true,
      },
      {
        name: 'First Class Upgrade',
        description: 'Upgrade any international flight to First Class suite with premium amenities.',
        image_url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
        points_cost: 45000,
        stock_remaining: 2,
        is_active: true,
      },
      {
        name: 'Gourmet Box',
        description: 'A curated selection of artisanal delicacies delivered to your door.',
        image_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
        points_cost: 3200,
        stock_remaining: 50,
        is_active: true,
      },
    ],
  });

  // Alice ledger — balance: 12,480 pts
  const aliceEntries = [
    { delta: 5000, reason: 'Welcome Bonus', day: 30 },
    { delta: 1500, reason: 'Luxury Boutique • Purchase', day: 28 },
    { delta: 800,  reason: 'Global Airways • Travel', day: 26 },
    { delta: 2000, reason: 'Referral Bonus', day: 24 },
    { delta: 450,  reason: 'Luxury Boutique • Purchase', day: 21 },
    { delta: -2500, reason: 'Global Airways • Redemption', day: 19 },
    { delta: 125,  reason: 'Maison Bistro • Dining', day: 17 },
    { delta: 1000, reason: 'Referral Bonus', day: 15 },
    { delta: 45,   reason: 'Bolt Rides • Travel', day: 14 },
    { delta: 300,  reason: 'Amazon Purchase • Cashback', day: 12 },
    { delta: 112,  reason: 'Vault Savings • Interest Accrual', day: 10 },
    { delta: 750,  reason: 'Premium Shopping • Purchase', day: 8 },
    { delta: 200,  reason: 'Restaurant Week • Dining', day: 7 },
    { delta: 1500, reason: 'Monthly Milestone Bonus', day: 5 },
    { delta: 698,  reason: 'Weekend Cashback', day: 3 },
    { delta: 500,  reason: 'Partner Referral Bonus', day: 1 },
  ];
  // Sum: 5000+1500+800+2000+450-2500+125+1000+45+300+112+750+200+1500+698+500 = 12480

  for (const e of aliceEntries) {
    await prisma.pointLedger.create({
      data: { user_id: alice.id, delta: e.delta, reason: e.reason, created_at: daysAgo(e.day) },
    });
  }

  // Bob ledger — balance: 24,850 pts
  const bobEntries = [
    { delta: 10000, reason: 'Elite Welcome Bonus', day: 45 },
    { delta: 3000,  reason: 'Premium Shopping • Purchase', day: 40 },
    { delta: 2000,  reason: 'Referral Bonus x2', day: 35 },
    { delta: 1500,  reason: 'Global Airways • Business Travel', day: 32 },
    { delta: -8500, reason: 'Redeemed: Pro Sound Headphones', day: 30 },
    { delta: 2000,  reason: 'Monthly Milestone', day: 28 },
    { delta: 1200,  reason: 'Fine Dining • Reward', day: 25 },
    { delta: 3500,  reason: 'Luxury Purchase • Cashback', day: 22 },
    { delta: 1000,  reason: 'Referral Bonus', day: 20 },
    { delta: 800,   reason: 'Amazon Purchase • Cashback', day: 18 },
    { delta: 500,   reason: 'Vault Savings • Interest Accrual', day: 15 },
    { delta: 2000,  reason: 'Partner Bonus', day: 12 },
    { delta: 1500,  reason: 'Shopping Spree • Purchase', day: 10 },
    { delta: 1350,  reason: 'Weekend Bonus', day: 7 },
    { delta: 1500,  reason: 'Quarterly Loyalty Bonus', day: 4 },
    { delta: 1500,  reason: 'New Referral Bonus', day: 2 },
  ];
  // Sum: 10000+3000+2000+1500-8500+2000+1200+3500+1000+800+500+2000+1500+1350+1500+1500 = 24850

  for (const e of bobEntries) {
    await prisma.pointLedger.create({
      data: { user_id: bob.id, delta: e.delta, reason: e.reason, created_at: daysAgo(e.day) },
    });
  }

  // Carol ledger — balance: 8,000 pts
  const carolEntries = [
    { delta: 2500,  reason: 'Welcome Bonus', day: 20 },
    { delta: 500,   reason: 'First Purchase Bonus', day: 18 },
    { delta: 800,   reason: 'Online Shopping • Cashback', day: 16 },
    { delta: 1200,  reason: 'Travel Points • Flight', day: 14 },
    { delta: 400,   reason: 'Restaurant • Dining Cashback', day: 12 },
    { delta: 300,   reason: 'Coffee Shop • Dining', day: 11 },
    { delta: 600,   reason: 'Online Shopping • Purchase', day: 10 },
    { delta: 500,   reason: 'Referral Bonus', day: 9 },
    { delta: 200,   reason: 'Vault Savings • Interest Accrual', day: 8 },
    { delta: -3200, reason: 'Redeemed: Gourmet Box', day: 7 },
    { delta: 800,   reason: 'Weekend Cashback', day: 6 },
    { delta: 400,   reason: 'Grocery Rewards', day: 5 },
    { delta: 500,   reason: 'Movie Night • Cashback', day: 4 },
    { delta: 1500,  reason: 'Loyalty Milestone Bonus', day: 3 },
    { delta: 800,   reason: 'Partner Bonus', day: 2 },
    { delta: 200,   reason: 'Daily Check-in Bonus', day: 1 },
  ];
  // Sum: 2500+500+800+1200+400+300+600+500+200-3200+800+400+500+1500+800+200 = 8000

  for (const e of carolEntries) {
    await prisma.pointLedger.create({
      data: { user_id: carol.id, delta: e.delta, reason: e.reason, created_at: daysAgo(e.day) },
    });
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('\nTest accounts (all use password: password123):');
  console.log('  alice@soukpay.com  — Balance: 12,480 pts');
  console.log('  bob@soukpay.com    — Balance: 24,850 pts');
  console.log('  carol@soukpay.com  — Balance:  8,000 pts');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

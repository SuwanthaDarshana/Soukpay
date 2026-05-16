import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /rewards — active rewards with stock > 0
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rewards = await prisma.reward.findMany({
      where: { is_active: true, stock_remaining: { gt: 0 } },
      orderBy: { points_cost: 'asc' },
    });

    res.json({ data: rewards });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /leaderboard — top 10 users by lifetime earned points
router.get('/leaderboard', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const results = await prisma.pointLedger.groupBy({
      by: ['user_id'],
      _sum: { delta: true },
      orderBy: { _sum: { delta: 'desc' } },
      take: 10,
    });

    const userIds = results.map((r) => r.user_id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const leaderboard = results.map((r, index) => {
      const user = users.find((u) => u.id === r.user_id);
      return { rank: index + 1, name: user?.name ?? 'Unknown', balance: r._sum.delta ?? 0 };
    });

    res.json({ data: leaderboard });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rewards/:id/redeem — atomic redemption with idempotency
router.post('/:id/redeem', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id: rewardId } = req.params;
  const idempotencyKey = req.headers['x-idempotency-key'] as string;

  if (!idempotencyKey) {
    res.status(400).json({ error: 'X-Idempotency-Key header is required' });
    return;
  }

  try {
    // Return existing redemption for duplicate requests (idempotent)
    const existing = await prisma.redemption.findUnique({
      where: { idempotency_key: idempotencyKey },
      include: { reward: true },
    });
    if (existing) {
      res.status(200).json({ message: 'Already redeemed', redemption: existing });
      return;
    }

    // Atomic transaction: check balance, deduct points, decrement stock, create record
    const result = await prisma.$transaction(async (tx) => {
      const reward = await tx.reward.findUnique({ where: { id: rewardId } });

      if (!reward || !reward.is_active) throw new Error('REWARD_NOT_FOUND');
      if (reward.stock_remaining <= 0) throw new Error('OUT_OF_STOCK');

      const balanceResult = await tx.pointLedger.aggregate({
        where: { user_id: req.userId },
        _sum: { delta: true },
      });

      if ((balanceResult._sum.delta ?? 0) < reward.points_cost) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      await tx.pointLedger.create({
        data: {
          user_id: req.userId!,
          delta: -reward.points_cost,
          reason: `Redeemed: ${reward.name}`,
        },
      });

      await tx.reward.update({
        where: { id: rewardId },
        data: { stock_remaining: { decrement: 1 } },
      });

      const redemption = await tx.redemption.create({
        data: {
          user_id: req.userId!,
          reward_id: rewardId,
          points_cost: reward.points_cost,
          idempotency_key: idempotencyKey,
        },
      });

      return { redemption, reward };
    });

    // Trigger push notification if user has a push token (fire-and-forget)
    prisma.user
      .findUnique({ where: { id: req.userId }, select: { push_token: true, name: true } })
      .then(async (user) => {
        if (user?.push_token) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: user.push_token,
              title: '🎉 Redemption Successful!',
              body: `You redeemed ${result.reward.name} for ${result.reward.points_cost.toLocaleString()} points.`,
            }),
          });
        }
      })
      .catch(() => {});

    res.status(201).json({
      message: 'Redemption successful',
      redemption: result.redemption,
      reward: {
        id: result.reward.id,
        name: result.reward.name,
        points_cost: result.reward.points_cost,
      },
    });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'INSUFFICIENT_POINTS') {
      res.status(422).json({ error: 'Insufficient points' });
    } else if (msg === 'OUT_OF_STOCK') {
      res.status(422).json({ error: 'Reward is out of stock' });
    } else if (msg === 'REWARD_NOT_FOUND') {
      res.status(404).json({ error: 'Reward not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;

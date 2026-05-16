import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /users/me — profile + computed point balance
router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, push_token: true, created_at: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const balanceResult = await prisma.pointLedger.aggregate({
      where: { user_id: req.userId },
      _sum: { delta: true },
    });

    res.json({ ...user, balance: balanceResult._sum.delta ?? 0 });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/me/transactions — paginated ledger
router.get('/me/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  try {
    const [transactions, total] = await Promise.all([
      prisma.pointLedger.findMany({
        where: { user_id: req.userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pointLedger.count({ where: { user_id: req.userId } }),
    ]);

    res.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + transactions.length < total,
      },
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/me/redemptions — redemption history
router.get('/me/redemptions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const redemptions = await prisma.redemption.findMany({
      where: { user_id: req.userId },
      include: { reward: { select: { name: true, image_url: true, description: true } } },
      orderBy: { created_at: 'desc' },
    });

    res.json({ data: redemptions });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /users/me/push-token — update Expo push token
router.patch('/me/push-token', async (req: AuthRequest, res: Response): Promise<void> => {
  const { push_token } = req.body;

  if (!push_token) {
    res.status(400).json({ error: 'push_token is required' });
    return;
  }

  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { push_token },
    });

    res.json({ message: 'Push token updated' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

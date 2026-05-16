import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import rewardRoutes from './routes/rewards';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/rewards', rewardRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 SoukPay API running on http://localhost:${PORT}`);
  });
}

export default app;

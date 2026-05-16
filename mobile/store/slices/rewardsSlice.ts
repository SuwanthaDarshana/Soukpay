import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { deductBalance, prependTransaction } from './userSlice';

export interface Reward {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  points_cost: number;
  stock_remaining: number;
  is_active: boolean;
  created_at: string;
}

interface RewardsState {
  rewards: Reward[];
  isLoading: boolean;
  isRedeeming: boolean;
  error: string | null;
  redeemError: string | null;
  lastRedeemedId: string | null;
}

const initialState: RewardsState = {
  rewards: [],
  isLoading: false,
  isRedeeming: false,
  error: null,
  redeemError: null,
  lastRedeemedId: null,
};

export const fetchRewards = createAsyncThunk(
  'rewards/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/rewards');
      return res.data.data as Reward[];
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error ?? 'Failed to load rewards');
    }
  }
);

function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export const redeemReward = createAsyncThunk(
  'rewards/redeem',
  async (rewardId: string, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.post(`/rewards/${rewardId}/redeem`, null, {
        headers: { 'X-Idempotency-Key': generateIdempotencyKey() },
      });

      const { redemption, reward } = res.data;

      // Optimistic update: deduct balance and prepend transaction
      dispatch(deductBalance(reward.points_cost));
      dispatch(
        prependTransaction({
          id: redemption.id,
          user_id: redemption.user_id,
          delta: -reward.points_cost,
          reason: `Redeemed: ${reward.name}`,
          created_at: redemption.created_at,
        })
      );

      return { rewardId, pointsCost: reward.points_cost };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ?? 'Redemption failed. Please try again.'
      );
    }
  }
);

const rewardsSlice = createSlice({
  name: 'rewards',
  initialState,
  reducers: {
    clearRedeemError(state) {
      state.redeemError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRewards.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRewards.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rewards = action.payload;
      })
      .addCase(fetchRewards.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(redeemReward.pending, (state) => {
        state.isRedeeming = true;
        state.redeemError = null;
        state.lastRedeemedId = null;
      })
      .addCase(redeemReward.fulfilled, (state, action) => {
        state.isRedeeming = false;
        state.lastRedeemedId = action.payload.rewardId;
        // Decrement stock locally
        const reward = state.rewards.find((r) => r.id === action.payload.rewardId);
        if (reward) reward.stock_remaining -= 1;
      })
      .addCase(redeemReward.rejected, (state, action) => {
        state.isRedeeming = false;
        state.redeemError = action.payload as string;
      });
  },
});

export const { clearRedeemError } = rewardsSlice.actions;
export default rewardsSlice.reducer;

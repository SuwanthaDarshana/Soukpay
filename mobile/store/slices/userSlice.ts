import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export interface Transaction {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  balance: number;
  push_token: string | null;
  created_at: string;
}

interface UserState {
  profile: UserProfile | null;
  transactions: Transaction[];
  page: number;
  hasMore: boolean;
  isLoadingProfile: boolean;
  isLoadingTransactions: boolean;
  isRefreshing: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  transactions: [],
  page: 1,
  hasMore: true,
  isLoadingProfile: false,
  isLoadingTransactions: false,
  isRefreshing: false,
  error: null,
};

export const fetchProfile = createAsyncThunk('user/fetchProfile', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/users/me');
    return res.data as UserProfile;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error ?? 'Failed to load profile');
  }
});

export const fetchTransactions = createAsyncThunk(
  'user/fetchTransactions',
  async ({ page, limit = 20 }: { page: number; limit?: number }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/users/me/transactions?page=${page}&limit=${limit}`);
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error ?? 'Failed to load transactions');
    }
  }
);

export const refreshAll = createAsyncThunk('user/refreshAll', async (_, { dispatch }) => {
  await Promise.all([
    dispatch(fetchProfile()),
    dispatch(fetchTransactions({ page: 1 })),
  ]);
});

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Optimistic balance update after redemption
    deductBalance(state, action: PayloadAction<number>) {
      if (state.profile) {
        state.profile.balance -= action.payload;
      }
    },
    // Prepend a new transaction to the top of the list (after redemption)
    prependTransaction(state, action: PayloadAction<Transaction>) {
      state.transactions.unshift(action.payload);
    },
    clearUser() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.isLoadingProfile = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoadingProfile = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoadingProfile = false;
        state.error = action.payload as string;
      })

      .addCase(fetchTransactions.pending, (state, action) => {
        if (action.meta.arg.page === 1) {
          state.isRefreshing = true;
        } else {
          state.isLoadingTransactions = true;
        }
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoadingTransactions = false;
        state.isRefreshing = false;
        const { data, pagination } = action.payload;
        state.transactions =
          pagination.page === 1 ? data : [...state.transactions, ...data];
        state.page = pagination.page;
        state.hasMore = pagination.hasMore;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoadingTransactions = false;
        state.isRefreshing = false;
        state.error = action.payload as string;
      });
  },
});

export const { deductBalance, prependTransaction, clearUser } = userSlice.actions;
export default userSlice.reducer;

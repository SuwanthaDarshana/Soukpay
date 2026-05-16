import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getItem, setItem, deleteItem } from '../../services/storage';
import { api } from '../../services/api';

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  token: string | null;
  expiresAt: number | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  expiresAt: null,
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,
};

// Read token from SecureStore on app launch and validate expiry
export const initializeAuth = createAsyncThunk('auth/initialize', async () => {
  const token = await getItem('auth_token');
  const expiresAtStr = await getItem('auth_expires_at');

  if (!token || !expiresAtStr) return null;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (Date.now() > expiresAt) {
    await deleteItem('auth_token');
    await deleteItem('auth_expires_at');
    return null;
  }

  return { token, expiresAt };
});

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, expiresAt, user } = res.data;

      await setItem('auth_token', token);
      await setItem('auth_expires_at', expiresAt.toString());

      return { token, expiresAt, user };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error ?? 'Login failed. Please check your connection.'
      );
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await deleteItem('auth_token');
  await deleteItem('auth_expires_at');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.token = action.payload.token;
          state.expiresAt = action.payload.expiresAt;
          state.isAuthenticated = true;
        }
        state.isInitialized = true;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isInitialized = true;
      })

      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.expiresAt = action.payload.expiresAt;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(logout.fulfilled, (state) => {
        state.token = null;
        state.expiresAt = null;
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;

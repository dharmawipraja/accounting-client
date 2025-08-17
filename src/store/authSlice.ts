import type { AuthState } from '@/types';
import { clearAuthData, getStoredToken, getStoredUser, storeToken, storeUser } from '@/utils/auth';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

const initialState: AuthState = {
  user: getStoredUser(),
  token: getStoredToken(),
  isAuthenticated: !!getStoredToken() && !!getStoredUser(),
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
    },
    loginSuccess: (state, action: PayloadAction<{ user: AuthState['user']; token: string }>) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.isLoading = false;
      
      // Store in localStorage
      storeToken(token);
      storeUser(user);
    },
    loginFailure: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      clearAuthData();
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      clearAuthData();
    },
    updateProfile: (state, action: PayloadAction<Partial<NonNullable<AuthState['user']>>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        storeUser(state.user);
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateProfile,
  setLoading,
} = authSlice.actions;

export default authSlice.reducer;

import { authService } from '@/services/auth';
import { loginFailure, loginStart, loginSuccess, logout, setLoading } from '@/store/authSlice';
import { addNotification } from '@/store/uiSlice';
import type { ChangePasswordPayload, LoginPayload } from '@/types';
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  const login = useCallback(async (credentials: LoginPayload) => {
    try {
      dispatch(loginStart());
      const response = await authService.login(credentials);
      
      if (response.success) {
        dispatch(loginSuccess({
          user: response.data.user,
          token: response.data.token,
        }));
        
        dispatch(addNotification({
          type: 'success',
          title: 'Login Successful',
          message: 'Welcome back!',
        }));
        
        return { success: true };
      } else {
        dispatch(loginFailure());
        dispatch(addNotification({
          type: 'error',
          title: 'Login Failed',
          message: response.message || 'Invalid credentials',
        }));
        
        return { success: false, message: response.message };
      }
    } catch (error: any) {
      dispatch(loginFailure());
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      
      dispatch(addNotification({
        type: 'error',
        title: 'Login Error',
        message,
      }));
      
      return { success: false, message };
    }
  }, [dispatch]);

  const logoutUser = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      await authService.logout();
      
      dispatch(logout());
      dispatch(addNotification({
        type: 'success',
        title: 'Logged Out',
        message: 'You have been successfully logged out.',
      }));
    } catch (error) {
      // Even if logout request fails, clear local auth data
      dispatch(logout());
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const refreshProfile = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      const response = await authService.getProfile();
      
      if (response.success && auth.token) {
        dispatch(loginSuccess({
          user: {
            id: response.data.id,
            username: response.data.username,
            name: response.data.name,
            role: response.data.role,
            status: response.data.status,
            createdAt: response.data.createdAt,
            updatedAt: response.data.updatedAt,
          },
          token: auth.token,
        }));
      }
    } catch (error) {
      // If profile refresh fails, logout the user
      dispatch(logout());
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, auth.token]);

  const changePassword = useCallback(async (payload: ChangePasswordPayload) => {
    try {
      dispatch(setLoading(true));
      const response = await authService.changePassword(payload);
      
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          title: 'Password Changed',
          message: 'Your password has been successfully updated.',
        }));
        
        return { success: true };
      } else {
        dispatch(addNotification({
          type: 'error',
          title: 'Password Change Failed',
          message: response.message || 'Failed to change password',
        }));
        
        return { success: false, message: response.message };
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password';
      
      dispatch(addNotification({
        type: 'error',
        title: 'Password Change Error',
        message,
      }));
      
      return { success: false, message };
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  return {
    // State
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    
    // Actions
    login,
    logout: logoutUser,
    refreshProfile,
    changePassword,
  };
};

import { create } from 'zustand';
import { authAPI } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('lifepilot_user') || 'null'),
  token: localStorage.getItem('lifepilot_token') || null,
  isAuthenticated: !!localStorage.getItem('lifepilot_token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.login({ email, password });
      const { token, user } = res.data;
      localStorage.setItem('lifepilot_token', token);
      localStorage.setItem('lifepilot_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to sign in. Please verify credentials.';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.register({ name, email, password });
      const { token, user } = res.data;
      localStorage.setItem('lifepilot_token', token);
      localStorage.setItem('lifepilot_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed.';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  logout: () => {
    localStorage.removeItem('lifepilot_token');
    localStorage.removeItem('lifepilot_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('lifepilot_token');
    if (!token) return;
    try {
      const res = await authAPI.getMe();
      set({ user: res.data.user, isAuthenticated: true });
      localStorage.setItem('lifepilot_user', JSON.stringify(res.data.user));
    } catch (err) {
      get().logout();
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await authAPI.updateProfile(data);
      const updated = { ...get().user, ...res.data.user };
      localStorage.setItem('lifepilot_user', JSON.stringify(updated));
      set({ user: updated });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Update failed' };
    }
  }
}));


import { create } from 'zustand';
import { notificationsAPI } from '../services/api';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    try {
      set({ isLoading: true });
      const res = await notificationsAPI.getAll();
      set({
        notifications: res.data.notifications || [],
        unreadCount: res.data.unreadCount || 0,
        isLoading: false
      });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  markRead: async (id) => {
    try {
      await notificationsAPI.markRead(id);
      set((state) => ({
        notifications: state.notifications.map(n => n._id === id ? { ...n, isRead: true } : n),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } catch (err) {
      console.error(err);
    }
  },

  markAllRead: async () => {
    try {
      await notificationsAPI.markAllRead();
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0
      }));
    } catch (err) {
      console.error(err);
    }
  }
}));


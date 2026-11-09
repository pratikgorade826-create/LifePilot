import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  isDark: true,
  toggleTheme: () => set((state) => {
    const next = !state.isDark;
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { isDark: next };
  }),
  initTheme: () => {
    document.documentElement.classList.add('dark');
  }
}));


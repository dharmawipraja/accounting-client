import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme(t: Theme): void;
  toggle(): void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },
      toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
    }),
    { name: 'buku.theme' },
  ),
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return <>{children}</>;
}

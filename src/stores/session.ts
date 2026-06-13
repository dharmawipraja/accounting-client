import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Role = 'VIEWER' | 'ACCOUNTANT' | 'APPROVER' | 'ADMIN';
export type AuthUser = { id: string; email: string; role: Role };

export interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  setTokens(pair: { accessToken: string; refreshToken: string }): void;
  setUser(user: AuthUser | null): void;
  setStatus(s: SessionState['status']): void;
  clear(): void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      status: 'loading',
      setTokens: (pair) =>
        set({ accessToken: pair.accessToken, refreshToken: pair.refreshToken }),
      setUser: (user) => set({ user, status: user ? 'authenticated' : 'anonymous' }),
      setStatus: (status) => set({ status }),
      clear: () => {
        set({ accessToken: null, refreshToken: null, user: null, status: 'anonymous' });
        localStorage.removeItem('buku.session');
      },
    }),
    {
      name: 'buku.session',
      storage: createJSONStorage(() => localStorage),
      // Persist only the tokens; user + status are re-derived on load via /auth/me.
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }),
    },
  ),
);

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { queryClient } from '@/lib/query/client';

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

/** Navigation seam for the cross-tab logout below (jsdom's window.location is
 *  non-configurable, so tests stub this object instead). */
export const crossTabLogout = {
  leaveToLogin: () => {
    if (window.location.pathname !== '/login') window.location.replace('/login');
  },
};

// Cross-tab sync: `storage` fires in OTHER tabs when this key changes. Without
// this, "sign out (all devices)" in one tab leaves sibling tabs writing with
// their in-memory tokens until expiry — an SoD/audit gap. Token rotation is
// adopted too, so a sibling tab's refresh keeps this tab alive.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== 'buku.session') return;
    if (event.newValue === null) {
      useSession.setState({ accessToken: null, refreshToken: null, user: null, status: 'anonymous' });
      // A signed-out tab must not keep cached financial data on screen: drop
      // the query cache and leave the protected route entirely.
      queryClient.clear();
      crossTabLogout.leaveToLogin();
      return;
    }
    try {
      const { state } = JSON.parse(event.newValue) as {
        state?: { accessToken?: string | null; refreshToken?: string | null };
      };
      if (!state) return;
      useSession.setState({
        accessToken: state.accessToken ?? null,
        refreshToken: state.refreshToken ?? null,
      });
    } catch {
      /* corrupt payload from another tab — keep current state */
    }
  });
}

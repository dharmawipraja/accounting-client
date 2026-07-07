import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/query/client';
import { crossTabLogout, useSession } from './session';

afterEach(() => { useSession.getState().clear(); localStorage.clear(); });

describe('session store', () => {
  it('stores tokens and persists them to localStorage', () => {
    useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
    expect(useSession.getState().accessToken).toBe('a');
    expect(localStorage.getItem('buku.session')).toContain('"accessToken":"a"');
  });

  it('sets the user and marks the session authenticated', () => {
    useSession.getState().setUser({ id: '1', email: 'x@y.z', role: 'ADMIN', mustChangePassword: false });
    expect(useSession.getState().status).toBe('authenticated');
  });

  it('clears tokens, user, and storage and becomes anonymous', () => {
    useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
    useSession.getState().clear();
    expect(useSession.getState().accessToken).toBeNull();
    expect(useSession.getState().status).toBe('anonymous');
    expect(localStorage.getItem('buku.session')).toBeNull();
  });

  // "Logout all devices" in one tab must not leave sibling tabs writing with
  // their still-in-memory tokens (SoD/audit gap) — nor showing cached financial
  // data on a protected route.
  it('clears the session + query cache and leaves for /login when another tab logs out', () => {
    const clearSpy = vi.spyOn(queryClient, 'clear').mockImplementation(() => {});
    const replaceSpy = vi.spyOn(crossTabLogout, 'leaveToLogin').mockImplementation(() => {});
    try {
      useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
      useSession.getState().setUser({ id: '1', email: 'x@y.z', role: 'ADMIN', mustChangePassword: false });
      window.dispatchEvent(new StorageEvent('storage', { key: 'buku.session', newValue: null }));
      expect(useSession.getState().accessToken).toBeNull();
      expect(useSession.getState().user).toBeNull();
      expect(useSession.getState().status).toBe('anonymous');
      expect(clearSpy).toHaveBeenCalled();
      expect(replaceSpy).toHaveBeenCalled();
    } finally {
      clearSpy.mockRestore();
      replaceSpy.mockRestore();
    }
  });

  it('adopts rotated tokens from another tab, keeping the user', () => {
    useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
    useSession.getState().setUser({ id: '1', email: 'x@y.z', role: 'ADMIN', mustChangePassword: false });
    const payload = JSON.stringify({ state: { accessToken: 'a2', refreshToken: 'b2' }, version: 0 });
    window.dispatchEvent(new StorageEvent('storage', { key: 'buku.session', newValue: payload }));
    expect(useSession.getState().accessToken).toBe('a2');
    expect(useSession.getState().refreshToken).toBe('b2');
    expect(useSession.getState().user?.id).toBe('1');
  });

  it('ignores other keys and corrupt payloads', () => {
    useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
    window.dispatchEvent(new StorageEvent('storage', { key: 'buku.prefs', newValue: null }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'buku.session', newValue: '{not json' }));
    expect(useSession.getState().accessToken).toBe('a');
  });
});

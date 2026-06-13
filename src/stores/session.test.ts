import { afterEach, describe, expect, it } from 'vitest';
import { useSession } from './session';

afterEach(() => { useSession.getState().clear(); localStorage.clear(); });

describe('session store', () => {
  it('stores tokens and persists them to localStorage', () => {
    useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
    expect(useSession.getState().accessToken).toBe('a');
    expect(localStorage.getItem('buku.session')).toContain('"accessToken":"a"');
  });

  it('sets the user and marks the session authenticated', () => {
    useSession.getState().setUser({ id: '1', email: 'x@y.z', role: 'ADMIN' });
    expect(useSession.getState().status).toBe('authenticated');
  });

  it('clears tokens, user, and storage and becomes anonymous', () => {
    useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
    useSession.getState().clear();
    expect(useSession.getState().accessToken).toBeNull();
    expect(useSession.getState().status).toBe('anonymous');
    expect(localStorage.getItem('buku.session')).toBeNull();
  });
});

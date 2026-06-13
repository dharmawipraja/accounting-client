import { afterEach, describe, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { requireAuth } from './guard';

afterEach(() => useSession.getState().clear());

describe('requireAuth', () => {
  it('throws a redirect to /login when there is no token', () => {
    expect(() => requireAuth()).toThrow();
  });
  it('passes when a token is present', () => {
    useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
    expect(() => requireAuth()).not.toThrow();
  });
});

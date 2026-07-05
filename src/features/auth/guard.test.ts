import { afterEach, describe, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { requireAuth, sanitizeRedirect } from './guard';

afterEach(() => useSession.getState().clear());

describe('requireAuth', () => {
  it('throws a redirect to /login when there is no token', () => {
    expect(() => requireAuth()).toThrow();
  });
  it('captures the attempted destination so login can return to it', () => {
    try {
      requireAuth('/sales-invoices/i1/edit');
      expect.unreachable('should have thrown a redirect');
    } catch (err) {
      const options = (err as { options: { to: string; search?: { redirect?: string } } }).options;
      expect(options.to).toBe('/login');
      expect(options.search).toEqual({ redirect: '/sales-invoices/i1/edit' });
    }
  });
  it('passes when a token is present', () => {
    useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
    expect(() => requireAuth('/x')).not.toThrow();
  });
});

describe('sanitizeRedirect', () => {
  it('keeps in-app absolute paths', () => {
    expect(sanitizeRedirect('/payments/new?direction=RECEIPT')).toBe('/payments/new?direction=RECEIPT');
  });
  it('rejects external and protocol-relative URLs (open redirect)', () => {
    expect(sanitizeRedirect('https://evil.example')).toBeUndefined();
    expect(sanitizeRedirect('//evil.example')).toBeUndefined();
  });
  it('rejects non-strings and empty values', () => {
    expect(sanitizeRedirect(undefined)).toBeUndefined();
    expect(sanitizeRedirect(42)).toBeUndefined();
    expect(sanitizeRedirect('')).toBeUndefined();
    expect(sanitizeRedirect('relative/path')).toBeUndefined();
  });
});

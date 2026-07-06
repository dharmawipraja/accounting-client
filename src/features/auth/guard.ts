import { redirect } from '@tanstack/react-router';
import { useSession } from '@/stores/session';

/** Route `beforeLoad` guard: redirect to /login when unauthenticated, carrying
 *  the attempted destination so login can land back on it (deep links survive). */
export function requireAuth(redirectTo?: string): void {
  if (!useSession.getState().accessToken) {
    const redirectSearch = sanitizeRedirect(redirectTo);
    throw redirect({ to: '/login', search: redirectSearch ? { redirect: redirectSearch } : {} });
  }
}

/** Only in-app absolute paths may be used as a post-login destination — anything
 *  external, protocol-relative ('//host'), or backslash-tricked ('/\\host',
 *  which browsers normalize like '//host') would be an open redirect. As a
 *  backstop, the value is resolved against the app origin and must stay there. */
export function sanitizeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return undefined;
  }
  try {
    const resolved = new URL(value, window.location.origin);
    if (resolved.origin !== window.location.origin) return undefined;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return undefined;
  }
}

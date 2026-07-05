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
 *  external or protocol-relative ('//host') would be an open redirect. */
export function sanitizeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return undefined;
  return value;
}

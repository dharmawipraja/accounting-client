import { redirect } from '@tanstack/react-router';
import { useSession } from '@/stores/session';

/** Route `beforeLoad` guard: redirect to /login when unauthenticated. */
export function requireAuth(): void {
  if (!useSession.getState().accessToken) {
    throw redirect({ to: '/login' });
  }
}

import { useEffect } from 'react';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/stores/session';
import { fetchMe } from './useMe';

/** On mount, if a token exists but no user yet, fetch /auth/me to hydrate. */
export function useHydrateSession(): void {
  const accessToken = useSession((s) => s.accessToken);
  useEffect(() => {
    if (accessToken && !useSession.getState().user) {
      fetchMe()
        .then((me) => useSession.getState().setUser(me))
        .catch((err: unknown) => {
          // Only a genuine auth rejection (token invalid) clears the session.
          // A transient/network failure (e.g. API unreachable) must NOT log the
          // user out — keep the token; user info hydrates on a later success.
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            useSession.getState().clear();
          } else {
            useSession.getState().setStatus('authenticated');
          }
        });
    } else if (!accessToken) {
      useSession.getState().setStatus('anonymous');
    }
  }, [accessToken]);
}

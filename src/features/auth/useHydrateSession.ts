import { useEffect } from 'react';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/stores/session';
import { fetchMe } from './useMe';

/** On mount, if a token exists but no user yet, fetch /auth/me to hydrate.
 *  Transient failures retry with backoff: role gates depend on the hydrated
 *  user, so one startup blip must not leave `user` null (read as "role
 *  unknown" -> loading UI) for the rest of the session. */
export function useHydrateSession(): void {
  const accessToken = useSession((s) => s.accessToken);
  useEffect(() => {
    if (!accessToken) {
      useSession.getState().setStatus('anonymous');
      return;
    }
    if (useSession.getState().user) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const run = () => {
      fetchMe()
        .then((me) => {
          if (!cancelled) useSession.getState().setUser(me);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          // Only a genuine auth rejection (token invalid) clears the session.
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            useSession.getState().clear();
            return;
          }
          // Transient failure (network / 5xx / timeout): keep the token and
          // retry with capped exponential backoff until the API answers.
          useSession.getState().setStatus('authenticated');
          attempt += 1;
          timer = setTimeout(run, Math.min(30_000, 1_000 * 2 ** attempt));
        });
    };
    run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [accessToken]);
}

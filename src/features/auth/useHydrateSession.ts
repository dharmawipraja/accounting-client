import { useEffect } from 'react';
import { useSession } from '@/stores/session';
import { fetchMe } from './useMe';

/** On mount, if a token exists but no user yet, fetch /auth/me to hydrate. */
export function useHydrateSession(): void {
  const accessToken = useSession((s) => s.accessToken);
  useEffect(() => {
    if (accessToken && !useSession.getState().user) {
      fetchMe()
        .then((me) => useSession.getState().setUser(me))
        .catch(() => useSession.getState().clear());
    } else if (!accessToken) {
      useSession.getState().setStatus('anonymous');
    }
  }, [accessToken]);
}

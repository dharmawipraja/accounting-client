import { useSession } from '@/stores/session';
import { API_BASE_URL } from './config';

let inFlight: Promise<string | null> | null = null;

/**
 * Exchange the refresh token for a fresh pair. Concurrent callers share one
 * request. Resolves to the new access token, or null if refresh failed (and
 * the session has been cleared).
 */
export function refreshAccessToken(): Promise<string | null> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const refreshToken = useSession.getState().refreshToken;
    if (!refreshToken) {
      useSession.getState().clear();
      return null;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        useSession.getState().clear();
        return null;
      }
      const pair = (await res.json()) as { accessToken: string; refreshToken: string };
      useSession.getState().setTokens(pair);
      return pair.accessToken;
    } catch {
      useSession.getState().clear();
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

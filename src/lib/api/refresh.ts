import { useSession } from '@/stores/session';
import { API_BASE_URL } from './config';

let inFlight: Promise<string | null> | null = null;

/**
 * Exchange the refresh token for a fresh pair. Concurrent callers share one
 * request. Resolves to the new access token, or null if refresh failed.
 *
 * The session is cleared (forcing re-login) ONLY when the refresh token is
 * genuinely invalid — there is none, or the server explicitly rejects it with
 * 401/403. A transient failure (network error / API unreachable / 5xx) leaves
 * the session intact so a brief outage doesn't log the user out.
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
        // Only a genuine auth rejection ends the session; a transient server
        // error (5xx) must not log the user out.
        if (res.status === 401 || res.status === 403) {
          useSession.getState().clear();
        }
        return null;
      }
      const pair = (await res.json()) as { accessToken: string; refreshToken: string };
      useSession.getState().setTokens(pair);
      return pair.accessToken;
    } catch {
      // Network error / API unreachable — transient. Keep the session so the
      // user stays logged in; the caller's request just fails and can retry.
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

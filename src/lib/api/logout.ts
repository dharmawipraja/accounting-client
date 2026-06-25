import { useSession } from '@/stores/session';
import { API_BASE_URL } from './config';
import { apiFetch } from './client';

/**
 * Best-effort: revoke the current device's refresh-token family server-side.
 * Uses a bare fetch (the endpoint is public/throttled and must work even when
 * the access token is expired) and swallows every failure — logout must never
 * be blocked by a server or network error. The caller clears the local session.
 */
export async function logoutCurrentDevice(): Promise<void> {
  const refreshToken = useSession.getState().refreshToken;
  if (!refreshToken) return;
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Best-effort: revoke ALL sessions for the current user. Authenticated, so it
 * goes through apiFetch to attach the Bearer header. Swallows failures.
 */
export async function logoutAllDevices(): Promise<void> {
  try {
    await apiFetch('/auth/logout-all', { method: 'POST' });
  } catch {
    /* best-effort */
  }
}

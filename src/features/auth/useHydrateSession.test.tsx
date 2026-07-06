import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useHydrateSession } from './useHydrateSession';

afterEach(() => {
  useSession.getState().clear();
});

it('keeps the session when /auth/me fails with a network error (API down)', async () => {
  useSession.getState().setTokens({ accessToken: 'tok', refreshToken: 'r' });
  server.use(http.get(`${API}/auth/me`, () => HttpResponse.error()));

  renderHook(() => useHydrateSession());

  await waitFor(() => expect(useSession.getState().status).toBe('authenticated'));
  // A transient outage must NOT log the user out — token preserved, user unset.
  expect(useSession.getState().accessToken).toBe('tok');
  expect(useSession.getState().user).toBeNull();
});

// Role gates depend on the hydrated user: a single transient failure must not
// leave `user` null for the whole session (which reads as "forbidden" everywhere).
it('retries after a transient failure and hydrates the user when the API recovers', async () => {
  useSession.getState().setTokens({ accessToken: 'tok', refreshToken: 'r' });
  let calls = 0;
  server.use(http.get(`${API}/auth/me`, () => {
    calls += 1;
    if (calls === 1) return HttpResponse.error();
    return HttpResponse.json({ id: 'u1', email: 'a@b.c', role: 'ADMIN' });
  }));

  renderHook(() => useHydrateSession());

  await waitFor(() => expect(useSession.getState().user?.role).toBe('ADMIN'), { timeout: 10_000 });
  expect(calls).toBeGreaterThanOrEqual(2);
}, 15_000);

it('clears the session when /auth/me is genuinely rejected (401)', async () => {
  useSession.getState().setTokens({ accessToken: 'tok', refreshToken: 'r' });
  // /auth/me 401 → apiFetch attempts refresh → refresh also 401 → real logout.
  server.use(
    http.get(`${API}/auth/me`, () =>
      HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
    ),
    http.post(`${API}/auth/refresh`, () =>
      HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
    ),
  );

  renderHook(() => useHydrateSession());

  await waitFor(() => expect(useSession.getState().accessToken).toBeNull());
  expect(useSession.getState().status).toBe('anonymous');
});

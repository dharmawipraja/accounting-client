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

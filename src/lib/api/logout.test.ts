import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { logoutCurrentDevice, logoutAllDevices } from './logout';

afterEach(() => useSession.getState().clear());

it('logoutCurrentDevice POSTs /auth/logout with the refresh token', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'ref-xyz' });
  let received: unknown = null;
  server.use(
    http.post(`${API}/auth/logout`, async ({ request }) => {
      received = await request.json();
      return HttpResponse.json({ ok: true });
    }),
  );
  await logoutCurrentDevice();
  expect(received).toEqual({ refreshToken: 'ref-xyz' });
});

it('logoutCurrentDevice is a no-op when there is no refresh token', async () => {
  let called = false;
  server.use(
    http.post(`${API}/auth/logout`, () => {
      called = true;
      return HttpResponse.json({ ok: true });
    }),
  );
  await logoutCurrentDevice();
  expect(called).toBe(false);
});

it('logoutCurrentDevice swallows server errors (never throws)', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'ref' });
  server.use(http.post(`${API}/auth/logout`, () => HttpResponse.json({}, { status: 500 })));
  await expect(logoutCurrentDevice()).resolves.toBeUndefined();
});

it('logoutCurrentDevice swallows network errors (never throws)', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'ref' });
  server.use(http.post(`${API}/auth/logout`, () => HttpResponse.error()));
  await expect(logoutCurrentDevice()).resolves.toBeUndefined();
});

it('logoutAllDevices POSTs /auth/logout-all with the bearer token', async () => {
  useSession.getState().setTokens({ accessToken: 'tok-1', refreshToken: 'r' });
  let auth: string | null = null;
  server.use(
    http.post(`${API}/auth/logout-all`, ({ request }) => {
      auth = request.headers.get('Authorization');
      return HttpResponse.json({ ok: true });
    }),
  );
  await logoutAllDevices();
  expect(auth).toBe('Bearer tok-1');
});

it('logoutAllDevices swallows server errors (never throws)', async () => {
  useSession.getState().setTokens({ accessToken: 'tok-1', refreshToken: 'r' });
  server.use(http.post(`${API}/auth/logout-all`, () => HttpResponse.json({}, { status: 500 })));
  await expect(logoutAllDevices()).resolves.toBeUndefined();
});

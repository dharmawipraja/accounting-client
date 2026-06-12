import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { apiFetch } from './client';

afterEach(() => { useSession.getState().clear(); vi.restoreAllMocks(); });

describe('401 refresh', () => {
  it('refreshes once on 401, then retries and succeeds', async () => {
    useSession.getState().setTokens({ accessToken: 'expired', refreshToken: 'r-good' });
    let refreshCalls = 0;
    server.use(
      http.get(`${API}/secure`, ({ request }) => {
        const tok = request.headers.get('Authorization');
        return tok === 'Bearer fresh'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 });
      }),
      http.post(`${API}/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json({ accessToken: 'fresh', refreshToken: 'r-good-2' });
      }),
    );
    const data = await apiFetch<{ ok: boolean }>('/secure');
    expect(data.ok).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(useSession.getState().accessToken).toBe('fresh');
  });

  it('shares a single refresh across concurrent 401s', async () => {
    useSession.getState().setTokens({ accessToken: 'expired', refreshToken: 'r-good' });
    let refreshCalls = 0;
    server.use(
      http.get(`${API}/a`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer fresh'
          ? HttpResponse.json({ r: 'a' })
          : HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
      ),
      http.get(`${API}/b`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer fresh'
          ? HttpResponse.json({ r: 'b' })
          : HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
      ),
      http.post(`${API}/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json({ accessToken: 'fresh', refreshToken: 'r2' });
      }),
    );
    const [a, b] = await Promise.all([
      apiFetch<{ r: string }>('/a'),
      apiFetch<{ r: string }>('/b'),
    ]);
    expect([a.r, b.r].sort()).toEqual(['a', 'b']);
    expect(refreshCalls).toBe(1);
  });

  it('clears the session when refresh fails', async () => {
    useSession.getState().setTokens({ accessToken: 'expired', refreshToken: 'r-bad' });
    server.use(
      http.get(`${API}/secure`, () =>
        HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
      ),
      http.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ code: 'UNAUTHORIZED', message: 'expired' }, { status: 401 }),
      ),
    );
    await expect(apiFetch('/secure')).rejects.toMatchObject({ status: 401 });
    expect(useSession.getState().status).toBe('anonymous');
    expect(useSession.getState().accessToken).toBeNull();
  });
});

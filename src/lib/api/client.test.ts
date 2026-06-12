import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { apiFetch } from './client';
import { ApiError } from './errors';

describe('apiFetch', () => {
  it('parses a bare array response', async () => {
    server.use(http.get(`${API}/partners`, () => HttpResponse.json([{ id: '1' }])));
    const data = await apiFetch<{ id: string }[]>('/partners', { auth: false });
    expect(data).toEqual([{ id: '1' }]);
  });

  it('throws a typed ApiError carrying code, status, and traceId', async () => {
    server.use(
      http.get(`${API}/boom`, () =>
        HttpResponse.json(
          { code: 'UNBALANCED_ENTRY', message: 'debits != credits' },
          { status: 422, headers: { 'X-Request-Id': 'trace-xyz' } },
        ),
      ),
    );
    await expect(apiFetch('/boom', { auth: false })).rejects.toMatchObject({
      status: 422,
      code: 'UNBALANCED_ENTRY',
      traceId: 'trace-xyz',
    });
    await expect(apiFetch('/boom', { auth: false })).rejects.toBeInstanceOf(ApiError);
  });

  it('attaches the bearer token from the session store', async () => {
    useSession.getState().setTokens({ accessToken: 'tok-9', refreshToken: 'r' });
    let seen: string | null = null;
    server.use(
      http.get(`${API}/whoami`, ({ request }) => {
        seen = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiFetch('/whoami');
    expect(seen).toBe('Bearer tok-9');
  });

  it('sets the Idempotency-Key header when provided', async () => {
    let key: string | null = null;
    server.use(
      http.post(`${API}/x/post`, ({ request }) => {
        key = request.headers.get('Idempotency-Key');
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiFetch('/x/post', { method: 'POST', idempotencyKey: 'idem-1', auth: false });
    expect(key).toBe('idem-1');
  });
});

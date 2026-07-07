import { delay, http, HttpResponse } from 'msw';
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

  // A hung backend must not leave the UI on an infinite spinner / disabled Save:
  // the request aborts and surfaces as a retryable offline-class ApiError.
  it('times out a hung request with a status-0 TIMEOUT ApiError', async () => {
    server.use(http.get(`${API}/slow`, async () => { await delay(2_000); return HttpResponse.json({ ok: true }); }));
    await expect(apiFetch('/slow', { auth: false, timeoutMs: 50 })).rejects.toMatchObject({
      status: 0,
      code: 'TIMEOUT',
    });
  });

  // The guide requires one key per LOGICAL request: a manual retry after a failure
  // (lost response, 5xx) must replay the same key so the server can dedupe, and a
  // key is only retired once the request has actually succeeded.
  it('reuses the same auto key when an identical POST is retried after a failure', async () => {
    const keys: (string | null)[] = [];
    let calls = 0;
    server.use(
      http.post(`${API}/docs`, ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        calls += 1;
        if (calls === 1) return HttpResponse.json({ code: 'BOOM' }, { status: 500 });
        return HttpResponse.json({ ok: true });
      }),
    );
    await expect(apiFetch('/docs', { method: 'POST', body: { a: 1 }, auth: false })).rejects.toBeInstanceOf(ApiError);
    await apiFetch('/docs', { method: 'POST', body: { a: 1 }, auth: false });
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it('mints a fresh auto key once the previous identical POST succeeded', async () => {
    const keys: (string | null)[] = [];
    server.use(
      http.post(`${API}/docs`, ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiFetch('/docs', { method: 'POST', body: { a: 1 }, auth: false });
    await apiFetch('/docs', { method: 'POST', body: { a: 1 }, auth: false });
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).not.toBe(keys[0]);
  });

  it('uses distinct auto keys for different POST bodies', async () => {
    const keys: (string | null)[] = [];
    let calls = 0;
    server.use(
      http.post(`${API}/docs`, ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        calls += 1;
        return HttpResponse.json({ code: 'BOOM' }, { status: 500 });
      }),
    );
    await expect(apiFetch('/docs', { method: 'POST', body: { a: 1 }, auth: false })).rejects.toBeInstanceOf(ApiError);
    await expect(apiFetch('/docs', { method: 'POST', body: { a: 2 }, auth: false })).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(2);
    expect(keys[1]).not.toBe(keys[0]);
  });

  // /tax/calculate and /journal-entries/preview are read-only dry runs the spec
  // does NOT cover with idempotency. They fire on every debounced keystroke and
  // often fail by design (422 unbalanced, 409 closed period) — auto-keying them
  // would fill the pending-key cache and could evict a genuinely pending create
  // key, which is the duplicate-write scenario the cache exists to prevent.
  it('does not auto-assign an Idempotency-Key to the read-only preview endpoints', async () => {
    const keys: Record<string, string | null> = {};
    server.use(
      http.post(`${API}/tax/calculate`, ({ request }) => {
        keys.tax = request.headers.get('Idempotency-Key');
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${API}/journal-entries/preview`, ({ request }) => {
        keys.preview = request.headers.get('Idempotency-Key');
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiFetch('/tax/calculate', { method: 'POST', body: { a: 1 }, auth: false });
    await apiFetch('/journal-entries/preview', { method: 'POST', body: { a: 1 }, auth: false });
    expect(keys.tax).toBeNull();
    expect(keys.preview).toBeNull();
  });

  it('discards pending auto keys when the session is cleared', async () => {
    const keys: (string | null)[] = [];
    server.use(
      http.post(`${API}/docs`, ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return HttpResponse.json({ code: 'BOOM' }, { status: 500 });
      }),
    );
    useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
    await expect(apiFetch('/docs', { method: 'POST', body: { a: 1 } })).rejects.toBeInstanceOf(ApiError);
    useSession.getState().clear();
    useSession.getState().setTokens({ accessToken: 'a2', refreshToken: 'b2' });
    await expect(apiFetch('/docs', { method: 'POST', body: { a: 1 } })).rejects.toBeInstanceOf(ApiError);
    expect(keys[1]).not.toBe(keys[0]);
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

  it('flips mustChangePassword when a call returns 403 PASSWORD_CHANGE_REQUIRED', async () => {
    useSession.getState().setTokens({ accessToken: 'tok', refreshToken: 'r' });
    useSession.getState().setUser({ id: 'u1', email: 'a@b.c', role: 'VIEWER', mustChangePassword: false });
    server.use(
      http.get(`${API}/partners`, () =>
        HttpResponse.json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'x' }, { status: 403 }),
      ),
    );
    await expect(apiFetch('/partners')).rejects.toThrow();
    expect(useSession.getState().user?.mustChangePassword).toBe(true);
  });
});

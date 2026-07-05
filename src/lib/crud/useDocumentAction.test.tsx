import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useDocumentAction } from './useDocumentAction';
import { createResourceKeys } from './createResourceHooks';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('POSTs to /:id/:action with an Idempotency-Key header', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let seenKey: string | null = null;
  let hitPath = '';
  server.use(
    http.post(`${API}/widgets/7/post`, ({ request }) => {
      seenKey = request.headers.get('Idempotency-Key');
      hitPath = '/widgets/7/post';
      return HttpResponse.json({ ok: true });
    }),
  );
  const { result } = renderHook(() => useDocumentAction({ keys: createResourceKeys('widgets'), basePath: '/widgets', action: 'post' }), { wrapper });
  await result.current.mutateAsync({ id: '7', idempotencyKey: 'key-123' });
  await waitFor(() => expect(hitPath).toBe('/widgets/7/post'));
  expect(seenKey).toBe('key-123');
});

// When no explicit key is passed, apiFetch's auto key (stable per path until
// success) must still reach the wire — actions stay idempotent across retries.
it('sends an auto Idempotency-Key when none is passed', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let seenKey: string | null = null;
  server.use(
    http.post(`${API}/widgets/9/post`, ({ request }) => {
      seenKey = request.headers.get('Idempotency-Key');
      return HttpResponse.json({ ok: true });
    }),
  );
  const { result } = renderHook(() => useDocumentAction({ keys: createResourceKeys('widgets'), basePath: '/widgets', action: 'post' }), { wrapper });
  await result.current.mutateAsync({ id: '9' });
  expect(seenKey).toBeTruthy();
});

// Posting/voiding a payment changes the target invoice/bill server-side
// (outstanding, paymentStatus); the action must also invalidate those caches.
it('invalidates alsoInvalidate keys on success', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(http.post(`${API}/widgets/7/post`, () => HttpResponse.json({ ok: true })));
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidated: unknown[] = [];
  const original = qc.invalidateQueries.bind(qc);
  qc.invalidateQueries = ((filters: { queryKey?: unknown }, ...rest: never[]) => {
    invalidated.push(filters?.queryKey);
    return original(filters as never, ...rest);
  }) as typeof qc.invalidateQueries;
  const qcWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () =>
      useDocumentAction({
        keys: createResourceKeys('widgets'),
        basePath: '/widgets',
        action: 'post',
        alsoInvalidate: [['salesInvoices'], ['purchaseBills']],
      }),
    { wrapper: qcWrapper },
  );
  await result.current.mutateAsync({ id: '7', idempotencyKey: 'key-123' });
  await waitFor(() => {
    expect(invalidated).toContainEqual(['widgets']);
    expect(invalidated).toContainEqual(['salesInvoices']);
    expect(invalidated).toContainEqual(['purchaseBills']);
  });
});

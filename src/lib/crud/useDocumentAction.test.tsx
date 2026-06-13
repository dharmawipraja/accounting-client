import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useDocumentAction } from './useDocumentAction';

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
  const { result } = renderHook(() => useDocumentAction({ key: 'widgets', basePath: '/widgets', action: 'post' }), { wrapper });
  await result.current.mutateAsync({ id: '7', idempotencyKey: 'key-123' });
  await waitFor(() => expect(hitPath).toBe('/widgets/7/post'));
  expect(seenKey).toBe('key-123');
});

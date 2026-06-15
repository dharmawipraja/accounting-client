import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useGeneratePeriods, useClosePeriod, useRunYearEnd } from './mutations';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('useGeneratePeriods POSTs the fiscal year', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let body: unknown = null;
  server.use(http.post(`${API}/ledger/periods/generate`, async ({ request }) => { body = await request.json(); return HttpResponse.json({}); }));
  const { result } = renderHook(() => useGeneratePeriods(), { wrapper });
  result.current.mutate({ fiscalYear: 2026, idempotencyKey: 'k1' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(body).toMatchObject({ fiscalYear: 2026 });
});

it('useClosePeriod POSTs /ledger/periods/:id/close', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let path: string | null = null;
  server.use(http.post(`${API}/ledger/periods/:id/close`, ({ params }) => { path = `close:${params.id}`; return HttpResponse.json({}); }));
  const { result } = renderHook(() => useClosePeriod(), { wrapper });
  result.current.mutate({ id: 'period-2026-1', idempotencyKey: 'k2' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(path).toBe('close:period-2026-1');
});

it('useRunYearEnd POSTs /close/year-end with the fiscal year', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let body: unknown = null;
  server.use(http.post(`${API}/close/year-end`, async ({ request }) => { body = await request.json(); return HttpResponse.json({}); }));
  const { result } = renderHook(() => useRunYearEnd(), { wrapper });
  result.current.mutate({ fiscalYear: 2026, idempotencyKey: 'k3' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(body).toMatchObject({ fiscalYear: 2026 });
});

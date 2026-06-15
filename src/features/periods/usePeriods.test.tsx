import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { usePeriods, useYearEndStatus } from './usePeriods';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('usePeriods lists the fiscal year periods', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  const { result } = renderHook(() => usePeriods(2026), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(12);
  expect(result.current.data?.[0].sequence).toBe(1);
});

it('useYearEndStatus maps a 404 to null (not closed)', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  const { result } = renderHook(() => useYearEndStatus(2026), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
});

it('useYearEndStatus returns the status on 200', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(http.get(`${API}/close/year-end/:fy`, ({ params }) =>
    HttpResponse.json({ fiscalYear: Number(params.fy), status: 'CLOSED', closedAt: '2026-12-31T00:00:00Z' })));
  const { result } = renderHook(() => useYearEndStatus(2026), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.status).toBe('CLOSED');
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useReport } from './useReport';
import { balanceSheetReportSchema } from './schema';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('fetches a report with params and parses it', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let seenAsOf: string | null = null;
  server.use(http.get(`${API}/reports/balance-sheet`, ({ request }) => {
    seenAsOf = new URL(request.url).searchParams.get('asOf');
    return HttpResponse.json({ asOf: seenAsOf, assets: { groups: [], total: '0.0000' }, liabilities: { groups: [], total: '0.0000' }, equity: { groups: [], total: '0.0000' }, totalAssets: '0.0000', totalLiabilities: '0.0000', totalEquity: '0.0000', balanced: true });
  }));
  const { result } = renderHook(() => useReport('/reports/balance-sheet', { asOf: '2026-06-30' }, balanceSheetReportSchema), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(seenAsOf).toBe('2026-06-30');
  expect(result.current.data?.balanced).toBe(true);
});

it('does not fetch when enabled is false', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let called = false;
  server.use(http.get(`${API}/reports/balance-sheet`, () => { called = true; return HttpResponse.json({}); }));
  renderHook(() => useReport('/reports/balance-sheet', { asOf: 'x' }, balanceSheetReportSchema, false), { wrapper });
  await new Promise((r) => setTimeout(r, 200));
  expect(called).toBe(false);
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useClosedPeriodPreview } from './useClosedPeriodPreview';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const args = (date: string) => ({
  nature: 'SALE' as const,
  settlementAccountId: 'ar',
  lines: [{ accountId: 'rev', amount: '100000', taxCodeIds: [] }],
  date,
});

// The journal-entry preview reproduces the 409 a real post would give for a
// closed period, so the editor can warn before post time.
it('flags a closed-period date via the preview 409', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(http.post(`${API}/journal-entries/preview`, () =>
    HttpResponse.json({ code: 'CLOSED_PERIOD', message: 'closed' }, { status: 409 }),
  ));
  const { result } = renderHook(() => useClosedPeriodPreview(args('2020-01-15')), { wrapper });
  await waitFor(() => expect(result.current).toEqual({ closed: true, kind: 'period' }), { timeout: 2_000 });
});

it('flags a closed fiscal year', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(http.post(`${API}/journal-entries/preview`, () =>
    HttpResponse.json({ code: 'CLOSED_YEAR', message: 'closed' }, { status: 409 }),
  ));
  const { result } = renderHook(() => useClosedPeriodPreview(args('2020-01-15')), { wrapper });
  await waitFor(() => expect(result.current).toEqual({ closed: true, kind: 'year' }), { timeout: 2_000 });
});

it('reports not-closed for an open-period date', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(http.post(`${API}/journal-entries/preview`, () =>
    HttpResponse.json({ lines: [], totalDebit: '0.0000', totalCredit: '0.0000', balanced: true }),
  ));
  const { result } = renderHook(() => useClosedPeriodPreview(args('2026-06-16')), { wrapper });
  // give the debounce + request time to settle
  await new Promise((r) => setTimeout(r, 700));
  expect(result.current.closed).toBe(false);
});

it('does not fetch until date + settlement + a complete line all exist', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let hit = false;
  server.use(http.post(`${API}/journal-entries/preview`, () => { hit = true; return HttpResponse.json({ lines: [] }); }));
  renderHook(() => useClosedPeriodPreview({ nature: 'SALE', settlementAccountId: undefined, lines: [], date: '' }), { wrapper });
  await new Promise((r) => setTimeout(r, 600));
  expect(hit).toBe(false);
});

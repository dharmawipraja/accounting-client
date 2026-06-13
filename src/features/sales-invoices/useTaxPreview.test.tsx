import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useTaxPreview } from './useTaxPreview';

afterEach(() => { useSession.getState().clear(); vi.useRealTimers(); });

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('does not call when there are no complete lines', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let called = false;
  server.use(http.post(`${API}/tax/calculate`, () => { called = true; return HttpResponse.json({}); }));
  renderHook(() => useTaxPreview({ nature: 'SALE', settlementAccountId: 'ar', lines: [] }), { wrapper });
  await new Promise((r) => setTimeout(r, 500));
  expect(called).toBe(false);
});

it('posts /tax/calculate and returns parsed totals for complete lines', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(http.post(`${API}/tax/calculate`, () => HttpResponse.json({
    subtotal: '1000000.0000',
    taxes: [{ taxCodeId: 't1', code: 'PPN-OUT-11', kind: 'PPN_OUTPUT', base: '1000000.0000', amount: '110000.0000', accountId: 'x' }],
    settlementAmount: '1110000.0000',
    journalLines: [],
  })));
  const { result } = renderHook(
    () => useTaxPreview({ nature: 'SALE', settlementAccountId: 'ar', lines: [{ accountId: 'rev', amount: '1000000.0000', taxCodeIds: ['t1'] }] }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.data?.settlementAmount).toBe('1110000.0000'), { timeout: 2000 });
  expect(result.current.data?.taxes[0].kind).toBe('PPN_OUTPUT');
});

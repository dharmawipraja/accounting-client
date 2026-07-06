import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useAccountBalance } from './hooks';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// GET /ledger/accounts/{id}/balance?asOf= — point-in-time balance for a drill-down.
it('sends asOf and returns the signed balance', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let seenAsOf: string | null = null;
  server.use(http.get(`${API}/ledger/accounts/acc-1/balance`, ({ request }) => {
    seenAsOf = new URL(request.url).searchParams.get('asOf');
    return HttpResponse.json({ accountId: 'acc-1', debit: '5000000.0000', credit: '1000000.0000', balance: '4000000.0000' });
  }));
  const { result } = renderHook(() => useAccountBalance('acc-1', '2026-06-30'), { wrapper });
  await waitFor(() => expect(result.current.data?.balance).toBe('4000000.0000'));
  expect(seenAsOf).toBe('2026-06-30');
});

it('does not fetch without an account id', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let hit = false;
  server.use(http.get(`${API}/ledger/accounts/:id/balance`, () => { hit = true; return HttpResponse.json({}); }));
  renderHook(() => useAccountBalance('', '2026-06-30'), { wrapper });
  await new Promise((r) => setTimeout(r, 50));
  expect(hit).toBe(false);
});

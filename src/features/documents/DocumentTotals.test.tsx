import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { DocumentTotals } from './DocumentTotals';

afterEach(() => useSession.getState().clear());

function renderTotals(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('shows subtotal, PPN, PPh, and total from the tax preview', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(http.post(`${API}/tax/calculate`, () => HttpResponse.json({
    subtotal: '1000000.0000',
    taxes: [
      { taxCodeId: 't1', code: 'PPN-OUT-11', kind: 'PPN_OUTPUT', base: '1000000.0000', amount: '110000.0000', accountId: 'x' },
      { taxCodeId: 't2', code: 'PPH23-PRE', kind: 'PPH_PREPAID', base: '1000000.0000', amount: '20000.0000', accountId: 'y' },
    ],
    settlementAmount: '1090000.0000',
    journalLines: [],
  })));
  renderTotals(<DocumentTotals nature="SALE" settlementAccountId="ar" lines={[{ accountId: 'rev', amount: '1000000.0000', taxCodeIds: ['t1', 't2'] }]} />);
  expect(await screen.findByText(/Rp\s?1\.090\.000/)).toBeInTheDocument(); // total (settlementAmount)
  expect(screen.getByText(/Rp\s?110\.000/)).toBeInTheDocument(); // PPN
  expect(screen.getByText(/Rp\s?20\.000/)).toBeInTheDocument();  // PPh
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { inRouter } from '@/test/utils';
import { useSession } from '@/stores/session';
import { AccountLedgerPage } from './AccountLedgerPage';

afterEach(() => useSession.getState().clear());

function renderPage(id: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{inRouter(<AccountLedgerPage id={id} />)}</QueryClientProvider>);
}

it('shows the account header, its point-in-time balance, and its ledger movement', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(
    http.get(`${API}/ledger/accounts/acc-kas`, () =>
      HttpResponse.json({ id: 'acc-kas', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null })),
    http.get(`${API}/ledger/accounts/acc-kas/balance`, () =>
      HttpResponse.json({ accountId: 'acc-kas', debit: '5000000.0000', credit: '1000000.0000', balance: '4000000.0000' })),
    http.get(`${API}/reports/general-ledger`, () =>
      HttpResponse.json({
        account: { id: 'acc-kas', code: '1-1000', name: 'Kas', normalBalance: 'DEBIT' },
        from: '2026-01-01', to: '2026-07-06', openingBalance: '0.0000',
        lines: [{ date: '2026-03-01', entryRef: 'JE/2026/000004', description: 'Setoran modal', debit: '1000000.0000', credit: '0.0000', runningBalance: '1000000.0000' }],
        closingBalance: '4000000.0000', truncated: false,
      })),
  );
  renderPage('acc-kas');
  // account header (code · name)
  expect(await screen.findByRole('heading', { name: /1-1000 · Kas/ })).toBeInTheDocument();
  // point-in-time balance (also equals the GL closing balance here) + ledger movement
  expect((await screen.findAllByText('Rp 4.000.000')).length).toBeGreaterThanOrEqual(1);
  expect(await screen.findByText('JE/2026/000004')).toBeInTheDocument();
});

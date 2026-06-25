import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { TaxCodesPage } from './TaxCodesPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><TaxCodesPage /></QueryClientProvider>);
}

it('renders rate as a percent and the joined account name', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged([
      { id: 'a1', code: '2-1100', name: 'PPN Keluaran', type: 'LIABILITY', subtype: 'TAX_PAYABLE', normalBalance: 'CREDIT', isPostable: true, isActive: true, parentId: null },
    ]))),
    http.get(`${API}/tax/codes`, () => HttpResponse.json(paged([
      { id: 't1', code: 'PPN-OUT', name: 'PPN Keluaran 11%', kind: 'PPN_OUTPUT', rate: '0.11', taxAccountId: 'a1', isActive: true },
    ]))),
  );
  renderPage();
  expect(await screen.findByText('PPN-OUT')).toBeInTheDocument();
  expect(screen.getByText('11%')).toBeInTheDocument();
  expect(screen.getByText(/2-1100.*PPN Keluaran/)).toBeInTheDocument();
});

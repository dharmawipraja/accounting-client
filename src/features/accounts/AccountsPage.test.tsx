import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { AccountsPage } from './AccountsPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}><AccountsPage /></QueryClientProvider>);
}

it('lists accounts grouped by type', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  renderPage();
  expect(await screen.findByText('Kas')).toBeInTheDocument();
  expect(screen.getByText('Pendapatan Penjualan')).toBeInTheDocument();
  // type group headers — query <h2> headings to avoid ambiguity with account names
  expect(screen.getByRole('heading', { name: /aset/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /pendapatan/i })).toBeInTheDocument();
});

it('shows the New button for ACCOUNTANT', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  renderPage();
  await screen.findByText('Kas');
  expect(screen.getByRole('button', { name: /baru/i })).toBeInTheDocument();
});

it('hides the New button for VIEWER', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  renderPage();
  await screen.findByText('Kas');
  expect(screen.queryByRole('button', { name: /baru/i })).not.toBeInTheDocument();
});

it('paginates accounts server-side', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  const many = Array.from({ length: 25 }, (_, i) => ({
    id: `a${i}`, code: `1-${1000 + i}`, name: `Akun ${i}`, type: 'ASSET',
    subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', cashFlowCategory: 'OPERATING',
    isPostable: true, isActive: true, parentId: null,
  }));
  server.use(
    http.get(`${API}/ledger/accounts`, ({ request }) => {
      const u = new URL(request.url).searchParams;
      return HttpResponse.json(paged(many, Number(u.get('limit') ?? 20), Number(u.get('offset') ?? 0)));
    }),
  );
  renderPage();

  expect(await screen.findByText('Akun 0')).toBeInTheDocument();
  expect(screen.queryByText('Akun 20')).not.toBeInTheDocument();
  expect(screen.getByText(/1.*20.*25/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /berikutnya/i }));
  expect(await screen.findByText('Akun 20')).toBeInTheDocument();
});

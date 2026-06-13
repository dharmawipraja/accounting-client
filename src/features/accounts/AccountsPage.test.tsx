import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
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

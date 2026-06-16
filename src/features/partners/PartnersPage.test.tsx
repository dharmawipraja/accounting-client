import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { PartnersPage } from './PartnersPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><PartnersPage /></QueryClientProvider>);
}

it('lists partners with type badges', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  renderPage();
  expect(await screen.findByText('PT Pelanggan Jaya')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /baru/i })).toBeInTheDocument();
});

it('shows an empty state and no New button for VIEWER', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(http.get(`${API}/partners`, () => HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 })));
  renderPage();
  expect(await screen.findByText(/tidak ada data/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /baru/i })).not.toBeInTheDocument();
});

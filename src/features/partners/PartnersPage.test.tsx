import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API, partnerFixtures } from '@/test/handlers';
import { server } from '@/test/server';
import { inRouter } from '@/test/utils';
import { useSession } from '@/stores/session';
import { PartnersPage } from './PartnersPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{inRouter(<PartnersPage />)}</QueryClientProvider>);
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
  expect(await screen.findByText(/belum ada data/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /baru/i })).not.toBeInTheDocument();
});

it('paginates: shows the count and advances offset on Berikutnya', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  const base = partnerFixtures()[0]; // guarantees a partnerSchema-valid shape
  const many = Array.from({ length: 25 }, (_, i) => ({ ...base, id: `p${i}`, code: `C${i}`, name: `Partner ${i}` }));
  let seenOffset: string | null = null;
  server.use(http.get(`${API}/partners`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    seenOffset = u.get('offset');
    const limit = Number(u.get('limit') ?? '20');
    const offset = Number(u.get('offset') ?? '0');
    return HttpResponse.json({ data: many.slice(offset, offset + limit), total: many.length, limit, offset });
  }));
  const { default: userEvent } = await import('@testing-library/user-event');
  renderPage();
  expect(await screen.findByText('Partner 0')).toBeInTheDocument();
  expect(screen.getByText(/Menampilkan 1.*25/)).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('button', { name: /berikutnya/i }));
  await waitFor(() => expect(seenOffset).toBe('20'));
});

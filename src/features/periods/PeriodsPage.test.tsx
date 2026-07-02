import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { API, periodFixtures } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { id as messages } from '@/lib/i18n/messages.id';
import { PeriodsPage } from './PeriodsPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
afterEach(() => useSession.getState().clear());

function renderPage(role: 'ADMIN' | 'APPROVER' | 'VIEWER' = 'ADMIN') {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}><PeriodsPage /></QueryClientProvider>);
}

const thisYear = new Date().getFullYear();

it('renders the periods with month labels + status; the stepper changes the fiscal year', async () => {
  let seenFy: string | null = null;
  server.use(http.get(`${API}/ledger/periods`, ({ request }) => {
    seenFy = new URL(request.url).searchParams.get('fiscalYear');
    return HttpResponse.json(periodFixtures(Number(seenFy)));
  }));
  renderPage();
  expect(await screen.findByText('Januari')).toBeInTheDocument();
  expect(screen.getAllByText('Terbuka').length).toBeGreaterThan(0);
  await waitFor(() => expect(seenFy).toBe(String(thisYear)));
  await userEvent.setup().click(screen.getByRole('button', { name: 'Tahun sebelumnya' }));
  await waitFor(() => expect(seenFy).toBe(String(thisYear - 1)));
});

it('ADMIN closes an open period (confirm → POST close)', async () => {
  let closedId: string | null = null;
  server.use(
    http.get(`${API}/ledger/periods`, () => HttpResponse.json(periodFixtures(2026))),
    http.post(`${API}/ledger/periods/:id/close`, ({ params }) => { closedId = String(params.id); return HttpResponse.json({ id: params.id, status: 'CLOSED' }); }),
  );
  renderPage();
  await screen.findByText('Januari');
  const user = userEvent.setup();
  await user.click(screen.getAllByRole('button', { name: 'Tutup' })[0]);
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Tutup' }));
  await waitFor(() => expect(closedId).toBe('period-2026-1'));
});

it('year-end panel: not closed shows the run action; ADMIN runs it', async () => {
  let ranFor: unknown = null;
  server.use(
    http.get(`${API}/ledger/periods`, () => HttpResponse.json(periodFixtures(2026))),
    http.get(`${API}/close/year-end/:fy`, () => HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 })),
    http.post(`${API}/close/year-end`, async ({ request }) => { ranFor = await request.json(); return HttpResponse.json({ status: 'CLOSED' }); }),
  );
  renderPage();
  expect(await screen.findByText('Belum ditutup')).toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Tutup Buku Akhir Tahun' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Tutup Buku Akhir Tahun' }));
  await waitFor(() => expect(ranFor).toMatchObject({ fiscalYear: thisYear }));
});

it('surfaces a domain error toast when a period close fails (previously silent)', async () => {
  server.use(
    http.get(`${API}/ledger/periods`, () => HttpResponse.json(periodFixtures(2026))),
    http.post(`${API}/ledger/periods/:id/close`, () => HttpResponse.json({ code: 'SEGREGATION_OF_DUTIES', message: 'x' }, { status: 403 })),
  );
  renderPage();
  await screen.findByText('Januari');
  const user = userEvent.setup();
  await user.click(screen.getAllByRole('button', { name: 'Tutup' })[0]);
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Tutup' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(messages.roles.segregationOfDuties));
});

it('VIEWER sees no action buttons', async () => {
  server.use(http.get(`${API}/ledger/periods`, () => HttpResponse.json(periodFixtures(2026))));
  renderPage('VIEWER');
  await screen.findByText('Januari');
  expect(screen.queryByRole('button', { name: 'Tutup' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Tutup Buku Akhir Tahun' })).not.toBeInTheDocument();
});

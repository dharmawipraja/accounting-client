import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { startOfMonth } from 'date-fns';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { toApiDate } from '@/lib/format/date';
import { useSession } from '@/stores/session';
import { usePreferences } from '@/stores/preferences';
import { DashboardPage } from './DashboardPage';
import { computePeriod } from './period';

afterEach(() => {
  useSession.getState().clear();
  usePreferences.setState({ dashboardPeriod: computePeriod('year', new Date()) });
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute();
  const index = createRoute({ getParentRoute: () => root, path: '/', component: () => <DashboardPage /> });
  const journals = createRoute({
    getParentRoute: () => root,
    path: '/journals',
    validateSearch: (s: Record<string, unknown>): { status?: 'DRAFT' | 'POSTED' } => ({
      status: s.status === 'DRAFT' || s.status === 'POSTED' ? s.status : undefined,
    }),
    component: () => null,
  });
  const router = createRouter({ routeTree: root.addChildren([index, journals]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  return render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
}

it('renders the financial-position hero and the secondary metric cards', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  renderPage();
  expect(await screen.findByText('Posisi Keuangan')).toBeInTheDocument(); // hero label
  expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument(); // totalAssets (hero)
  expect(screen.getByText('Rp 1.750.000')).toBeInTheDocument(); // netIncome (grid)
  expect(screen.getByText('Rp 1.234.000')).toBeInTheDocument(); // kasAkhir (grid)
  expect(screen.getByText('3')).toBeInTheDocument(); // draft count (grid)
});

it('refetches the period cards with the new range when a preset is clicked', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let lastFrom: string | null = null;
  server.use(
    http.get(`${API}/reports/income-statement`, ({ request }) => {
      lastFrom = new URL(request.url).searchParams.get('from');
      return HttpResponse.json({ from: lastFrom, to: '2026-06-30', revenue: '2000000.0000', netIncome: '1750000.0000' });
    }),
  );
  renderPage();
  await screen.findByText('Rp 1.750.000');
  // The default load uses the year preset (from = 1 Jan), which also ends in "-01".
  // Assert against the actual current month start so the click is what's verified.
  const expectedFrom = toApiDate(startOfMonth(new Date()));
  await user.click(screen.getByRole('button', { name: 'Bulan Ini' }));
  await waitFor(() => expect(lastFrom).toBe(expectedFrom));
});

it('shows an error + retry when cash-flow fails, leaving other cards intact', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let calls = 0;
  server.use(
    http.get(`${API}/reports/cash-flow`, () => {
      calls += 1;
      return calls === 1
        ? HttpResponse.json({ code: 'INTERNAL', message: 'boom' }, { status: 500 })
        : HttpResponse.json({ from: '2026-01-01', to: '2026-06-13', netChange: '750000.0000', kasAkhir: '1234000.0000' });
    }),
  );
  renderPage();
  expect(await screen.findByText(/gagal memuat/i)).toBeInTheDocument(); // Kas Akhir errored
  expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument(); // totalAssets unaffected
  await user.click(screen.getByRole('button', { name: /coba lagi/i }));
  expect(await screen.findByText('Rp 1.234.000')).toBeInTheDocument(); // Kas Akhir after retry
});

it('disables the period queries and shows a hint when the custom range is invalid', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  const seenFrom: string[] = [];
  server.use(
    http.get(`${API}/reports/income-statement`, ({ request }) => {
      const from = new URL(request.url).searchParams.get('from') ?? '';
      seenFrom.push(from);
      return HttpResponse.json({ from, to: '2026-06-30', revenue: '2000000.0000', netIncome: '1750000.0000' });
    }),
  );
  renderPage();
  await screen.findByText('Rp 1.750.000'); // initial (valid) load fired
  await user.click(screen.getByRole('button', { name: 'Kustom' }));
  // 'Dari' after the current 'Sampai' (today) makes the range invalid.
  fireEvent.change(screen.getByLabelText('Dari'), { target: { value: '2026-12-01' } });
  expect(await screen.findByText(/harus sebelum/i)).toBeInTheDocument();
  // The disabled query must never have requested the invalid 'from'.
  expect(seenFrom).not.toContain('2026-12-01');
});

it('the Jurnal Draft card links to /journals filtered to DRAFT', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  renderPage();
  const draftValue = await screen.findByText('3'); // draft count
  const link = draftValue.closest('a');
  expect(link).not.toBeNull();
  expect(link?.getAttribute('href')).toContain('/journals');
  expect(link?.getAttribute('href')).toContain('status=DRAFT');
});

it('persists the selected period preset to buku.prefs', async () => {
  const user = userEvent.setup();
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  renderPage();
  await screen.findByText('Rp 1.500.000'); // initial (year) load settled
  await user.click(screen.getByRole('button', { name: 'Bulan Ini' })); // "This month"
  await waitFor(() => expect(localStorage.getItem('buku.prefs')).toContain('"preset":"month"'));
});

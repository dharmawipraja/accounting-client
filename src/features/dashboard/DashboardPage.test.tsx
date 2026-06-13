import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { startOfMonth } from 'date-fns';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { toApiDate } from '@/lib/format/date';
import { useSession } from '@/stores/session';
import { DashboardPage } from './DashboardPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

it('renders the seven summary cards from the reports', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  renderPage();
  expect(await screen.findByText('Rp 1.500.000')).toBeInTheDocument(); // totalAssets
  expect(screen.getByText('Rp 1.750.000')).toBeInTheDocument(); // netIncome
  expect(screen.getByText('Rp 1.234.000')).toBeInTheDocument(); // kasAkhir
  expect(screen.getByText('3')).toBeInTheDocument(); // draft count
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

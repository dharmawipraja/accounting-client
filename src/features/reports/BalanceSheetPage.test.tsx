import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { BalanceSheetPage } from './BalanceSheetPage';

afterEach(() => useSession.getState().clear());

const fixture = (asOf: string) => ({
  asOf,
  assets: { groups: [{ subtype: 'CURRENT_ASSET', lines: [{ code: '1-1000', name: 'Kas', amount: '500000.0000' }], subtotal: '500000.0000' }], total: '500000.0000' },
  liabilities: { groups: [], total: '0.0000' },
  equity: { groups: [{ subtype: 'CURRENT_EARNINGS', lines: [{ code: '', name: 'Laba Berjalan', amount: '500000.0000' }], subtotal: '500000.0000' }], total: '500000.0000' },
  totalAssets: '500000.0000', totalLiabilities: '0.0000', totalEquity: '500000.0000', currentYearEarnings: '500000.0000', balanced: true,
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><BalanceSheetPage /></QueryClientProvider>);
}

it('renders the balance sheet with a line, Total Aset, and the balanced badge; asOf drives the fetch', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let seenAsOf: string | null = null;
  server.use(http.get(`${API}/reports/balance-sheet`, ({ request }) => {
    seenAsOf = new URL(request.url).searchParams.get('asOf');
    return HttpResponse.json(fixture(seenAsOf ?? ''));
  }));
  renderPage();
  expect(await screen.findByText('1-1000 Kas')).toBeInTheDocument();
  expect(screen.getByText('Total Aset')).toBeInTheDocument();
  expect(screen.getByText(/seimbang/i)).toBeInTheDocument();
  await waitFor(() => expect(seenAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)); // default asOf = today
  fireEvent.change(screen.getByLabelText(/per tanggal/i), { target: { value: '2026-05-31' } });
  await waitFor(() => expect(seenAsOf).toBe('2026-05-31'));
});

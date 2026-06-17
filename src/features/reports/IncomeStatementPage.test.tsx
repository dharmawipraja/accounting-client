import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { IncomeStatementPage } from './IncomeStatementPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  return renderWithRouter(<IncomeStatementPage />);
}

it('renders the income statement down to Laba Bersih; range drives from', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let seenFrom: string | null = null;
  server.use(http.get(`${API}/reports/income-statement`, ({ request }) => {
    seenFrom = new URL(request.url).searchParams.get('from');
    return HttpResponse.json({ from: seenFrom, to: '2026-06-30', revenue: '2000000.0000', revenueLines: [{ code: '4-1000', name: 'Pendapatan', amount: '2000000.0000' }], cogs: '0.0000', cogsLines: [], grossProfit: '2000000.0000', operatingExpense: '0.0000', operatingExpenseLines: [], operatingProfit: '2000000.0000', otherIncome: '0.0000', otherExpense: '0.0000', profitBeforeTax: '2000000.0000', taxExpense: '250000.0000', netIncome: '1750000.0000' });
  }));
  renderPage();
  expect(await screen.findByText('Laba Bersih')).toBeInTheDocument();
  expect(screen.getByText(/Rp\s?1\.750\.000/)).toBeInTheDocument(); // netIncome (unique)
  await waitFor(() => expect(seenFrom).toMatch(/^\d{4}-01-01$/)); // default from = year start
});

import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { CashFlowPage } from './CashFlowPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  return renderWithRouter(<CashFlowPage />);
}

it('renders the cash flow statement with Kas Akhir', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(http.get(`${API}/reports/cash-flow`, () => HttpResponse.json({ from: '2026-01-01', to: '2026-06-30', netIncome: '111000.0000', operating: { adjustments: [], total: '222000.0000' }, investing: { lines: [], total: '0.0000' }, financing: { lines: [], total: '0.0000' }, netChange: '333000.0000', kasAwal: '444000.0000', kasAkhir: '777000.0000', reconciles: true })));
  renderPage();
  expect(await screen.findByText('Kas Akhir')).toBeInTheDocument();
  expect(screen.getByText(/Rp\s?777\.000/)).toBeInTheDocument(); // kasAkhir (unique)
});

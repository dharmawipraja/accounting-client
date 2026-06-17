import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { TrialBalancePage } from './TrialBalancePage';

afterEach(() => useSession.getState().clear());

const fixture = (asOf: string) => ({
  asOf,
  rows: [
    { accountId: 'acc-kas', code: '1-1000', name: 'Kas', debit: '500000.0000', credit: '0.0000', balance: '500000.0000' },
    { accountId: 'acc-modal', code: '3-1000', name: 'Modal', debit: '0.0000', credit: '500000.0000', balance: '-500000.0000' },
  ],
  totalDebit: '500000.0000', totalCredit: '500000.0000',
});

function renderPage() {
  const onOpenAccount = vi.fn();
  renderWithRouter(<TrialBalancePage onOpenAccount={onOpenAccount} />);
  return onOpenAccount;
}

it('renders rows + balanced badge; asOf drives the fetch; a row click opens that account', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let seenAsOf: string | null = null;
  server.use(http.get(`${API}/ledger/trial-balance`, ({ request }) => {
    seenAsOf = new URL(request.url).searchParams.get('asOf');
    return HttpResponse.json(fixture(seenAsOf ?? ''));
  }));
  const onOpenAccount = renderPage();
  expect(await screen.findByText('Kas')).toBeInTheDocument();
  expect(screen.getByText('1-1000')).toBeInTheDocument();
  expect(screen.getByText(/seimbang/i)).toBeInTheDocument();
  await waitFor(() => expect(seenAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)); // default asOf = today
  fireEvent.click(screen.getByText('Kas'));
  expect(onOpenAccount).toHaveBeenCalledWith('acc-kas');
  fireEvent.change(screen.getByLabelText(/per tanggal/i), { target: { value: '2026-05-31' } });
  await waitFor(() => expect(seenAsOf).toBe('2026-05-31'));
});

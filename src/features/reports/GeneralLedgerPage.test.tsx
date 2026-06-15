import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { GeneralLedgerPage } from './GeneralLedgerPage';

afterEach(() => useSession.getState().clear());

function renderPage(initialAccountId?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><GeneralLedgerPage initialAccountId={initialAccountId} /></QueryClientProvider>);
}

it('shows the select-account hint and does not fetch when no account is chosen', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let called = false;
  server.use(http.get(`${API}/reports/general-ledger`, () => { called = true; return HttpResponse.json({}); }));
  renderPage(undefined);
  expect(screen.getByText(/pilih akun/i)).toBeInTheDocument();
  await new Promise((r) => setTimeout(r, 150));
  expect(called).toBe(false);
});

it('with a preselected account: sends accountId + from and renders opening, a line, and closing', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let seenAccountId: string | null = null;
  let seenFrom: string | null = null;
  server.use(http.get(`${API}/reports/general-ledger`, ({ request }) => {
    const p = new URL(request.url).searchParams;
    seenAccountId = p.get('accountId');
    seenFrom = p.get('from');
    return HttpResponse.json({
      account: { id: 'acc-kas', code: '1-1000', name: 'Kas', normalBalance: 'DEBIT' },
      from: seenFrom, to: p.get('to'),
      openingBalance: '0.0000',
      lines: [{ date: '2026-03-01', entryRef: 'JE/2026/000004', description: 'Setoran modal', debit: '1000000.0000', credit: '0.0000', runningBalance: '1000000.0000' }],
      closingBalance: '1000000.0000',
    });
  }));
  renderPage('acc-kas');
  expect(await screen.findByText('JE/2026/000004')).toBeInTheDocument();
  expect(screen.getByText('Setoran modal')).toBeInTheDocument();
  expect(screen.getByText(/Saldo Akhir/i)).toBeInTheDocument();
  await waitFor(() => expect(seenAccountId).toBe('acc-kas'));
  expect(seenFrom).toMatch(/^\d{4}-01-01$/); // default from = year start
});

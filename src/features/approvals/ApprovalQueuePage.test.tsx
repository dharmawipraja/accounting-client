import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API, journalEntryListFixture } from '@/test/handlers';
import { server } from '@/test/server';
import { inRouter } from '@/test/utils';
import { useSession } from '@/stores/session';
import { ApprovalQueuePage } from './ApprovalQueuePage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{inRouter(<ApprovalQueuePage />)}</QueryClientProvider>);
}

// One DRAFT invoice + DRAFT journals should surface together in the queue.
it('aggregates draft documents across resources for an approver', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'APPROVER' });
  renderPage();
  // a draft journal (by description) and a draft invoice/bill (by type badge) — different resources
  expect(await screen.findByText('Draf 1')).toBeInTheDocument();
  expect((await screen.findAllByText('Faktur Penjualan')).length).toBeGreaterThan(0);
  // approver sees Post actions
  expect((await screen.findAllByRole('button', { name: /posting/i })).length).toBeGreaterThan(0);
});

it('an ACCOUNTANT sees the queue but no Post actions', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  renderPage();
  expect(await screen.findByText('Draf 1')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /posting/i })).not.toBeInTheDocument();
});

it('posting a queued journal confirms then hits the post endpoint', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'APPROVER' });
  // trim the queue to a single journal draft so the Post target is unambiguous
  server.use(
    http.get(`${API}/ledger/journal-entries`, () => HttpResponse.json({ data: [journalEntryListFixture()[0]], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 })),
    http.get(`${API}/purchase-bills`, () => HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 })),
    http.get(`${API}/payments`, () => HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 })),
  );
  let posted = false;
  server.use(http.post(`${API}/ledger/journal-entries/jed1/post`, () => { posted = true; return HttpResponse.json({ id: 'jed1', date: '2026-06-16T00:00:00.000Z', description: 'Draf 1', sourceType: 'MANUAL', status: 'POSTED' }); }));
  renderPage();
  await screen.findByText('Draf 1');
  await user.click(screen.getByRole('button', { name: /posting/i }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: /posting/i }));
  await waitFor(() => expect(posted).toBe(true));
});

import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { API, journalEntryListFixture } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { JournalsPage } from './JournalsPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => useSession.getState().clear());

function renderPage(initialStatus?: 'DRAFT' | 'POSTED') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute();
  const index = createRoute({ getParentRoute: () => root, path: '/', component: () => <JournalsPage initialStatus={initialStatus} /> });
  const newR = createRoute({ getParentRoute: () => root, path: '/journals/new', component: () => null });
  const view = createRoute({ getParentRoute: () => root, path: '/journals/$id', component: () => null });
  const router = createRouter({ routeTree: root.addChildren([index, newR, view]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  return render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
}

it('lists the paginated register; ACCOUNTANT no Posting; range shown', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  renderPage();
  expect(await screen.findByText('Penjualan diposting')).toBeInTheDocument();
  expect(screen.getByText(/Menampilkan 1–5 dari 5/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Posting' })).not.toBeInTheDocument();
});

it('seeds the status filter from initialStatus (deep-link to DRAFT)', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'APPROVER' });
  let seenStatus: string | null = null;
  server.use(http.get(`${API}/ledger/journal-entries`, ({ request }) => {
    seenStatus = new URL(request.url).searchParams.get('status');
    return HttpResponse.json(journalEntryListFixture());
  }));
  renderPage('DRAFT');
  await waitFor(() => expect(seenStatus).toBe('DRAFT'));
});

it('APPROVER posts a draft with an idempotency key', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  let seenKey: string | null = null;
  server.use(
    http.get(`${API}/ledger/journal-entries`, () => HttpResponse.json({ data: journalEntryListFixture().filter((e) => e.status === 'DRAFT'), total: 3, limit: 20, offset: 0 })),
    http.post(`${API}/ledger/journal-entries/jed1/post`, ({ request }) => { seenKey = request.headers.get('Idempotency-Key'); return HttpResponse.json({ id: 'jed1', date: '2026-06-16T00:00:00.000Z', description: 'Draf 1', sourceType: 'MANUAL', status: 'POSTED' }); }),
  );
  renderPage();
  await screen.findByText('Draf 1');
  await user.click(screen.getAllByRole('button', { name: 'Posting' })[0]);
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(seenKey).toBeTruthy());
});

it('Pagination Next requests the next offset', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let lastOffset: string | null = null;
  server.use(http.get(`${API}/ledger/journal-entries`, ({ request }) => {
    lastOffset = new URL(request.url).searchParams.get('offset');
    return HttpResponse.json({ data: journalEntryListFixture().slice(0, 1), total: 25, limit: 20, offset: Number(lastOffset ?? '0') });
  }));
  renderPage();
  await screen.findByText('Draf 1');
  await user.click(screen.getByRole('button', { name: /berikutnya/i }));
  await waitFor(() => expect(lastOffset).toBe('20'));
});

it('APPROVER reverses a MANUAL posted entry', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  let reversed = false;
  server.use(
    http.get(`${API}/ledger/journal-entries`, () => HttpResponse.json({ data: journalEntryListFixture().filter((e) => e.id === 'jep2'), total: 1, limit: 20, offset: 0 })),
    http.post(`${API}/ledger/journal-entries/jep2/reverse`, () => { reversed = true; return HttpResponse.json({ id: 'rev1', date: '2026-06-15T00:00:00.000Z', description: 'Reversal', sourceType: 'REVERSAL', status: 'POSTED' }); }),
  );
  renderPage();
  await screen.findByText('Jurnal manual diposting');
  await user.click(screen.getByRole('button', { name: 'Balikkan' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Balikkan' }));
  await waitFor(() => expect(reversed).toBe(true));
});

it('surfaces an error toast when post returns 422', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  server.use(
    http.get(`${API}/ledger/journal-entries`, () => HttpResponse.json({ data: journalEntryListFixture().filter((e) => e.id === 'jed1'), total: 1, limit: 20, offset: 0 })),
    http.post(`${API}/ledger/journal-entries/jed1/post`, () => HttpResponse.json({ code: 'UNBALANCED_ENTRY', message: 'debits != credits' }, { status: 422 })),
  );
  renderPage();
  await screen.findByText('Draf 1');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
});

import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { id as messages } from '@/lib/i18n/messages.id';
import { PaymentsPage } from './PaymentsPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => useSession.getState().clear());

const partners = [{ id: 'p1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }];
const accounts = [{ id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null }];
const draftPayment = { id: 'pay1', paymentNumber: null, paymentRef: null, direction: 'RECEIPT', partnerId: 'p1', date: '2026-06-16T00:00:00.000Z', cashAccountId: 'a1', description: 'x', status: 'DRAFT', total: '1110000.0000', allocations: [{ salesInvoiceId: 'i1', amount: '1110000.0000' }] };

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute();
  const index = createRoute({ getParentRoute: () => root, path: '/', component: () => <PaymentsPage /> });
  const newR = createRoute({ getParentRoute: () => root, path: '/payments/new', component: () => null });
  const editR = createRoute({ getParentRoute: () => root, path: '/payments/$id/edit', component: () => null });
  const router = createRouter({ routeTree: root.addChildren([index, newR, editR]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  return render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
}

it('lists payments with partner + cash-account joins; ACCOUNTANT no Posting', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/payments`, () => HttpResponse.json([draftPayment])),
    http.get(`${API}/partners`, () => HttpResponse.json(partners)),
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
  );
  renderPage();
  expect(await screen.findByText('Toko A')).toBeInTheDocument();
  expect(screen.getByText(/1-1000.*Kas/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Posting' })).not.toBeInTheDocument();
});

it('APPROVER posts a draft payment with an idempotency key', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  let seenKey: string | null = null;
  server.use(
    http.get(`${API}/payments`, () => HttpResponse.json([draftPayment])),
    http.get(`${API}/partners`, () => HttpResponse.json(partners)),
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
    http.post(`${API}/payments/pay1/post`, ({ request }) => { seenKey = request.headers.get('Idempotency-Key'); return HttpResponse.json({ ...draftPayment, status: 'POSTED', paymentNumber: 1, paymentRef: 'PAY/2026/000001' }); }),
  );
  renderPage();
  await screen.findByText('Toko A');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(seenKey).toBeTruthy());
});

it('shows the SoD message when post returns 403 SEGREGATION_OF_DUTIES', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  server.use(
    http.get(`${API}/payments`, () => HttpResponse.json([draftPayment])),
    http.get(`${API}/partners`, () => HttpResponse.json(partners)),
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
    http.post(`${API}/payments/pay1/post`, () => HttpResponse.json({ code: 'SEGREGATION_OF_DUTIES', message: 'no self-approve' }, { status: 403 })),
  );
  renderPage();
  await screen.findByText('Toko A');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(messages.roles.segregationOfDuties));
});

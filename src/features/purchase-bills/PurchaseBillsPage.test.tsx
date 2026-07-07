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
import { PurchaseBillsPage } from './PurchaseBillsPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => useSession.getState().clear());

const onePartner = [{ id: 'p1', code: 'VEND-1', name: 'PT Pemasok', isCustomer: false, isVendor: true, isActive: true }];
const draftBill = { id: 'b1', billNumber: null, billRef: null, vendorInvoiceNo: 'VINV-1', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z', dueDate: null, description: 'x', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] };
const postedBill = { ...draftBill, id: 'b2', billNumber: 1, billRef: 'BILL/2026/000001', status: 'POSTED' };

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute();
  const index = createRoute({ getParentRoute: () => root, path: '/', component: () => <PurchaseBillsPage /> });
  const newR = createRoute({ getParentRoute: () => root, path: '/purchase-bills/new', component: () => null });
  const editR = createRoute({ getParentRoute: () => root, path: '/purchase-bills/$id/edit', component: () => null });
  const router = createRouter({ routeTree: root.addChildren([index, newR, editR]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  return render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
}

it('lists bills with the joined vendor name; ACCOUNTANT sees New but not Posting', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  server.use(
    http.get(`${API}/purchase-bills`, () => HttpResponse.json({ data: [draftBill], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: onePartner, total: 1, limit: 200, offset: 0 })),
  );
  renderPage();
  expect(await screen.findByText('PT Pemasok')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /tagihan baru/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Posting' })).not.toBeInTheDocument();
  expect(screen.getByText(/Menampilkan/)).toBeInTheDocument();
});

it('APPROVER posts a draft with an idempotency key', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER', mustChangePassword: false });
  let seenKey: string | null = null;
  server.use(
    http.get(`${API}/purchase-bills`, () => HttpResponse.json({ data: [draftBill], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: onePartner, total: 1, limit: 200, offset: 0 })),
    http.post(`${API}/purchase-bills/b1/post`, ({ request }) => { seenKey = request.headers.get('Idempotency-Key'); return HttpResponse.json({ ...draftBill, status: 'POSTED', billNumber: 1, billRef: 'BILL/2026/000001' }); }),
  );
  renderPage();
  await screen.findByText('PT Pemasok');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(seenKey).toBeTruthy());
});

it('shows the SoD message when post returns 403 SEGREGATION_OF_DUTIES', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER', mustChangePassword: false });
  server.use(
    http.get(`${API}/purchase-bills`, () => HttpResponse.json({ data: [draftBill], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: onePartner, total: 1, limit: 200, offset: 0 })),
    http.post(`${API}/purchase-bills/b1/post`, () => HttpResponse.json({ code: 'SEGREGATION_OF_DUTIES', message: 'no self-approve' }, { status: 403 })),
  );
  renderPage();
  await screen.findByText('PT Pemasok');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(messages.roles.segregationOfDuties));
});

it('APPROVER voids a posted bill', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER', mustChangePassword: false });
  let voided = false;
  server.use(
    http.get(`${API}/purchase-bills`, () => HttpResponse.json({ data: [postedBill], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: onePartner, total: 1, limit: 200, offset: 0 })),
    http.post(`${API}/purchase-bills/b2/void`, () => { voided = true; return HttpResponse.json({ ...postedBill, status: 'VOID' }); }),
  );
  renderPage();
  await screen.findByText('PT Pemasok');
  await user.click(screen.getByRole('button', { name: 'Batalkan' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Batalkan' }));
  await waitFor(() => expect(voided).toBe(true));
});

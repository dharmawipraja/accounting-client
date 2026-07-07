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
import { SalesInvoicesPage } from './SalesInvoicesPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

afterEach(() => useSession.getState().clear());

const onePartner = [{ id: 'p1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }];
const draftInvoice = { id: 'i1', invoiceNumber: null, invoiceRef: null, partnerId: 'p1', date: '2026-06-13T00:00:00.000Z', dueDate: null, description: 'x', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] };
const postedInvoice = { ...draftInvoice, id: 'i2', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', status: 'POSTED' };

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute();
  const index = createRoute({ getParentRoute: () => root, path: '/', component: () => <SalesInvoicesPage /> });
  const newR = createRoute({ getParentRoute: () => root, path: '/sales-invoices/new', component: () => null });
  const editR = createRoute({ getParentRoute: () => root, path: '/sales-invoices/$id/edit', component: () => null });
  const router = createRouter({ routeTree: root.addChildren([index, newR, editR]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  return render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
}

it('lists invoices with partner name (joined) and a Draft status, gated New for ACCOUNTANT', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [
      { id: 'i1', invoiceNumber: null, partnerId: 'p1', date: '2026-06-13T00:00:00.000Z', dueDate: null, description: 'x', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] },
    ], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: [{ id: 'p1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }], total: 1, limit: 200, offset: 0 })),
  );
  renderPage();
  expect(await screen.findByText('Toko A')).toBeInTheDocument();      // joined partner name
  expect(screen.getAllByText(/draf/i).length).toBeGreaterThan(0);     // status badge (also matches filter button)
  expect(screen.getByRole('link', { name: /faktur baru/i })).toBeInTheDocument();
});

it('deletes a draft after confirm (ACCOUNTANT)', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  let deleted = false;
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [
      { id: 'i1', invoiceNumber: null, partnerId: 'p1', date: '2026-06-13T00:00:00.000Z', dueDate: null, description: 'x', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] },
    ], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: [{ id: 'p1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }], total: 1, limit: 200, offset: 0 })),
    http.delete(`${API}/sales-invoices/i1`, () => { deleted = true; return HttpResponse.json({}); }),
  );
  renderPage();
  await screen.findByText('Toko A');
  await user.click(screen.getAllByRole('button', { name: /hapus/i })[0]); // row delete
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: /hapus/i })); // confirm
  await waitFor(() => expect(deleted).toBe(true));
});

it('APPROVER can post a draft (idempotency key sent); ACCOUNTANT cannot post', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [draftInvoice], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: onePartner, total: 1, limit: 200, offset: 0 })),
  );
  const { unmount } = renderPage();
  await screen.findByText('Toko A');
  expect(screen.queryByRole('button', { name: 'Posting' })).not.toBeInTheDocument();
  unmount();

  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER', mustChangePassword: false });
  let seenKey: string | null = null;
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [draftInvoice], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: onePartner, total: 1, limit: 200, offset: 0 })),
    http.post(`${API}/sales-invoices/i1/post`, ({ request }) => { seenKey = request.headers.get('Idempotency-Key'); return HttpResponse.json({ ...draftInvoice, status: 'POSTED', invoiceNumber: 1, invoiceRef: 'INV/2026/000001' }); }),
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
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER', mustChangePassword: false });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [draftInvoice], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: onePartner, total: 1, limit: 200, offset: 0 })),
    http.post(`${API}/sales-invoices/i1/post`, () => HttpResponse.json({ code: 'SEGREGATION_OF_DUTIES', message: 'no self-approve' }, { status: 403 })),
  );
  renderPage();
  await screen.findByText('Toko A');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(messages.roles.segregationOfDuties));
});

it('APPROVER can void a posted invoice', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER', mustChangePassword: false });
  let voided = false;
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [postedInvoice], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: onePartner, total: 1, limit: 200, offset: 0 })),
    http.post(`${API}/sales-invoices/i2/void`, () => { voided = true; return HttpResponse.json({ ...postedInvoice, status: 'VOID' }); }),
  );
  renderPage();
  await screen.findByText('Toko A');
  await user.click(screen.getByRole('button', { name: 'Batalkan' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Batalkan' }));
  await waitFor(() => expect(voided).toBe(true));
});

it('hides New for VIEWER', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER', mustChangePassword: false });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 })),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 })),
  );
  renderPage();
  expect(await screen.findByText(/belum ada data/i)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /faktur baru/i })).not.toBeInTheDocument();
});

it('shows Pagination "Menampilkan" label with correct count', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER', mustChangePassword: false });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [draftInvoice, postedInvoice], total: 2, limit: 20, offset: 0 })),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: onePartner, total: 1, limit: 200, offset: 0 })),
  );
  renderPage();
  // Pagination component renders "Menampilkan {from}–{to} dari {total}"
  expect(await screen.findByText(/menampilkan 1.+2 dari 2/i)).toBeInTheDocument();
});

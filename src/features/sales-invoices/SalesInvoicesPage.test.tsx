import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { SalesInvoicesPage } from './SalesInvoicesPage';

afterEach(() => useSession.getState().clear());

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
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([
      { id: 'i1', invoiceNumber: null, partnerId: 'p1', date: '2026-06-13T00:00:00.000Z', dueDate: null, description: 'x', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] },
    ])),
    http.get(`${API}/partners`, () => HttpResponse.json([{ id: 'p1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }])),
  );
  renderPage();
  expect(await screen.findByText('Toko A')).toBeInTheDocument();      // joined partner name
  expect(screen.getAllByText(/draf/i).length).toBeGreaterThan(0);     // status badge (also matches filter button)
  expect(screen.getByRole('link', { name: /faktur baru/i })).toBeInTheDocument();
});

it('deletes a draft after confirm (ACCOUNTANT)', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let deleted = false;
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([
      { id: 'i1', invoiceNumber: null, partnerId: 'p1', date: '2026-06-13T00:00:00.000Z', dueDate: null, description: 'x', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] },
    ])),
    http.get(`${API}/partners`, () => HttpResponse.json([{ id: 'p1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }])),
    http.delete(`${API}/sales-invoices/i1`, () => { deleted = true; return HttpResponse.json({}); }),
  );
  renderPage();
  await screen.findByText('Toko A');
  await user.click(screen.getAllByRole('button', { name: /hapus/i })[0]); // row delete
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: /hapus/i })); // confirm
  await waitFor(() => expect(deleted).toBe(true));
});

it('hides New for VIEWER', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([])),
    http.get(`${API}/partners`, () => HttpResponse.json([])),
  );
  renderPage();
  expect(await screen.findByText(/tidak ada data/i)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /faktur baru/i })).not.toBeInTheDocument();
});

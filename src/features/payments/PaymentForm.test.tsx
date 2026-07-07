import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API, openInvoiceFixture, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { inRouter } from '@/test/utils';
import { useSession } from '@/stores/session';
import { PaymentForm } from './PaymentForm';
import type { Payment } from './schema';

afterEach(() => useSession.getState().clear());

const accounts = [{ id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null }];
const partners = [{ id: 'p1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }];

function renderForm(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{inRouter(ui)}</QueryClientProvider>);
}

function commonHandlers() {
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: partners, total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [openInvoiceFixture()], total: 1, limit: 200, offset: 0 })),
  );
}

it('allocates via Lunasi and posts the RECEIPT payload', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  commonHandlers();
  let posted: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/payments`, async ({ request }) => {
    posted = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'pay9', number: null, ref: null, fiscalYear: null, direction: 'RECEIPT', partnerId: 'p1', date: '2026-06-16T00:00:00.000Z', cashAccountId: 'a1', description: null, status: 'DRAFT', amount: '1110000.0000', allocations: [{ salesInvoiceId: 'i1', amount: '1110000.0000' }] });
  }));
  const onSaved = vi.fn();
  renderForm(<PaymentForm mode="create" onSaved={onSaved} />);

  await user.click(await screen.findByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-16');
  await user.click(screen.getByRole('combobox', { name: /akun kas/i }));
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.click(await screen.findByRole('button', { name: /lunasi/i }));
  await user.click(screen.getByRole('button', { name: /simpan/i }));

  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ direction: 'RECEIPT', partnerId: 'p1', cashAccountId: 'a1', allocations: [{ salesInvoiceId: 'i1', amount: '1110000.0000' }] });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it('blocks save when nothing is allocated', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  commonHandlers();
  renderForm(<PaymentForm mode="create" onSaved={vi.fn()} />);
  await user.click(await screen.findByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-16');
  await user.click(screen.getByRole('combobox', { name: /akun kas/i }));
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  expect(await screen.findByText(/minimal satu faktur/i)).toBeInTheDocument();
});

it('blocks save when an allocation exceeds the invoice outstanding', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  commonHandlers();
  const onSaved = vi.fn();
  renderForm(<PaymentForm mode="create" onSaved={onSaved} />);

  await user.click(await screen.findByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-16');
  await user.click(screen.getByRole('combobox', { name: /akun kas/i }));
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));

  // Outstanding is 1.110.000 — allocate more than that.
  await user.type(await screen.findByLabelText(/dialokasikan/i), '2000000');
  // Inline over-allocation error renders immediately.
  expect(await screen.findByText(/melebihi sisa tagihan/i)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /simpan/i }));
  await waitFor(() => expect(screen.getAllByText(/melebihi sisa tagihan/i).length).toBeGreaterThanOrEqual(1));
  expect(onSaved).not.toHaveBeenCalled();
});

it('allocates via Lunasi and posts the DISBURSEMENT payload', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  const vendor = [{ id: 'v1', code: 'VEND-1', name: 'PT Pemasok', isCustomer: false, isVendor: true, isActive: true }];
  const openBill = { id: 'b1', billNumber: 1, billRef: 'BILL/2026/000001', fiscalYear: 2026, vendorInvoiceNo: null, partnerId: 'v1', date: '2026-06-15T00:00:00.000Z', dueDate: '2026-07-15T00:00:00.000Z', description: null, status: 'POSTED', subtotal: '1000000.0000', taxTotal: '0.0000', withholdingTotal: '0.0000', total: '1000000.0000', amountPaid: '0.0000', outstanding: '1000000.0000', paymentStatus: 'UNPAID', lines: [] };
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: vendor, total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 })),
    http.get(`${API}/purchase-bills`, () => HttpResponse.json({ data: [openBill], total: 1, limit: 200, offset: 0 })),
  );
  let posted: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/payments`, async ({ request }) => {
    posted = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'pay9', number: null, ref: null, fiscalYear: null, direction: 'DISBURSEMENT', partnerId: 'v1', date: '2026-06-16T00:00:00.000Z', cashAccountId: 'a1', description: null, status: 'DRAFT', amount: '1000000.0000', allocations: [{ purchaseBillId: 'b1', amount: '1000000.0000' }] });
  }));
  const onSaved = vi.fn();
  renderForm(<PaymentForm mode="create" direction="DISBURSEMENT" onSaved={onSaved} />);

  await user.click(await screen.findByRole('combobox', { name: /vendor/i }));
  await user.click(await screen.findByRole('option', { name: /VEND-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-16');
  await user.click(screen.getByRole('combobox', { name: /akun kas/i }));
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.click(await screen.findByRole('button', { name: /lunasi/i }));
  await user.click(screen.getByRole('button', { name: /simpan/i }));

  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ direction: 'DISBURSEMENT', partnerId: 'v1', cashAccountId: 'a1', allocations: [{ purchaseBillId: 'b1', amount: '1000000.0000' }] });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it('shows the journal preview once an allocation exists', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  commonHandlers();
  server.use(http.post(`${API}/journal-entries/preview`, () =>
    HttpResponse.json({
      lines: [
        { accountId: 'a1', accountCode: '1-1000', accountName: 'Kas', debit: '1110000.0000', credit: '0.0000' },
        { accountId: 'ar', accountCode: '1-1200', accountName: 'Piutang Usaha', debit: '0.0000', credit: '1110000.0000' },
      ],
    }),
  ));
  renderForm(<PaymentForm mode="create" onSaved={vi.fn()} />);

  await user.click(await screen.findByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-1/i }));
  await user.click(screen.getByRole('combobox', { name: /akun kas/i }));
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.click(await screen.findByRole('button', { name: /lunasi/i }));

  // debounced 400ms, then the balanced dry-run renders with account names
  expect(await screen.findByText(/pratinjau jurnal/i, undefined, { timeout: 2_000 })).toBeInTheDocument();
  expect(await screen.findByText(/piutang usaha/i)).toBeInTheDocument();
});

it('discards allocations when the partner changes (no cross-partner submit)', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  const twoPartners = [
    ...partners,
    { id: 'p2', code: 'CUST-2', name: 'Toko B', isCustomer: true, isVendor: false, isActive: true },
  ];
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: twoPartners, total: 2, limit: 200, offset: 0 })),
    // The only open invoice belongs to p1 (CUST-1).
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [openInvoiceFixture()], total: 1, limit: 200, offset: 0 })),
  );
  let posted = false;
  server.use(http.post(`${API}/payments`, () => { posted = true; return HttpResponse.json({}, { status: 500 }); }));
  const onSaved = vi.fn();
  renderForm(<PaymentForm mode="create" onSaved={onSaved} />);

  // Allocate against CUST-1's invoice, then switch to CUST-2.
  await user.click(await screen.findByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-16');
  await user.click(screen.getByRole('combobox', { name: /akun kas/i }));
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.click(await screen.findByRole('button', { name: /lunasi/i }));

  await user.click(screen.getByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-2/i }));

  // The stale allocation must not survive: saving now has nothing allocated.
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  expect(await screen.findByText(/minimal satu faktur/i)).toBeInTheDocument();
  expect(posted).toBe(false);
  expect(onSaved).not.toHaveBeenCalled();
});

it('renders a posted payment read-only', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN', mustChangePassword: false });
  commonHandlers();
  const posted: Payment = {
    id: 'pay1', number: 1, ref: 'PAY-RCV/2026/000001', fiscalYear: 2026, direction: 'RECEIPT',
    partnerId: 'p1', date: '2026-06-16T00:00:00.000Z', cashAccountId: 'a1', description: null,
    status: 'POSTED', amount: '1110000.0000', allocations: [{ salesInvoiceId: 'i1', amount: '1110000.0000' }],
  };
  renderForm(<PaymentForm mode="edit" payment={posted} onSaved={vi.fn()} readOnly />);

  expect(await screen.findByText(/hanya-baca/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /simpan/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /lunasi/i })).not.toBeInTheDocument();
  expect(screen.getByLabelText(/tanggal/i)).toBeDisabled();
});

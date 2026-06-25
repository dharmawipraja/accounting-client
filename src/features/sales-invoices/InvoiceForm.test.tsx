import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { DocumentEditor } from '@/features/documents/DocumentEditor';
import { useInvoiceEditorConfig } from './editorConfig';

function InvoiceEditorHarness(props: { mode: 'create' | 'edit'; invoice?: import('./schema').SalesInvoice; onSaved: () => void; startEmpty?: boolean; readOnly?: boolean }) {
  const config = useInvoiceEditorConfig();
  return <DocumentEditor config={config} mode={props.mode} doc={props.invoice} onSaved={props.onSaved} startEmpty={props.startEmpty} readOnly={props.readOnly} />;
}

afterEach(() => useSession.getState().clear());

const accounts = [
  { id: 'ar', code: '1-1200', name: 'Piutang Usaha', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null },
  { id: 'rev', code: '4-1000', name: 'Pendapatan', type: 'REVENUE', subtype: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, isActive: true, parentId: null },
];
const partners = [{ id: 'c1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }];

function renderForm(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('creates a draft: picks partner + line and posts the lines payload', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: partners, total: partners.length, limit: 200, offset: 0 })),
    http.get(`${API}/tax/codes`, () => HttpResponse.json(paged([]))),
  );
  let posted: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/sales-invoices`, async ({ request }) => {
    posted = (await request.json()) as Record<string, unknown>;
    // must be a full valid SalesInvoice so the create mutation's schema parse succeeds
    return HttpResponse.json({
      id: 'i9', invoiceNumber: null, partnerId: 'c1', date: '2026-06-13T00:00:00.000Z', dueDate: null,
      description: 'x', status: 'DRAFT', subtotal: '0.0000', taxTotal: '0.0000', withholdingTotal: '0.0000',
      total: '0.0000', amountPaid: '0.0000', outstanding: '0.0000', paymentStatus: 'UNPAID', lines: [],
    });
  }));
  const onSaved = vi.fn();
  renderForm(<InvoiceEditorHarness mode="create" onSaved={onSaved} />);

  await user.click(screen.getByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-13');
  await user.type(screen.getByLabelText(/deskripsi/i), 'Jasa konsultasi');
  await user.click(screen.getByRole('combobox', { name: /akun/i }));
  await user.click(await screen.findByRole('option', { name: /4-1000/i }));
  await user.clear(screen.getByLabelText(/qty/i));
  await user.type(screen.getByLabelText(/qty/i), '2');
  await user.type(screen.getByLabelText(/harga satuan/i), '500000');
  await user.click(screen.getByRole('button', { name: /simpan draf/i }));

  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ partnerId: 'c1', date: '2026-06-13', lines: [{ accountId: 'rev', quantity: '2', unitPrice: '500000' }] });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it('blocks save with no lines / no partner', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: partners, total: partners.length, limit: 200, offset: 0 })),
    http.get(`${API}/tax/codes`, () => HttpResponse.json(paged([]))),
  );
  renderForm(<InvoiceEditorHarness mode="create" onSaved={vi.fn()} startEmpty />);
  await user.click(screen.getByRole('button', { name: /simpan draf/i }));
  // empty submit shows the line/partner/date validation errors
  expect((await screen.findAllByText(/minimal satu baris|pilih pelanggan|wajib diisi/i)).length).toBeGreaterThan(0);
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { BillForm } from './BillForm';

afterEach(() => useSession.getState().clear());

const accounts = [
  { id: 'ap', code: '2-1000', name: 'Utang Usaha', type: 'LIABILITY', subtype: 'CURRENT_LIABILITY', normalBalance: 'CREDIT', isPostable: true, isActive: true, parentId: null },
  { id: 'exp', code: '5-1000', name: 'HPP', type: 'EXPENSE', subtype: 'COGS', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null },
];
const partners = [{ id: 'v1', code: 'VEND-1', name: 'PT Pemasok', isCustomer: false, isVendor: true, isActive: true }];

function renderForm(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('creates a draft: vendor + line → posts the purchase payload with vendorInvoiceNo', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: partners, total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/tax/codes`, () => HttpResponse.json([])),
  );
  let posted: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/purchase-bills`, async ({ request }) => {
    posted = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'b9', billNumber: null, billRef: null, vendorInvoiceNo: 'VINV-1', partnerId: 'v1', date: '2026-06-15T00:00:00.000Z', dueDate: null, description: 'x', status: 'DRAFT', subtotal: '0.0000', taxTotal: '0.0000', withholdingTotal: '0.0000', total: '0.0000', amountPaid: '0.0000', outstanding: '0.0000', paymentStatus: 'UNPAID', lines: [] });
  }));
  const onSaved = vi.fn();
  renderForm(<BillForm mode="create" onSaved={onSaved} />);

  await user.click(screen.getByRole('combobox', { name: /vendor/i }));
  await user.click(await screen.findByRole('option', { name: /VEND-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-15');
  await user.type(screen.getByLabelText(/no\. faktur vendor/i), 'VINV-1');
  await user.click(screen.getByRole('combobox', { name: /akun/i }));
  await user.click(await screen.findByRole('option', { name: /5-1000/i }));
  await user.type(screen.getByLabelText(/deskripsi/i), 'Jasa konsultan');
  await user.clear(screen.getByLabelText(/qty/i));
  await user.type(screen.getByLabelText(/qty/i), '1');
  await user.type(screen.getByLabelText(/harga satuan/i), '1000000');

  await user.click(screen.getByRole('button', { name: /simpan draf/i }));
  await waitFor(() => expect(posted).toBeTruthy());
  // purchase-specific create payload: vendor partner + vendorInvoiceNo + the line
  expect(posted).toMatchObject({ partnerId: 'v1', date: '2026-06-15', vendorInvoiceNo: 'VINV-1', lines: [{ accountId: 'exp', quantity: '1', unitPrice: '1000000' }] });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it('blocks save with no lines / no partner', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: partners, total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/tax/codes`, () => HttpResponse.json([])),
  );
  renderForm(<BillForm mode="create" onSaved={vi.fn()} startEmpty />);
  await user.click(screen.getByRole('button', { name: /simpan draf/i }));
  expect((await screen.findAllByText(/minimal satu baris|pilih vendor|wajib diisi/i)).length).toBeGreaterThan(0);
});

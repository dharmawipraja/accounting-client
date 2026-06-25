import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { BillForm } from './BillForm';
import type { PurchaseBill } from './schema';

afterEach(() => useSession.getState().clear());

const posted: PurchaseBill = {
  id: 'b1', billNumber: 1, billRef: 'BILL/2026/000001', fiscalYear: 2026, vendorInvoiceNo: 'VINV-9', partnerId: 'v1',
  date: '2026-06-15T00:00:00.000Z', dueDate: null, description: 'x', status: 'POSTED', subtotal: '1000000.0000', taxTotal: '110000.0000',
  withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000',
  paymentStatus: 'UNPAID', postedBy: 'u', postedAt: '2026-06-15T00:00:00.000Z', journalEntryId: 'j1',
  lines: [{ id: 'l1', purchaseBillId: 'b1', lineNo: 1, description: 'Jasa', accountId: 'exp', quantity: '1.0000', unitPrice: '1000000.0000', amount: '1000000.0000', taxCodeIds: [] }],
};

function renderForm(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('renders a posted bill read-only: disabled fields, banner, no Save', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged([{ id: 'exp', code: '5-1000', name: 'HPP', type: 'EXPENSE', subtype: 'COGS', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null }]))),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: [{ id: 'v1', code: 'VEND-1', name: 'PT Pemasok', isCustomer: false, isVendor: true, isActive: true }], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/tax/codes`, () => HttpResponse.json(paged([]))),
  );
  renderForm(<BillForm mode="edit" bill={posted} onSaved={vi.fn()} readOnly />);
  expect(await screen.findByText(/hanya-baca/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /simpan draf/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /tambah baris/i })).not.toBeInTheDocument();
  expect(screen.getByLabelText(/tanggal/i)).toBeDisabled();
});

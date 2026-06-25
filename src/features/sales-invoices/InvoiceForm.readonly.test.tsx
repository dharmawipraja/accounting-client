import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { InvoiceForm } from './InvoiceForm';
import type { SalesInvoice } from './schema';

afterEach(() => useSession.getState().clear());

const posted: SalesInvoice = {
  id: 'i1', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', partnerId: 'c1', date: '2026-06-15T00:00:00.000Z',
  dueDate: null, description: 'x', status: 'POSTED', subtotal: '1000000.0000', taxTotal: '110000.0000',
  withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000',
  paymentStatus: 'UNPAID', postedBy: 'u', postedAt: '2026-06-15T00:00:00.000Z', journalEntryId: 'j1',
  lines: [{ id: 'l1', lineNo: 1, description: 'Jasa', accountId: 'rev', quantity: '1.0000', unitPrice: '1000000.0000', amount: '1000000.0000', taxCodeIds: [] }],
};

function renderForm(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('renders a posted invoice read-only: disabled fields, banner, no Save', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged([{ id: 'rev', code: '4-1000', name: 'Pendapatan', type: 'REVENUE', subtype: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, isActive: true, parentId: null }]))),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: [{ id: 'c1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }], total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/tax/codes`, () => HttpResponse.json(paged([]))),
  );
  renderForm(<InvoiceForm mode="edit" invoice={posted} onSaved={vi.fn()} readOnly />);
  expect(await screen.findByText(/hanya-baca/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /simpan draf/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /tambah baris/i })).not.toBeInTheDocument();
  expect(screen.getByLabelText(/tanggal/i)).toBeDisabled();
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { inRouter } from '@/test/utils';
import { useSession } from '@/stores/session';
import { PartnerStatementPage } from './PartnerStatementPage';

afterEach(() => useSession.getState().clear());

function renderPage(id: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{inRouter(<PartnerStatementPage id={id} />)}</QueryClientProvider>);
}

const posted = (over: Record<string, unknown>) => ({
  id: 'i1', invoiceNumber: 1, invoiceRef: 'INV/2026/000009', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z',
  dueDate: '2026-07-15T00:00:00.000Z', description: null, status: 'POSTED', subtotal: '500000.0000', taxTotal: '0.0000',
  withholdingTotal: '0.0000', total: '500000.0000', amountPaid: '0.0000', outstanding: '500000.0000', paymentStatus: 'UNPAID', ...over,
});

it('shows the partner header, AR outstanding, and their invoices; queries by partnerId', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER', mustChangePassword: false });
  let invPartner: string | null = null;
  server.use(
    http.get(`${API}/partners/p1`, () =>
      HttpResponse.json({ id: 'p1', code: 'CUST-1', name: 'Toko A', npwp: null, email: null, phone: null, address: null, isCustomer: true, isVendor: false, isActive: true })),
    http.get(`${API}/sales-invoices`, ({ request }) => {
      invPartner = new URL(request.url).searchParams.get('partnerId');
      return HttpResponse.json({ data: [posted({ id: 'i1' }), posted({ id: 'i2', invoiceRef: 'INV/2026/000010', status: 'DRAFT', outstanding: '999.0000' })], total: 2, limit: 200, offset: 0 });
    }),
    http.get(`${API}/payments`, () => HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 })),
  );
  renderPage('p1');

  expect(await screen.findByRole('heading', { name: /CUST-1 · Toko A/ })).toBeInTheDocument();
  expect(await screen.findByText('INV/2026/000009')).toBeInTheDocument();
  // AR outstanding sums POSTED invoices only → 500.000; the DRAFT (+999) is excluded,
  // so the summed-with-draft value must never appear.
  expect((await screen.findAllByText('Rp 500.000')).length).toBeGreaterThanOrEqual(1);
  expect(screen.queryByText('Rp 500.999')).not.toBeInTheDocument();
  expect(invPartner).toBe('p1');
});

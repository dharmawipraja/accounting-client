import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API, openInvoiceFixture } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { PaymentForm } from './PaymentForm';

afterEach(() => useSession.getState().clear());

const accounts = [{ id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null }];
const partners = [{ id: 'p1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }];

function renderForm(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function commonHandlers() {
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
    http.get(`${API}/partners`, () => HttpResponse.json(partners)),
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([openInvoiceFixture()])),
  );
}

it('allocates via Lunasi and posts the RECEIPT payload', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  commonHandlers();
  let posted: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/payments`, async ({ request }) => {
    posted = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'pay9', paymentNumber: null, paymentRef: null, direction: 'RECEIPT', partnerId: 'p1', date: '2026-06-16T00:00:00.000Z', cashAccountId: 'a1', description: null, status: 'DRAFT', total: '1110000.0000', allocations: [{ salesInvoiceId: 'i1', amount: '1110000.0000' }] });
  }));
  const onSaved = vi.fn();
  renderForm(<PaymentForm mode="create" onSaved={onSaved} />);

  await user.click(screen.getByRole('combobox', { name: /pelanggan/i }));
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
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  commonHandlers();
  renderForm(<PaymentForm mode="create" onSaved={vi.fn()} />);
  await user.click(screen.getByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-16');
  await user.click(screen.getByRole('combobox', { name: /akun kas/i }));
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  expect(await screen.findByText(/minimal satu faktur/i)).toBeInTheDocument();
});

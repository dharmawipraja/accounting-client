import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { PartnerSelect } from './PartnerSelect';

afterEach(() => useSession.getState().clear());

function renderSelect(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const partners = [
  { id: 'c1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true },
  { id: 'v1', code: 'VEND-1', name: 'Pemasok B', isCustomer: false, isVendor: true, isActive: true },
  { id: 'x1', code: 'OLD-1', name: 'Nonaktif C', isCustomer: true, isVendor: false, isActive: false },
];

it('lists only active customers when filter=customer and selects by id', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  server.use(http.get(`${API}/partners`, () => HttpResponse.json({ data: partners, total: partners.length, limit: 200, offset: 0 })));
  const onChange = vi.fn();
  renderSelect(<PartnerSelect filter="customer" onChange={onChange} placeholder="Pilih pelanggan" aria-label="Pelanggan" />);
  await user.click(screen.getByRole('combobox', { name: /pelanggan/i }));
  expect(await screen.findByRole('option', { name: /CUST-1.*Toko A/i })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /VEND-1/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /OLD-1/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole('option', { name: /CUST-1.*Toko A/i }));
  expect(onChange).toHaveBeenCalledWith('c1');
});

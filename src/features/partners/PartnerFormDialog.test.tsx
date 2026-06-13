import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { PartnerFormDialog } from './PartnerFormDialog';

afterEach(() => useSession.getState().clear());

function renderDialog(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('requires at least one of customer/vendor', async () => {
  const user = userEvent.setup();
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  renderDialog(<PartnerFormDialog open onOpenChange={vi.fn()} mode="create" />);
  await user.type(screen.getByLabelText(/kode/i), 'CUST-9');
  await user.type(screen.getByLabelText(/nama/i), 'Toko A');
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  expect(await screen.findByText(/pilih minimal satu/i)).toBeInTheDocument();
});

it('creates a partner and calls onOpenChange(false)', async () => {
  const user = userEvent.setup();
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let posted: Record<string, unknown> | null = null;
  server.use(
    http.post(`${API}/partners`, async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ id: 'p9', isActive: true, ...posted });
    }),
  );
  const onOpenChange = vi.fn();
  renderDialog(<PartnerFormDialog open onOpenChange={onOpenChange} mode="create" />);
  await user.type(screen.getByLabelText(/kode/i), 'CUST-9');
  await user.type(screen.getByLabelText(/nama/i), 'Toko A');
  await user.click(screen.getByRole('checkbox', { name: /pelanggan/i }));
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  await waitFor(() => expect(posted).toMatchObject({ code: 'CUST-9', name: 'Toko A', isCustomer: true }));
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
});

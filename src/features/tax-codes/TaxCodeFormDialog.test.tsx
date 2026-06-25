import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { TaxCodeFormDialog } from './TaxCodeFormDialog';

afterEach(() => useSession.getState().clear());

const accounts = [
  { id: 'a1', code: '2-1100', name: 'PPN Keluaran', type: 'LIABILITY', subtype: 'TAX_PAYABLE', normalBalance: 'CREDIT', isPostable: true, isActive: true, parentId: null },
];

function renderDialog(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('submits rate as a fraction and the selected account id', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))));
  let posted: Record<string, unknown> | null = null;
  server.use(
    http.post(`${API}/tax/codes`, async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ id: 't9', isActive: true, ...posted });
    }),
  );
  renderDialog(<TaxCodeFormDialog open onOpenChange={vi.fn()} mode="create" />);
  // Use exact label text: the dialog title "Kode Pajak Baru" also matches /kode/i.
  await user.type(screen.getByLabelText('Kode'), 'PPN-OUT');
  await user.type(screen.getByLabelText('Nama'), 'PPN Keluaran 11%');
  await user.type(screen.getByLabelText(/tarif/i), '11');
  // The kind Select and AccountSelect both expose role="combobox"; AccountSelect has aria-label "Akun Pajak".
  await user.click(screen.getByRole('combobox', { name: /akun pajak/i }));
  await user.click(await screen.findByRole('option', { name: /2-1100.*ppn keluaran/i }));
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ code: 'PPN-OUT', kind: 'PPN_OUTPUT', rate: '0.11', taxAccountId: 'a1' });
});

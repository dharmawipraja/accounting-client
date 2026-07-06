import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API, journalEntryDetailFixture, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { OpeningBalancesDialog } from './OpeningBalancesDialog';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => useSession.getState().clear());

const accounts = [
  { id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null },
];

function renderDialog(onOpenChange = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <OpeningBalancesDialog open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
}

// POST /ledger/opening-balances {date, balances} (ADMIN; Idempotency-Key covered
// by the apiFetch auto-key). Any debit/credit difference is plugged server-side
// to the Saldo Awal equity account, so balance is not required client-side.
it('posts {date, balances} and closes on success', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  server.use(http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))));
  let body: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/ledger/opening-balances`, async ({ request }) => {
    body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...journalEntryDetailFixture(), status: 'POSTED', sourceType: 'OPENING' });
  }));
  const onOpenChange = vi.fn();
  renderDialog(onOpenChange);

  await user.type(await screen.findByLabelText(/per tanggal/i), '2026-01-01');
  await user.click(screen.getAllByRole('combobox', { name: /akun/i })[0]);
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.type(screen.getAllByLabelText('Debit')[0], '5000000');
  await user.click(screen.getByRole('button', { name: /posting saldo awal/i }));

  await waitFor(() => expect(body).toBeTruthy());
  expect(body).toMatchObject({
    date: '2026-01-01',
    balances: [{ accountId: 'a1', debit: '5000000.0000' }],
  });
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
});

it('blocks submit without a date or any complete line', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  server.use(http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))));
  let hit = false;
  server.use(http.post(`${API}/ledger/opening-balances`, () => { hit = true; return HttpResponse.json({}); }));
  renderDialog();
  const submit = await screen.findByRole('button', { name: /posting saldo awal/i });
  expect(submit).toBeDisabled();
  await user.type(screen.getByLabelText(/per tanggal/i), '2026-01-01');
  expect(submit).toBeDisabled(); // still no complete line
  expect(hit).toBe(false);
});

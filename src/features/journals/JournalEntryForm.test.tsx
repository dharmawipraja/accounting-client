import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { inRouter } from '@/test/utils';
import { useSession } from '@/stores/session';
import { JournalEntryForm } from './JournalEntryForm';

afterEach(() => useSession.getState().clear());

const accounts = [
  { id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null },
  { id: 'a2', code: '4-1000', name: 'Pendapatan', type: 'REVENUE', subtype: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, isActive: true, parentId: null },
];

function renderForm(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{inRouter(ui)}</QueryClientProvider>);
}

it('creates a balanced entry: debit + credit across two accounts → posts the payload', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  server.use(http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))));
  let posted: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/ledger/journal-entries`, async ({ request }) => {
    posted = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'je9', entryNumber: null, entryRef: null, fiscalYear: null, date: '2026-06-16T00:00:00.000Z', periodId: null, description: 'Jurnal uji', sourceType: 'MANUAL', sourceId: null, status: 'DRAFT', reversalOfId: null, reversedById: null });
  }));
  const onSaved = vi.fn();
  renderForm(<JournalEntryForm onSaved={onSaved} />);

  await user.type(await screen.findByLabelText(/tanggal/i), '2026-06-16');
  await user.type(screen.getByLabelText(/keterangan/i), 'Jurnal uji');
  const combos = screen.getAllByRole('combobox', { name: /akun/i });
  await user.click(combos[0]);
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.type(screen.getAllByLabelText('Debit')[0], '100000');
  await user.click(screen.getAllByRole('combobox', { name: /akun/i })[1]);
  await user.click(await screen.findByRole('option', { name: /4-1000/i }));
  await user.type(screen.getAllByLabelText('Kredit')[1], '100000');

  const save = screen.getByRole('button', { name: /simpan/i });
  await waitFor(() => expect(save).toBeEnabled());
  await user.click(save);

  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ date: '2026-06-16', description: 'Jurnal uji', lines: [{ accountId: 'a1', debit: '100000.0000' }, { accountId: 'a2', credit: '100000.0000' }] });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

// APPROVER/ADMIN may create-and-post in one call (?post=true); ACCOUNTANT may not
// (the API rejects it with 403), so the button is role-gated away entirely.
it('ADMIN can save-and-post in one call via ?post=true', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN', mustChangePassword: false });
  server.use(http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))));
  let postParam: string | null = null;
  server.use(http.post(`${API}/ledger/journal-entries`, async ({ request }) => {
    postParam = new URL(request.url).searchParams.get('post');
    return HttpResponse.json({ id: 'je9', entryNumber: 4, entryRef: 'JE/2026/000004', fiscalYear: 2026, date: '2026-06-16T00:00:00.000Z', periodId: 'per6', description: 'Jurnal uji', sourceType: 'MANUAL', sourceId: null, status: 'POSTED', reversalOfId: null, reversedById: null });
  }));
  const onSaved = vi.fn();
  renderForm(<JournalEntryForm onSaved={onSaved} />);

  await user.type(await screen.findByLabelText(/tanggal/i), '2026-06-16');
  await user.type(screen.getByLabelText(/keterangan/i), 'Jurnal uji');
  await user.click(screen.getAllByRole('combobox', { name: /akun/i })[0]);
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.type(screen.getAllByLabelText('Debit')[0], '100000');
  await user.click(screen.getAllByRole('combobox', { name: /akun/i })[1]);
  await user.click(await screen.findByRole('option', { name: /4-1000/i }));
  await user.type(screen.getAllByLabelText('Kredit')[1], '100000');

  const saveAndPost = screen.getByRole('button', { name: /simpan & posting/i });
  await waitFor(() => expect(saveAndPost).toBeEnabled());
  await user.click(saveAndPost);

  await waitFor(() => expect(postParam).toBe('true'));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it('ACCOUNTANT does not see the save-and-post button', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  server.use(http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))));
  renderForm(<JournalEntryForm onSaved={vi.fn()} />);
  expect(await screen.findByRole('button', { name: /^simpan$/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /simpan & posting/i })).not.toBeInTheDocument();
});

it('keeps Save disabled while unbalanced', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  server.use(http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))));
  renderForm(<JournalEntryForm onSaved={vi.fn()} />);
  expect(await screen.findByRole('button', { name: /simpan/i })).toBeDisabled();
  await user.click(screen.getAllByRole('combobox', { name: /akun/i })[0]);
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.type(screen.getAllByLabelText('Debit')[0], '100000');
  expect(screen.getByRole('button', { name: /simpan/i })).toBeDisabled();
});

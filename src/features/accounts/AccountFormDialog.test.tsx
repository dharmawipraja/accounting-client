import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { AccountFormDialog } from './AccountFormDialog';
import type { Account } from './schema';

afterEach(() => useSession.getState().clear());

function renderDialog(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

async function pickSubtype(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText(/subtipe/i));
  await user.click(await screen.findByRole('option', { name: /aset lancar/i }));
}

it('auto-derives type + normal balance from the chosen subtype', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let posted: Record<string, unknown> | null = null;
  server.use(
    http.post(`${API}/ledger/accounts`, async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ id: 'a9', isActive: true, parentId: null, ...posted });
    }),
  );
  renderDialog(<AccountFormDialog open onOpenChange={vi.fn()} mode="create" />);
  await user.type(screen.getByLabelText(/kode/i), '1-2000');
  await user.type(screen.getByLabelText(/nama/i), 'Bank');
  await pickSubtype(user);
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ type: 'ASSET', normalBalance: 'DEBIT', subtype: 'CURRENT_ASSET' });
});

it('shows a duplicate-code field error on 409', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.post(`${API}/ledger/accounts`, () =>
      HttpResponse.json({ code: 'CONFLICT', message: 'dup' }, { status: 409 }),
    ),
  );
  renderDialog(<AccountFormDialog open onOpenChange={vi.fn()} mode="create" />);
  await user.type(screen.getByLabelText(/kode/i), '1-1000');
  await user.type(screen.getByLabelText(/nama/i), 'Kas');
  await pickSubtype(user);
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  expect(await screen.findByText(/kode sudah dipakai/i)).toBeInTheDocument();
});

it('shows a required field error for an empty name on submit', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  renderDialog(<AccountFormDialog open onOpenChange={vi.fn()} mode="create" />);
  await user.type(screen.getByLabelText(/kode/i), '1-2000');
  await pickSubtype(user); // leave name empty
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  expect(await screen.findByText(/wajib diisi/i)).toBeInTheDocument();
});

it('edit form shows cash flow category and submits the updated value', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let patched: Record<string, unknown> | null = null;
  server.use(
    http.patch(`${API}/ledger/accounts/:id`, async ({ request }) => {
      patched = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET',
        normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null, ...patched,
      });
    }),
  );
  const account: Account = {
    id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET',
    normalBalance: 'DEBIT', cashFlowCategory: 'NONE', isPostable: true, isActive: true, parentId: null,
  };
  renderDialog(<AccountFormDialog open onOpenChange={vi.fn()} mode="edit" account={account} />);
  // the cash flow category field is visible
  expect(screen.getByLabelText(/kategori arus kas/i)).toBeInTheDocument();
  await user.click(screen.getByLabelText(/kategori arus kas/i));
  await user.click(await screen.findByRole('option', { name: /operasi/i }));
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  await waitFor(() => expect(patched).toBeTruthy());
  expect(patched).toMatchObject({ cashFlowCategory: 'OPERATING' });
});

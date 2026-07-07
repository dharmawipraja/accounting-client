import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { AccountSelect } from './AccountSelect';

afterEach(() => useSession.getState().clear());

function renderSelect(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const accounts = [
  { id: 'h', code: '1-0000', name: 'Aset', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: false, isActive: true, parentId: null },
  { id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null },
  { id: 'a2', code: '1-1100', name: 'Bank', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: false, parentId: null },
];

it('lists only postable + active accounts and selects by id', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN', mustChangePassword: false });
  server.use(http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))));
  const onChange = vi.fn();
  renderSelect(<AccountSelect onChange={onChange} placeholder="Pilih akun" />);

  await user.click(screen.getByRole('combobox'));
  // Kas is postable+active -> present; the header and the inactive Bank are filtered out
  expect(await screen.findByRole('option', { name: /1-1000.*kas/i })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /1-0000/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /bank/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole('option', { name: /1-1000.*kas/i }));
  expect(onChange).toHaveBeenCalledWith('a1');
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { UsersPage } from './UsersPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  useSession.getState().setUser({ id: 'u1', email: 'admin@buku.id', role: 'ADMIN', mustChangePassword: false });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}><UsersPage /></QueryClientProvider>);
}

it('lists users with email and role label', async () => {
  renderPage();
  expect(await screen.findByText('akuntan@buku.id')).toBeInTheDocument();
  expect(screen.getByText('Akuntan')).toBeInTheDocument();
});

it('create flow reveals the temp password', async () => {
  const user = userEvent.setup();
  renderPage();
  await user.click(await screen.findByRole('button', { name: 'Baru' }));
  await user.type(await screen.findByLabelText('Email'), 'x@y.zz');
  await user.type(screen.getByLabelText('Nama'), 'X User');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByText('Temp-abc123')).toBeInTheDocument();
});

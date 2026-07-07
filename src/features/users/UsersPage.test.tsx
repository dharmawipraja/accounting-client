import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API } from '@/test/handlers';
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

it('shows the forbidden message, hides the list, and never fetches /users for a non-admin role', async () => {
  let usersFetched = false;
  server.use(
    http.get(`${API}/users`, () => {
      usersFetched = true;
      return HttpResponse.json({ data: [], total: 0, limit: 20, offset: 0 });
    }),
  );
  useSession.getState().setUser({ id: 'u2', email: 'viewer@buku.id', role: 'VIEWER', mustChangePassword: false });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}><UsersPage /></QueryClientProvider>);
  expect(await screen.findByText('Anda tidak memiliki izin untuk tindakan ini')).toBeInTheDocument();
  expect(screen.queryByText('akuntan@buku.id')).not.toBeInTheDocument();
  // Let any pending query microtasks settle, then assert the fetch never fired (defense-in-depth: the guard hides the UI AND gates the query).
  await waitFor(() => expect(usersFetched).toBe(false));
});

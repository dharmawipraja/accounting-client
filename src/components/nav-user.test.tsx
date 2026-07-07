import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { NavUser } from './nav-user';

afterEach(() => useSession.getState().clear());

function renderNavUser() {
  useSession.getState().setUser({ id: 'u1', email: 'a@b.c', role: 'ADMIN', mustChangePassword: false });
  const qc = new QueryClient();
  const root = createRootRoute({ component: () => <NavUser /> });
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ['/'] }) });
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

it('opens the change-password dialog from the account menu', async () => {
  const user = userEvent.setup();
  renderNavUser();
  await user.click(await screen.findByRole('button', { name: 'Menu akun' }));
  await user.click(await screen.findByRole('menuitem', { name: 'Ubah Kata Sandi' }));
  expect(await screen.findByRole('dialog', { name: 'Ubah Kata Sandi' })).toBeInTheDocument();
});

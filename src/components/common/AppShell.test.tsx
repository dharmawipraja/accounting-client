import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { usePreferences } from '@/stores/preferences';
import { AppShell } from './AppShell';

afterEach(() => {
  useSession.getState().clear();
  usePreferences.setState({ sidebarCollapsed: false });
});

const NAV_PATHS = [
  '/dashboard',
  '/accounts',
  '/partners',
  '/tax-codes',
  '/sales-invoices',
  '/payments',
];

function renderInRouter(ui: React.ReactNode) {
  const root = createRootRoute({ component: () => ui });
  const children = NAV_PATHS.map((path) =>
    createRoute({ getParentRoute: () => root, path, component: () => null }),
  );
  const router = createRouter({
    routeTree: root.addChildren(children),
    history: createMemoryHistory({ initialEntries: ['/dashboard'] }),
  });
  return render(<RouterProvider router={router} />);
}

/** Router topology matching the real app: root → layout(AppShell) → nav routes; root → /login */
function renderWithLoginRoute() {
  const root = createRootRoute({ component: () => <Outlet /> });
  const layout = createRoute({
    getParentRoute: () => root,
    id: '_app',
    component: () => (
      <AppShell>
        <Outlet />
      </AppShell>
    ),
  });
  const navChildren = NAV_PATHS.map((path) =>
    createRoute({ getParentRoute: () => layout, path, component: () => null }),
  );
  const loginRoute = createRoute({
    getParentRoute: () => root,
    path: '/login',
    component: () => <div data-testid="login">Login</div>,
  });
  const router = createRouter({
    routeTree: root.addChildren([layout.addChildren(navChildren), loginRoute]),
    history: createMemoryHistory({ initialEntries: ['/dashboard'] }),
  });
  return render(<RouterProvider router={router} />);
}

it('renders the app name and the current user email', async () => {
  useSession.getState().setUser({ id: '1', email: 'admin@buku.id', role: 'ADMIN' });
  renderInRouter(<AppShell><div>content</div></AppShell>);
  expect(await screen.findByText('Buku')).toBeInTheDocument();
  expect(screen.getByText('admin@buku.id')).toBeInTheDocument();
  expect(screen.getByText('content')).toBeInTheDocument();
});

it('signs out the current device and navigates to /login', async () => {
  useSession.getState().setTokens({ accessToken: 'tok-abc', refreshToken: 'ref-abc' });
  useSession.getState().setUser({ id: '2', email: 'user@buku.id', role: 'VIEWER' });
  let loggedOut = false;
  server.use(
    http.post(`${API}/auth/logout`, () => {
      loggedOut = true;
      return HttpResponse.json({ ok: true });
    }),
  );
  renderWithLoginRoute();

  await userEvent.click(await screen.findByRole('button', { name: 'Menu akun' }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Keluar' }));

  expect(useSession.getState().accessToken).toBeNull();
  await screen.findByTestId('login');
  expect(loggedOut).toBe(true);
});

it('signs out of all devices and navigates to /login', async () => {
  useSession.getState().setTokens({ accessToken: 'tok-abc', refreshToken: 'ref-abc' });
  useSession.getState().setUser({ id: '2', email: 'user@buku.id', role: 'VIEWER' });
  let loggedOutAll = false;
  server.use(
    http.post(`${API}/auth/logout-all`, () => {
      loggedOutAll = true;
      return HttpResponse.json({ ok: true });
    }),
  );
  renderWithLoginRoute();

  await userEvent.click(await screen.findByRole('button', { name: 'Menu akun' }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Keluar dari semua perangkat' }));

  expect(useSession.getState().accessToken).toBeNull();
  await screen.findByTestId('login');
  expect(loggedOutAll).toBe(true);
});

it('toggles the sidebar collapsed state and persists it', async () => {
  useSession.getState().setUser({ id: '1', email: 'admin@buku.id', role: 'ADMIN' });
  renderInRouter(<AppShell><div>content</div></AppShell>);

  const toggle = await screen.findByRole('button', { name: 'Ciutkan menu' });
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(toggle).toHaveAttribute('aria-controls', 'app-sidebar');

  await userEvent.click(toggle);

  expect(usePreferences.getState().sidebarCollapsed).toBe(true);
  const expandBtn = screen.getByRole('button', { name: 'Lebarkan menu' });
  expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
  // labels stay in the DOM when collapsed, so links keep their accessible names
  expect(screen.getByRole('link', { name: /dasbor/i })).toBeInTheDocument();
});

import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { AppShell } from './AppShell';

afterEach(() => useSession.getState().clear());

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

it('renders the app name and the current user email', async () => {
  useSession.getState().setUser({ id: '1', email: 'admin@buku.id', role: 'ADMIN' });
  renderInRouter(<AppShell><div>content</div></AppShell>);
  expect(await screen.findByText('Buku')).toBeInTheDocument();
  expect(screen.getByText('admin@buku.id')).toBeInTheDocument();
  expect(screen.getByText('content')).toBeInTheDocument();
});

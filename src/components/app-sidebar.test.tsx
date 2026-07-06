import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useSession } from '@/stores/session';
import { AppSidebar } from './app-sidebar';

afterEach(() => {
  useSession.getState().clear();
});

// The routes the sidebar links to. Two detail routes exercise the fuzzy/prefix
// rule: the parent nav item must stay active while on a child page.
const LEAF_PATHS = [
  '/dashboard',
  '/sales-invoices',
  '/purchase-bills',
  '/payments',
  '/journals',
  '/approvals',
  '/accounts',
  '/reports',
  '/periods',
  '/partners',
  '/tax-codes',
  '/settings',
  '/audit',
];

function renderSidebar(initialPath: string) {
  const root = createRootRoute({
    component: () => (
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
          <Outlet />
        </SidebarProvider>
      </TooltipProvider>
    ),
  });
  const leaves = LEAF_PATHS.map((path) =>
    createRoute({ getParentRoute: () => root, path, component: () => null }),
  );
  const accountsDetail = createRoute({
    getParentRoute: () => root,
    path: '/accounts/$id',
    component: () => null,
  });
  const router = createRouter({
    routeTree: root.addChildren([...leaves, accountsDetail]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  render(<RouterProvider router={router} />);
}

/** Labels of every sidebar menu button currently marked active. */
function activeLabels() {
  return [...document.querySelectorAll('[data-sidebar="menu-button"]')]
    .filter((b) => b.getAttribute('data-active') === 'true')
    .map((b) => b.textContent?.trim());
}

it('marks the item for the current route active on first render', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@buku.id', role: 'ADMIN' });
  renderSidebar('/journals');
  await waitFor(() => expect(activeLabels()).toEqual(['Jurnal']));
});

it('moves the active highlight to the destination after in-app navigation', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@buku.id', role: 'ADMIN' });
  renderSidebar('/dashboard');
  await waitFor(() => expect(activeLabels()).toEqual(['Dasbor']));

  const jurnal = [...document.querySelectorAll('a')].find(
    (a) => a.textContent?.trim() === 'Jurnal',
  )!;
  await userEvent.click(jurnal);

  await waitFor(() => expect(activeLabels()).toEqual(['Jurnal']));
});

it('keeps the parent item active on a fuzzy-matched detail route', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@buku.id', role: 'ADMIN' });
  renderSidebar('/accounts/some-account-id');
  await waitFor(() => expect(activeLabels()).toEqual(['Bagan Akun']));
});

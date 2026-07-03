import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

/** The sub-page parent routes a page breadcrumb may point at. Registered so <Link> resolves their href. */
const PARENT_PATHS = ['/sales-invoices', '/purchase-bills', '/payments', '/journals', '/reports'];

/**
 * Render a component inside a memory router + QueryClient. Use for anything that
 * renders a TanStack Router <Link> (e.g. a page breadcrumb), which throws without router context.
 */
export function renderWithRouter(ui: ReactNode) {
  const root = createRootRoute({ component: () => ui });
  const children = PARENT_PATHS.map((path) =>
    createRoute({ getParentRoute: () => root, path, component: () => null }),
  );
  const router = createRouter({
    routeTree: root.addChildren(children),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

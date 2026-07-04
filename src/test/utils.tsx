import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

/** Wrap a node in a minimal in-memory router so components that call router
 *  hooks (e.g. useBlocker in the editors) can render in isolation. The node is
 *  the '/' index route's component. */
export function inRouter(ui: ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => ui });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return <RouterProvider router={router} />;
}

export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

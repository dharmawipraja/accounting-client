import { AppProviders } from '@/components/AppProviders'
import { NotFoundBoundary, RouteErrorBoundary } from '@/components/ErrorBoundary'
import { createAuthContext, type AuthContext } from '@/utils/routeAuth'
import { TanstackDevtools } from '@tanstack/react-devtools'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

interface RouterContext {
  auth: AuthContext
}

export const Route = createRootRoute({
  beforeLoad: (): RouterContext => ({
    auth: createAuthContext(),
  }),
  errorComponent: RouteErrorBoundary,
  notFoundComponent: NotFoundBoundary,
  component: () => (
    <AppProviders>
      <Outlet />
      {import.meta.env.DEV && (
        <TanstackDevtools
          config={{
            position: 'bottom-left',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      )}
    </AppProviders>
  ),
})

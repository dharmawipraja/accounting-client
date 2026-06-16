import { Outlet, createRootRoute } from '@tanstack/react-router';
import { ErrorState } from '@/components/common/ErrorState';
import { NotFound } from '@/components/common/NotFound';

export const Route = createRootRoute({
  component: () => <Outlet />,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <ErrorState error={error} />
    </div>
  ),
  notFoundComponent: () => <NotFound />,
});

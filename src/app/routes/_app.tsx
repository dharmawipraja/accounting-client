import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/app-shell';
import { ErrorState } from '@/components/common/ErrorState';
import { NotFound } from '@/components/common/NotFound';
import { requireAuth } from '@/features/auth/guard';

export const Route = createFileRoute('/_app')({
  beforeLoad: () => requireAuth(),
  component: function AppLayout() {
    return (
      <AppShell>
        <Outlet />
      </AppShell>
    );
  },
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="p-6">
        <ErrorState error={error} />
      </div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <NotFound />
    </AppShell>
  ),
});

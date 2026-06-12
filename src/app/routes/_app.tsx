import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/common/AppShell';
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
});

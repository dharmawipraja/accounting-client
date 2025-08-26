import { AppLayout } from '@/components/AppLayout'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { requireAuth } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireAuth(),
  component: () => (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  ),
})

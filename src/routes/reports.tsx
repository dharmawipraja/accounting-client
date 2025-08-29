import { AppLayout } from '@/components/AppLayout'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { requireAuth } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/reports')({
  beforeLoad: requireAuth(),
  component: () => (
    <AppLayout>
      <ReportsPage />
    </AppLayout>
  ),
})

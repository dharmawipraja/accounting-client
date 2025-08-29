import { AppLayout } from '@/components/AppLayout'
import { PostingDashboardPage } from '@/pages/posting/PostingDashboardPage'
import { requireAuth } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posting/')({
  beforeLoad: requireAuth(),
  component: () => (
    <AppLayout>
      <PostingDashboardPage />
    </AppLayout>
  ),
})

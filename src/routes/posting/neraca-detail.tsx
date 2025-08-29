import { AppLayout } from '@/components/AppLayout'
import { NeracaDetailPostingPage } from '@/pages/posting/NeracaDetailPostingPage'
import { requireAuth } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posting/neraca-detail')({
  beforeLoad: requireAuth(),
  component: () => (
    <AppLayout>
      <NeracaDetailPostingPage />
    </AppLayout>
  ),
})

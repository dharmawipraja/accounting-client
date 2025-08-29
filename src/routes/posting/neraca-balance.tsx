import { AppLayout } from '@/components/AppLayout'
import { NeracaBalancePostingPage } from '@/pages/posting/NeracaBalancePostingPage'
import { requireAuth } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posting/neraca-balance')({
  beforeLoad: requireAuth(),
  component: () => (
    <AppLayout>
      <NeracaBalancePostingPage />
    </AppLayout>
  ),
})

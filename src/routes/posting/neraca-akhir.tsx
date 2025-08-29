import { AppLayout } from '@/components/AppLayout'
import { NeracaAkhirPostingPage } from '@/pages/posting/NeracaAkhirPostingPage'
import { requireAuth } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posting/neraca-akhir')({
  beforeLoad: requireAuth(),
  component: () => (
    <AppLayout>
      <NeracaAkhirPostingPage />
    </AppLayout>
  ),
})

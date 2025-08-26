import { AppLayout } from '@/components/AppLayout'
import { LedgersListPage } from '@/pages/ledgers/LedgersListPage'
import { requireRoles } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/ledgers/')({
  beforeLoad: requireRoles(['ADMIN', 'MANAJER', 'AKUNTAN']),
  component: () => (
    <AppLayout>
      <LedgersListPage />
    </AppLayout>
  ),
})

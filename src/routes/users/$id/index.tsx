import { AppLayout } from '@/components/AppLayout'
import { UserDetailPage } from '@/pages/users/UserDetailPage'
import { requireRoles } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/$id/')({
  beforeLoad: ({ params }) =>
    requireRoles(['ADMIN', 'MANAJER'], true, params.id)(),
  component: () => (
    <AppLayout>
      <UserDetailPage />
    </AppLayout>
  ),
})

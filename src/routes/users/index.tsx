import { AppLayout } from '@/components/AppLayout'
import UserListPage from '@/pages/users/UserListPage'
import { requireRoles } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/')({
  beforeLoad: requireRoles(['ADMIN', 'MANAJER']),
  component: () => (
    <AppLayout>
      <UserListPage />
    </AppLayout>
  ),
})

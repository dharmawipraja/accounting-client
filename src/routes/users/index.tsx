import { ProtectedRoute } from '@/components/ProtectedRoute'
import UserListPage from '@/pages/users/UserListPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/')({
  component: UsersComponent,
})

function UsersComponent() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER']}>
      <UserListPage />
    </ProtectedRoute>
  )
}

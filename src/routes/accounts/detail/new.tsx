import { ProtectedRoute } from '@/components/ProtectedRoute'
import { CreateAccountDetailPage } from '@/pages/accounts/CreateAccountDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/accounts/detail/new')({
  component: CreateAccountDetailComponent,
})

function CreateAccountDetailComponent() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER', 'AKUNTAN']}>
      <CreateAccountDetailPage />
    </ProtectedRoute>
  )
}

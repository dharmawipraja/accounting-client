import { ProtectedRoute } from '@/components/ProtectedRoute'
import { EditAccountDetailPage } from '@/pages/accounts/EditAccountDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/accounts/detail/$id/edit')({
  component: EditAccountDetailComponent,
})

function EditAccountDetailComponent() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER', 'AKUNTAN']}>
      <EditAccountDetailPage />
    </ProtectedRoute>
  )
}

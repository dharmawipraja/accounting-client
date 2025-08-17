import { ProtectedRoute } from '@/components/ProtectedRoute'
import { EditUserPage } from '@/pages/users/EditUserPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/$id/edit')({
  component: EditUserComponent,
})

function EditUserComponent() {
  const { id } = Route.useParams()

  return (
    <ProtectedRoute
      requiredRoles={['ADMIN', 'MANAJER']}
      allowOwnAccess={true}
      targetUserId={id}
    >
      <EditUserPage />
    </ProtectedRoute>
  )
}

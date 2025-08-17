import { ProtectedRoute } from '@/components/ProtectedRoute'
import { EditAccountGeneralPage } from '@/pages/accounts/EditAccountGeneralPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/accounts/general/$id/edit')({
  component: EditAccountGeneralComponent,
})

function EditAccountGeneralComponent() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER', 'AKUNTAN']}>
      <EditAccountGeneralPage />
    </ProtectedRoute>
  )
}

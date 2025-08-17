import { ProtectedRoute } from '@/components/ProtectedRoute'
import { CreateAccountGeneralPage } from '@/pages/accounts/CreateAccountGeneralPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/accounts/general/new')({
  component: CreateAccountGeneralComponent,
})

function CreateAccountGeneralComponent() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER', 'AKUNTAN']}>
      <CreateAccountGeneralPage />
    </ProtectedRoute>
  )
}

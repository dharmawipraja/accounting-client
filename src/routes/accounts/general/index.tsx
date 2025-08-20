import { ProtectedRoute } from '@/components/ProtectedRoute'
import AccountsGeneralListPage from '@/pages/accounts/AccountsGeneralListPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/accounts/general/')({
  component: AccountsGeneralComponent,
})

function AccountsGeneralComponent() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER', 'AKUNTAN']}>
      <AccountsGeneralListPage />
    </ProtectedRoute>
  )
}

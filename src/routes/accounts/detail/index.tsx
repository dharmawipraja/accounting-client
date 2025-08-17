import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AccountsDetailListPage } from '@/pages/accounts/AccountsDetailListPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/accounts/detail/')({
  component: AccountsDetailComponent,
})

function AccountsDetailComponent() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER', 'AKUNTAN']}>
      <AccountsDetailListPage />
    </ProtectedRoute>
  )
}

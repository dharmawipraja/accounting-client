import { BulkLedgerForm } from '@/components/forms/BulkLedgerForm'
import Header from '@/components/Header'
import { ErrorState } from '@/components/ui/error-state'
import type { RootState } from '@/store'
import { canManageLedgers } from '@/utils/rolePermissions'
import { createFileRoute } from '@tanstack/react-router'
import { useSelector } from 'react-redux'

function LedgerKasKeluarPage() {
  const user = useSelector((state: RootState) => state.auth.user)

  const canManage = user ? canManageLedgers(user.role) : false

  if (!canManage) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <ErrorState
            type="generic"
            title="Access Denied"
            message="You don't have permission to create ledger entries."
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <BulkLedgerForm ledgerType="KAS_KELUAR" />
      </main>
    </div>
  )
}

export const Route = createFileRoute('/ledgers/kas-keluar')({
  component: LedgerKasKeluarPage,
})

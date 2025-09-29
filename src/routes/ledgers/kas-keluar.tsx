import { ProtectedRoute } from '@/components/ProtectedRoute'
import { BulkLedgerForm } from '@/components/forms/BulkLedgerForm'
import { createFileRoute } from '@tanstack/react-router'

function LedgerKasKeluarPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER', 'AKUNTAN']}>
      <BulkLedgerForm
        defaultLedgerType="KAS_KELUAR"
        isLedgerTypeReadonly={true}
      />
    </ProtectedRoute>
  )
}

export const Route = createFileRoute('/ledgers/kas-keluar')({
  component: LedgerKasKeluarPage,
})

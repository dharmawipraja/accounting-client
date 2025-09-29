import { ProtectedRoute } from '@/components/ProtectedRoute'
import { BulkLedgerForm } from '@/components/forms/BulkLedgerForm'
import { createFileRoute } from '@tanstack/react-router'

function LedgerKasMasukPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER', 'AKUNTAN']}>
      <BulkLedgerForm
        defaultLedgerType="KAS_MASUK"
        isLedgerTypeReadonly={true}
      />
    </ProtectedRoute>
  )
}

export const Route = createFileRoute('/ledgers/kas-masuk')({
  component: LedgerKasMasukPage,
})

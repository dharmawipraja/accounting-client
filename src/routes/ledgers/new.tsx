import { ProtectedRoute } from '@/components/ProtectedRoute'
import { BulkLedgerForm } from '@/components/forms/BulkLedgerForm'
import { createFileRoute } from '@tanstack/react-router'

function LedgerNewPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER', 'AKUNTAN']}>
      <BulkLedgerForm ledgerType="KAS_MASUK" />
    </ProtectedRoute>
  )
}

export const Route = createFileRoute('/ledgers/new')({
  component: LedgerNewPage,
})

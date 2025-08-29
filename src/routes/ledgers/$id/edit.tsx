import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { useLedgerQuery } from '@/hooks/useLedgersQuery'
import type { RootState } from '@/store'
import { canManageLedgers } from '@/utils/rolePermissions'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useSelector } from 'react-redux'

function LedgerEditPage() {
  const { id } = Route.useParams()
  const router = useRouter()
  const user = useSelector((state: RootState) => state.auth.user)

  const canManage = user ? canManageLedgers(user.role) : false
  const { data: ledger, isLoading, error } = useLedgerQuery(id)

  if (!canManage) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container px-4 py-6 mx-auto sm:px-6 lg:px-8">
          <ErrorState
            type="generic"
            title="Access Denied"
            message="You don't have permission to edit ledger entries."
          />
        </main>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container px-4 py-6 mx-auto sm:px-6 lg:px-8">
          <LoadingState />
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container px-4 py-6 mx-auto sm:px-6 lg:px-8">
          <ErrorState
            type="server"
            title="Failed to Load Ledger"
            message="There was an error loading the ledger entry."
          />
        </main>
      </div>
    )
  }

  if (!ledger?.data) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container px-4 py-6 mx-auto sm:px-6 lg:px-8">
          <ErrorState
            type="notFound"
            title="Ledger Entry Not Found"
            message="The requested ledger entry could not be found."
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-3 py-4 mx-auto sm:px-6 lg:px-8">
        <div className="mb-4 space-y-3 sm:mb-6">
          <Button
            variant="ghost"
            onClick={() =>
              router.navigate({ to: '/ledgers/$id', params: { id } })
            }
            className="hover:bg-gray-100 md:hidden"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Ledger Details
          </Button>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
              Edit Ledger Entry
            </h1>
            <p className="text-sm text-gray-600 sm:text-base">
              Update the ledger entry information
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Ledger Entry Form</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center">
              <p className="mb-4 text-gray-500">
                Ledger entry edit form is under development
              </p>
              <p className="text-sm text-gray-400">
                This feature will allow you to edit existing ledger entries with
                proper validation.
              </p>
              <div className="p-4 mt-6 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">
                  <strong>Current Entry:</strong> {ledger.data.referenceNumber}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Amount:</strong>{' '}
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(ledger.data.amount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export const Route = createFileRoute('/ledgers/$id/edit')({
  component: () => (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER', 'AKUNTAN']}>
      <LedgerEditPage />
    </ProtectedRoute>
  ),
})

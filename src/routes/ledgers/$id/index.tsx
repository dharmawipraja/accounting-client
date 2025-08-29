import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { useLedgerQuery } from '@/hooks/useLedgersQuery'
import type { RootState } from '@/store'
import { canManageLedgers } from '@/utils/rolePermissions'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Building2, Calendar, Edit, Hash } from 'lucide-react'
import { useSelector } from 'react-redux'

function LedgerDetailPage() {
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
            message="You don't have permission to view ledger details."
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

  const ledgerData = ledger.data

  const getLedgerTypeBadge = (type: string) => {
    switch (type) {
      case 'KAS_MASUK':
        return (
          <Badge
            variant="outline"
            className="text-green-700 border-green-200 bg-green-50"
          >
            Cash In
          </Badge>
        )
      case 'KAS_KELUAR':
        return (
          <Badge
            variant="outline"
            className="text-red-700 border-red-200 bg-red-50"
          >
            Cash Out
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getPostingStatusBadge = (status: string) => {
    switch (status) {
      case 'POSTED':
        return (
          <Badge
            variant="outline"
            className="text-green-700 border-green-200 bg-green-50"
          >
            Posted
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge
            variant="outline"
            className="text-yellow-700 border-yellow-200 bg-yellow-50"
          >
            Pending
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'DEBIT':
        return (
          <Badge
            variant="outline"
            className="text-blue-700 border-blue-200 bg-blue-50"
          >
            Debit
          </Badge>
        )
      case 'CREDIT':
        return (
          <Badge
            variant="outline"
            className="text-purple-700 border-purple-200 bg-purple-50"
          >
            Credit
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-6 mx-auto sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.navigate({ to: '/ledgers' })}
            className="mb-4 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Ledgers
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Ledger Entry Details
              </h1>
              <p className="text-gray-600">
                View and manage ledger entry information
              </p>
            </div>
            <Button
              onClick={() =>
                router.navigate({ to: '/ledgers/$id/edit', params: { id } })
              }
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Entry
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Entry Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Reference Number
                  </label>
                  <p className="mt-1 text-lg font-medium">
                    {ledgerData.referenceNumber}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Date
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-lg font-medium">
                      {new Date(ledgerData.ledgerDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Amount
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-medium">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(ledgerData.amount)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Ledger Type
                  </label>
                  <div className="mt-1">
                    {getLedgerTypeBadge(ledgerData.ledgerType)}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Transaction Type
                  </label>
                  <div className="mt-1">
                    {getTransactionTypeBadge(ledgerData.transactionType)}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Posting Status
                  </label>
                  <div className="mt-1">
                    {getPostingStatusBadge(ledgerData.postingStatus)}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="text-sm font-medium text-gray-500">
                  Description
                </label>
                <p className="mt-1 text-gray-900">{ledgerData.description}</p>
              </div>
            </CardContent>
          </Card>

          {(ledgerData.accountDetail || ledgerData.accountGeneral) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {ledgerData.accountDetail && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Account Detail
                      </label>
                      <p className="mt-1 font-medium">
                        {ledgerData.accountDetail.accountNumber}
                      </p>
                      <p className="text-gray-600">
                        {ledgerData.accountDetail.accountName}
                      </p>
                    </div>
                  )}

                  {ledgerData.accountGeneral && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Account General
                      </label>
                      <p className="mt-1 font-medium">
                        {ledgerData.accountGeneral.accountNumber}
                      </p>
                      <p className="text-gray-600">
                        {ledgerData.accountGeneral.accountName}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Audit Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Created At
                  </label>
                  <p className="mt-1">
                    {new Date(ledgerData.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Updated At
                  </label>
                  <p className="mt-1">
                    {new Date(ledgerData.updatedAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Created By
                  </label>
                  <p className="mt-1">{ledgerData.createdBy}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Updated By
                  </label>
                  <p className="mt-1">{ledgerData.updatedBy}</p>
                </div>

                {ledgerData.postingAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Posted At
                    </label>
                    <p className="mt-1">
                      {new Date(ledgerData.postingAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export const Route = createFileRoute('/ledgers/$id/')({
  component: () => (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER', 'AKUNTAN']}>
      <LedgerDetailPage />
    </ProtectedRoute>
  ),
})

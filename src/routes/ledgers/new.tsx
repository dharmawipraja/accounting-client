import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import type { RootState } from '@/store'
import { canManageLedgers } from '@/utils/rolePermissions'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useSelector } from 'react-redux'

function LedgerNewPage() {
  const router = useRouter()
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
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.navigate({ to: '/ledgers' })}
            className="mb-4 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Ledgers
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Create New Ledger Entry
          </h1>
          <p className="text-gray-600">Add a new entry to the general ledger</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ledger Entry Form</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                Ledger entry form is under development
              </p>
              <p className="text-sm text-gray-400">
                This feature will allow you to create new ledger entries with
                proper validation and account mapping.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export const Route = createFileRoute('/ledgers/new')({
  component: LedgerNewPage,
})

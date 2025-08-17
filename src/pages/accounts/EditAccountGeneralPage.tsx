import Header from '@/components/Header'
import { AccountGeneralForm } from '@/components/forms/AccountGeneralForm'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { useAccountGeneralByIdQuery } from '@/hooks/useAccountsQuery'
import { useAuth } from '@/hooks/useAuth'
import { canManageAccounts } from '@/utils/rolePermissions'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function EditAccountGeneralPage() {
  const navigate = useNavigate()
  const { id } = useParams({ from: '/accounts/general/$id/edit' })
  const { user } = useAuth()

  const {
    data: account,
    isLoading,
    isError,
    error,
    refetch,
  } = useAccountGeneralByIdQuery(id)

  useEffect(() => {
    if (!canManageAccounts(user?.role)) {
      toast.error('You do not have permission to edit accounts')
      navigate({ to: '/accounts/general' })
    }
  }, [user?.role, navigate])

  if (!canManageAccounts(user?.role)) {
    return null
  }

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <LoadingState message="Loading account details..." />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <ErrorState
            type="server"
            title="Error Loading Account"
            message={error?.message || 'Failed to load account details.'}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <ErrorState
            type="notFound"
            title="Account Not Found"
            message="The requested account could not be found."
            action={{
              label: 'Go Back to Accounts',
              onClick: () => navigate({ to: '/accounts/general' }),
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header />
      <AccountGeneralForm mode="edit" account={account} />
    </div>
  )
}

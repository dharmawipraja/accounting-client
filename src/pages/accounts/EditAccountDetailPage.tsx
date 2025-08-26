import { AccountDetailForm } from '@/components/forms/AccountDetailForm'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { useAccountDetailByIdQuery } from '@/hooks/useAccountsQuery'
import { useAuth } from '@/hooks/useAuth'
import { canManageAccounts } from '@/utils/rolePermissions'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function EditAccountDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams({ from: '/accounts/detail/$id/edit' })
  const { user } = useAuth()

  const {
    data: account,
    isLoading,
    isError,
    error,
    refetch,
  } = useAccountDetailByIdQuery(id)

  useEffect(() => {
    if (!canManageAccounts(user?.role)) {
      toast.error('You do not have permission to edit accounts')
      navigate({ to: '/accounts/detail' })
    }
  }, [user?.role, navigate])

  if (!canManageAccounts(user?.role)) {
    return null
  }

  if (isLoading) {
    return (
      <div>
        <div className="container px-4 py-8 mx-auto">
          <LoadingState message="Loading account details..." />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <div className="container px-4 py-8 mx-auto">
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
        <div className="container px-4 py-8 mx-auto">
          <ErrorState
            type="notFound"
            title="Account Not Found"
            message="The requested account could not be found."
            onRetry={() => navigate({ to: '/accounts/detail' })}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <AccountDetailForm mode="edit" account={account.data} />
    </div>
  )
}

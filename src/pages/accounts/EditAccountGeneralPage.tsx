import { AccountGeneralForm } from '@/components/forms/AccountGeneralForm'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { useAccountGeneralByIdQuery } from '@/hooks/useAccountsQuery'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { canManageAccounts } from '@/utils/rolePermissions'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function EditAccountGeneralPage() {
  const navigate = useNavigate()
  const { id } = useParams({ from: '/accounts/general/$id/edit' })
  const { user } = useAuth()
  const { t } = useTranslation()

  const {
    data: account,
    isLoading,
    isError,
    error,
    refetch,
  } = useAccountGeneralByIdQuery(id)

  useEffect(() => {
    if (!canManageAccounts(user?.role)) {
      toast.error(t('errors.permissionDeniedEditAccounts'))
      navigate({ to: '/accounts/general' })
    }
  }, [user?.role, navigate, t])

  if (!canManageAccounts(user?.role)) {
    return null
  }

  if (isLoading) {
    return (
      <div>
        <div className="container px-4 py-8 mx-auto">
          <LoadingState message={t('errors.loadingAccountDetails')} />
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
            title={t('errors.errorLoadingAccount')}
            message={error?.message || t('errors.failedToLoadAccountDetails')}
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
            title={t('errors.accountNotFound')}
            message={t('errors.accountNotFoundMessage')}
            onRetry={() => navigate({ to: '/accounts/general' })}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <AccountGeneralForm mode="edit" account={account.data} />
    </div>
  )
}

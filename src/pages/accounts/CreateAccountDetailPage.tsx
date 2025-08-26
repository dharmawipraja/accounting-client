import { AccountDetailForm } from '@/components/forms/AccountDetailForm'
import { useAuth } from '@/hooks/useAuth'
import { canManageAccounts } from '@/utils/rolePermissions'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function CreateAccountDetailPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (!canManageAccounts(user?.role)) {
      toast.error('You do not have permission to create accounts')
      navigate({ to: '/accounts/detail' })
    }
  }, [user?.role, navigate])

  if (!canManageAccounts(user?.role)) {
    return null
  }

  return (
    <div>
      <AccountDetailForm mode="create" />
    </div>
  )
}

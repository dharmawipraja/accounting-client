import Header from '@/components/Header'
import { AccountGeneralForm } from '@/components/forms/AccountGeneralForm'
import { useAuth } from '@/hooks/useAuth'
import { canManageAccounts } from '@/utils/rolePermissions'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function CreateAccountGeneralPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (!canManageAccounts(user?.role)) {
      toast.error('You do not have permission to create accounts')
      navigate({ to: '/accounts/general' })
    }
  }, [user?.role, navigate])

  if (!canManageAccounts(user?.role)) {
    return null
  }

  return (
    <div>
      <Header />
      <AccountGeneralForm mode="create" />
    </div>
  )
}

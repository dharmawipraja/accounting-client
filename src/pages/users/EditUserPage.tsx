import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { UserForm } from '@/components/users/UserForm'
import { useUserQuery } from '@/hooks/useUsersQuery'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

export function EditUserPage() {
  const navigate = useNavigate()
  const { id } = useParams({ from: '/users/$id/edit' })

  const {
    data: userResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useUserQuery(id)

  const user = userResponse?.data

  const handleSuccess = () => {
    navigate({ to: '/users' })
  }

  const handleCancel = () => {
    navigate({ to: '/users' })
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-3 py-4 mx-auto sm:px-6 lg:px-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/users' })}
              className="flex items-center space-x-1 self-start md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Users</span>
            </Button>
          </div>

          {isLoading ? (
            <LoadingState message="Loading user data..." />
          ) : isError ? (
            <ErrorState
              type="server"
              title="Error Loading User"
              message={error?.message || 'Failed to load user data.'}
              onRetry={() => refetch()}
              isRetrying={isLoading}
            />
          ) : !user ? (
            <ErrorState
              type="notFound"
              title="User Not Found"
              message="The requested user could not be found."
            />
          ) : (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
                  Edit User
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Update user information and permissions
                </p>
              </div>

              <UserForm
                user={user}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </>
          )}
        </div>
      </main>
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { UserForm } from '@/components/users/UserForm'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

export function CreateUserPage() {
  const navigate = useNavigate()

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

          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
              Create User
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Add a new user to the system with appropriate permissions
            </p>
          </div>

          <UserForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </main>
    </div>
  )
}

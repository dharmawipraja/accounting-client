import Header from '@/components/Header'
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
      <Header />
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/users' })}
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Users</span>
            </Button>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create User</h1>
            <p className="text-muted-foreground">
              Add a new user to the system with appropriate permissions
            </p>
          </div>

          <UserForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </main>
    </div>
  )
}

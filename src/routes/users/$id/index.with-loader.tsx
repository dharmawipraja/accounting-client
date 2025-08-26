import { AppLayout } from '@/components/AppLayout'
import { UserDetailPage } from '@/pages/users/UserDetailPage'
import { userService } from '@/services/users'
import { requireRoles } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users/$id/index/with-loader')({
  beforeLoad: ({ params }) => 
    requireRoles(['ADMIN', 'MANAJER'], true, params.id)(),
  
  // Load user data before rendering the component
  loader: async ({ params }) => {
    const response = await userService.getUserById(params.id)
    if (!response.success) {
      throw new Error(response.message || 'Failed to load user')
    }
    return {
      user: response.data
    }
  },
  
  // Handle pending UI while loader runs
  pendingComponent: () => (
    <AppLayout>
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading user...</p>
        </div>
      </div>
    </AppLayout>
  ),
  
  component: () => (
    <AppLayout>
      <UserDetailPage />
    </AppLayout>
  ),
})

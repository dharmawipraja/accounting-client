import { AppLayout } from '@/components/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { redirectIfAuthenticated } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
  beforeLoad: redirectIfAuthenticated(),
  component: () => (
    <AppLayout>
      <LoginPage />
    </AppLayout>
  ),
})

import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '../components/common/ProtectedRoute'
import { DashboardPage } from '../pages/dashboard/DashboardPage'

export const Route = createFileRoute('/dashboard')({
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
})

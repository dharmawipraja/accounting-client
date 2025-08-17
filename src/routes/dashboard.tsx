import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
})

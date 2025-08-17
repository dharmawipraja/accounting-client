import { LoginPage } from '@/pages/auth/LoginPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})

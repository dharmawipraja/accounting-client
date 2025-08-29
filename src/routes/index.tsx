import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    // Redirect based on authentication status
    if (context.auth.isAuthenticated) {
      throw redirect({
        to: '/dashboard',
        replace: true,
      })
    } else {
      throw redirect({
        to: '/auth/login',
        replace: true,
      })
    }
  },
})

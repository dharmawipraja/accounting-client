import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_CONFIG } from '@/constants'
import { useAuth } from '@/hooks/useAuth'
import type { LoginPayload } from '@/types'
import { validatePassword, validateUsername } from '@/utils/validation'
import { Navigate } from '@tanstack/react-router'
import React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface LoginFormData {
  username: string
  password: string
}

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>()

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (data: LoginFormData) => {
    // Validate form data
    const usernameError = validateUsername(data.username)
    const passwordError = validatePassword(data.password)

    if (usernameError || passwordError) {
      toast.error('Please check your input and try again.')
      return
    }

    const payload: LoginPayload = {
      username: data.username.trim(),
      password: data.password,
    }

    const result = await login(payload)
    if (!result.success) {
      toast.error(result.message || 'Login failed. Please try again.')
    } else {
      toast.success('Login successful!')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 mb-4">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <CardTitle className="text-3xl font-extrabold text-gray-900">
              Sign in to {APP_CONFIG.NAME}
            </CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    {...register('username', {
                      required: 'Username is required',
                      minLength: {
                        value: 3,
                        message: 'Username must be at least 3 characters',
                      },
                      pattern: {
                        value: /^[a-zA-Z0-9_-]+$/,
                        message:
                          'Username can only contain letters, numbers, underscores, and hyphens',
                      },
                    })}
                    type="text"
                    placeholder="Enter your username"
                    disabled={isSubmitting || isLoading}
                    autoComplete="username"
                    required
                  />
                  {errors.username && (
                    <p className="text-sm text-red-600">
                      {errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                      },
                    })}
                    type="password"
                    placeholder="Enter your password"
                    disabled={isSubmitting || isLoading}
                    autoComplete="current-password"
                    required
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </div>

              <div className="text-center text-sm text-gray-600">
                <p>Contact your administrator for account access</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

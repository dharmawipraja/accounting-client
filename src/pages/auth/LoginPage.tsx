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
import { BookOpen, Eye, EyeOff, Lock, Shield, User } from 'lucide-react'
import React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface LoginFormData {
  username: string
  password: string
}

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth()
  const [showPassword, setShowPassword] = React.useState(false)

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
    <div className="flex items-center justify-center min-h-screen px-3 py-8 bg-gradient-surface sm:px-6 sm:py-12 lg:px-8">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute rounded-full top-1/4 left-1/4 w-72 h-72 bg-primary/5 blur-3xl"></div>
          <div className="absolute rounded-full bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 blur-3xl"></div>
        </div>

        <Card className="glass shadow-floating animate-fade-in-scale">
          <CardHeader className="space-y-6 text-center">
            {/* Logo */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-2xl bg-gradient-primary shadow-elegant">
              <BookOpen className="w-8 h-8 text-primary-foreground" />
            </div>

            <div className="space-y-1 sm:space-y-2">
              <CardTitle className="text-2xl font-bold text-foreground sm:text-3xl">
                Welcome to {APP_CONFIG.NAME}
              </CardTitle>
              <CardDescription className="text-base sm:text-lg">
                Sign in to access your accounting dashboard
              </CardDescription>
            </div>

            {/* Security badge */}
            <div className="inline-flex items-center px-4 py-2 space-x-2 text-sm rounded-full bg-primary/5">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-medium text-primary">
                Secure & Encrypted
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                {/* Username Field */}
                <div className="form-section">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Username
                  </Label>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      className="h-12 py-3 pl-10 pr-4 text-base"
                      {...register('username', {
                        required: 'Username is required',
                        minLength: {
                          value: 3,
                          message: 'Username must be at least 3 characters',
                        },
                      })}
                    />
                  </div>
                  {errors.username && (
                    <p className="mt-2 text-sm text-destructive">
                      {errors.username.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="form-section">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="h-12 py-3 pl-10 pr-12 text-base"
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters',
                        },
                      })}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 transition-colors text-muted-foreground hover:text-foreground" />
                      ) : (
                        <Eye className="w-5 h-5 transition-colors text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full h-12 text-base font-medium transition-all bg-gradient-primary hover:opacity-90 shadow-elegant hover:shadow-floating"
              >
                {isSubmitting || isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 rounded-full border-primary-foreground border-t-transparent animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Additional Info */}
            <div className="pt-6 space-y-4 border-t border-border/50">
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Need help? Contact your system administrator
                </p>
                <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                  <span>Version {APP_CONFIG.VERSION}</span>
                  <span>•</span>
                  <span>{APP_CONFIG.ENVIRONMENT}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

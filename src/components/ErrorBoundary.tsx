import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from 'lucide-react'
import React from 'react'

interface ErrorBoundaryProps {
  error: Error
  reset: () => void
  info?: { componentStack?: string }
}

export const RouteErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  error,
  reset,
}) => {
  const router = useRouter()

  const handleGoHome = () => {
    router.navigate({ to: '/' })
  }

  const handleGoBack = () => {
    router.history.back()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-destructive">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            {import.meta.env.DEV ? (
              <div className="space-y-2">
                <p className="font-medium">{error.message}</p>
                <details className="text-xs">
                  <summary className="cursor-pointer hover:text-foreground">
                    Show error details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-left overflow-x-auto">
                    {error.stack}
                  </pre>
                </details>
              </div>
            ) : (
              <p>An unexpected error occurred. Please try again.</p>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={reset} variant="default" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleGoBack} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={handleGoHome} variant="ghost" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const NotFoundBoundary: React.FC = () => {
  const router = useRouter()

  const handleGoHome = () => {
    router.navigate({ to: '/' })
  }

  const handleGoBack = () => {
    router.history.back()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-6xl font-bold text-muted-foreground mb-2">404</div>
          <CardTitle>Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button onClick={handleGoBack} variant="default" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'card' | 'inline' | 'overlay'
}

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  variant = 'card',
}: LoadingStateProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          spinner: 'h-6 w-6',
          text: 'text-sm',
          padding: 'py-8',
        }
      case 'lg':
        return {
          spinner: 'h-12 w-12',
          text: 'text-lg',
          padding: 'py-16',
        }
      default:
        return {
          spinner: 'h-8 w-8',
          text: 'text-base',
          padding: 'py-12',
        }
    }
  }

  const classes = getSizeClasses()

  const content = (
    <div
      className={`flex flex-col items-center justify-center ${classes.padding}`}
    >
      <Loader2
        className={`${classes.spinner} animate-spin text-primary mb-4`}
      />
      <p className={`${classes.text} text-muted-foreground font-medium`}>
        {message}
      </p>
    </div>
  )

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="shadow-lg">
          <CardContent className="p-8">{content}</CardContent>
        </Card>
      </div>
    )
  }

  if (variant === 'inline') {
    return content
  }

  return (
    <Card>
      <CardContent>{content}</CardContent>
    </Card>
  )
}

// Skeleton loading component for table rows
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: columns }, (_, j) => (
            <td key={j} className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

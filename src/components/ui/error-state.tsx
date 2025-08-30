import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslation } from '@/hooks/useTranslation'
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  isRetrying?: boolean
  type?: 'network' | 'server' | 'notFound' | 'generic'
}

export function ErrorState({
  title,
  message,
  onRetry,
  isRetrying = false,
  type = 'generic',
}: ErrorStateProps) {
  const { t } = useTranslation()

  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: <WifiOff className="h-16 w-16 text-red-400" />,
          defaultTitle: t('errorState.network.title'),
          defaultMessage: t('errorState.network.message'),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        }
      case 'server':
        return {
          icon: <AlertCircle className="h-16 w-16 text-orange-400" />,
          defaultTitle: t('errorState.server.title'),
          defaultMessage: t('errorState.server.message'),
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
        }
      case 'notFound':
        return {
          icon: <AlertCircle className="h-16 w-16 text-gray-400" />,
          defaultTitle: t('errorState.notFound.title'),
          defaultMessage: t('errorState.notFound.message'),
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        }
      default:
        return {
          icon: <AlertCircle className="h-16 w-16 text-red-400" />,
          defaultTitle: t('errorState.generic.title'),
          defaultMessage: t('errorState.generic.message'),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        }
    }
  }

  const config = getErrorConfig()

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-8">
        <div className="mb-6">{config.icon}</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
          {title || config.defaultTitle}
        </h3>
        <p className="text-gray-600 mb-8 text-center max-w-md">
          {message || config.defaultMessage}
        </p>
        {onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="flex items-center gap-2"
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`}
            />
            {isRetrying ? t('errorState.retrying') : t('errorState.tryAgain')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

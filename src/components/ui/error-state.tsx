import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  type?: 'network' | 'server' | 'notFound' | 'generic';
}

export function ErrorState({ 
  title, 
  message, 
  onRetry, 
  isRetrying = false,
  type = 'generic' 
}: ErrorStateProps) {
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: <WifiOff className="h-16 w-16 text-red-400" />,
          defaultTitle: 'Connection Problem',
          defaultMessage: 'Please check your internet connection and try again.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'server':
        return {
          icon: <AlertCircle className="h-16 w-16 text-orange-400" />,
          defaultTitle: 'Server Error',
          defaultMessage: 'Something went wrong on our end. Please try again in a moment.',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'notFound':
        return {
          icon: <AlertCircle className="h-16 w-16 text-gray-400" />,
          defaultTitle: 'Not Found',
          defaultMessage: 'The requested resource could not be found.',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
      default:
        return {
          icon: <AlertCircle className="h-16 w-16 text-red-400" />,
          defaultTitle: 'Something went wrong',
          defaultMessage: 'An unexpected error occurred. Please try again.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
    }
  };

  const config = getErrorConfig();

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-8">
        <div className="mb-6">
          {config.icon}
        </div>
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
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

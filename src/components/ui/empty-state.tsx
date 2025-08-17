import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Database, FileX, PlusCircle, Search } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  type?: 'search' | 'create' | 'data' | 'filter';
  icon?: React.ReactNode;
}

export function EmptyState({ 
  title, 
  description, 
  action,
  type = 'data',
  icon 
}: EmptyStateProps) {
  const getEmptyConfig = () => {
    switch (type) {
      case 'search':
        return {
          icon: <Search className="h-16 w-16 text-gray-400" />,
          defaultTitle: 'No search results',
          defaultDescription: 'Try adjusting your search terms or filters to find what you\'re looking for.',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'create':
        return {
          icon: <PlusCircle className="h-16 w-16 text-green-400" />,
          defaultTitle: 'Get started',
          defaultDescription: 'Create your first item to begin managing your data.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'filter':
        return {
          icon: <FileX className="h-16 w-16 text-orange-400" />,
          defaultTitle: 'No items match your filters',
          defaultDescription: 'Try clearing some filters to see more results.',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      default:
        return {
          icon: <Database className="h-16 w-16 text-gray-400" />,
          defaultTitle: 'No data available',
          defaultDescription: 'There are no items to display at the moment.',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getEmptyConfig();

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-8">
        <div className="mb-6">
          {icon || config.icon}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
          {title || config.defaultTitle}
        </h3>
        <p className="text-gray-600 mb-8 text-center max-w-md">
          {description || config.defaultDescription}
        </p>
        {action && (
          <Button 
            onClick={action.onClick}
            className="flex items-center gap-2"
          >
            {action.icon}
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

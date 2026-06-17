import {
  TriangleAlert,
  WifiOff,
  ShieldAlert,
  SearchX,
  FileWarning,
  ServerCrash,
  RotateCw,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';
import { describeError, type ErrorKind } from './describeError';

const ICONS: Record<ErrorKind, LucideIcon> = {
  offline: WifiOff,
  unauthorized: ShieldAlert,
  forbidden: ShieldAlert,
  notFound: SearchX,
  validation: FileWarning,
  server: ServerCrash,
  generic: TriangleAlert,
};

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useT();
  const { kind, title, message, showRetry, traceId } = describeError(error, t);
  const Icon = ICONS[kind];
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <Icon className="size-6 text-destructive" />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {showRetry && onRetry && (
        <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>
          <RotateCw className="size-4" /> {t.errors.retry}
        </Button>
      )}
      {traceId && (
        <p className="text-xs text-muted-foreground">
          {t.common.reference}: <code>{traceId}</code>
        </p>
      )}
    </div>
  );
}

import { TriangleAlert } from 'lucide-react';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';

export function ErrorState({ error }: { error: unknown }) {
  const t = useT();
  const isApi = error instanceof ApiError;
  const message = isApi ? error.message : t.common.error;
  const traceId = isApi ? error.traceId : undefined;
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <TriangleAlert className="size-6 text-destructive" />
      <p className="font-medium">{message}</p>
      {traceId && (
        <p className="text-xs text-muted-foreground">
          {t.common.reference}: <code>{traceId}</code>
        </p>
      )}
    </div>
  );
}

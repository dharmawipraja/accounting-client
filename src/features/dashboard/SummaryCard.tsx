import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/useT';

interface Props {
  title: string;
  value: ReactNode;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  hint?: string;
  /** When the card is wrapped in a link, lift its border on parent-group hover so it reads as clickable. */
  interactive?: boolean;
}

export function SummaryCard({ title, value, loading, error, onRetry, hint, interactive }: Props) {
  const t = useT();
  return (
    <Card className={interactive ? 'transition-colors group-hover:border-primary' : undefined}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : error ? (
          <div className="space-y-1">
            <p className="text-sm text-destructive">{t.dashboard.loadError}</p>
            {onRetry ? (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onRetry}>
                {t.dashboard.retry}
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
            {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

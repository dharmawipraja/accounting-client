import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';

export function ReportContent<T>({ query, children }: { query: UseQueryResult<T, unknown>; children: (data: T) => ReactNode }) {
  if (query.isError) return <ErrorState error={query.error} />;
  if (query.data === undefined) return <Skeleton className="h-64 w-full" />;
  return <>{children(query.data)}</>;
}

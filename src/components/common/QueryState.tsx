import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import { ErrorState } from './ErrorState';

/** Standardises the loading → notFound → error → data branch order for a
 *  TanStack Query result so every page handles states identically.
 *  - `onRetry` wires the retry button to `query.refetch`.
 *  - `notFound` (opt-in) renders for an ApiError 404 instead of ErrorState. */
export function QueryState<T>({
  query,
  loading,
  notFound,
  onRetry = false,
  children,
}: {
  query: UseQueryResult<T, ApiError>;
  loading: ReactNode;
  notFound?: ReactNode;
  onRetry?: boolean;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <>{loading}</>;
  if (query.isError) {
    if (notFound && query.error instanceof ApiError && query.error.status === 404) {
      return <>{notFound}</>;
    }
    return <ErrorState error={query.error} onRetry={onRetry ? () => void query.refetch() : undefined} />;
  }
  return <>{children(query.data)}</>;
}

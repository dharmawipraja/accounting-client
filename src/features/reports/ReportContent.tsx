import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { QueryState } from '@/components/common/QueryState';
import type { ApiError } from '@/lib/api/errors';

/** Shared loading/error/data shell for every report page.
 *  Pass a skeleton shaped for the report type via `loading`. */
export function ReportContent<T>({
  query,
  loading,
  children,
}: {
  query: UseQueryResult<T, ApiError>;
  loading: ReactNode;
  children: (data: T) => ReactNode;
}) {
  return (
    <QueryState query={query} loading={loading} onRetry>
      {children}
    </QueryState>
  );
}

import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';

/** Retry once, but only for transient failures (network/timeout status 0, 429,
 *  5xx). Deterministic 4xx (403 SoD, 404, 422) fail identically on retry, so
 *  retrying them only delays the error state the user needs to see. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (error instanceof ApiError) {
    return error.status === 0 || error.status === 429 || error.status >= 500;
  }
  return true; // non-ApiError = thrown before a response (network-class)
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: shouldRetryQuery, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

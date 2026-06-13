import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it } from 'vitest';
import { useBalanceSheet, useDraftCount } from './hooks';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('useBalanceSheet parses totals from the API', async () => {
  const { result } = renderHook(() => useBalanceSheet('2026-06-13'), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.totalAssets).toBe('1500000.0000');
});

it('useDraftCount reads the envelope total', async () => {
  const { result } = renderHook(() => useDraftCount(), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.total).toBe(3);
});

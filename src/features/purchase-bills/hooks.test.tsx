import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { purchaseBillsApi, usePostBill } from './hooks';

afterEach(() => useSession.getState().clear());

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('useList loads purchase bills from the API', async () => {
  const { result } = renderHook(() => purchaseBillsApi.useList(), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.[0].id).toBe('b1');
});

it('usePostBill posts to the bill post endpoint', async () => {
  const { result } = renderHook(() => usePostBill(), { wrapper: makeWrapper() });
  result.current.mutate({ id: 'b1', idempotencyKey: 'k1' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it } from 'vitest';
import { useJournalEntries, useJournalEntry, usePostJournalEntry } from './hooks';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('useJournalEntries returns the paginated envelope', async () => {
  const { result } = renderHook(() => useJournalEntries({ limit: 20, offset: 0 }), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.total).toBe(5);
  expect(result.current.data?.data.length).toBe(5);
});

it('useJournalEntries filters by status (the DRAFT approval queue)', async () => {
  const { result } = renderHook(() => useJournalEntries({ status: 'DRAFT', limit: 20, offset: 0 }), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.total).toBe(3);
});

it('useJournalEntry returns the detail with lines', async () => {
  const { result } = renderHook(() => useJournalEntry('jed1'), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.lines.length).toBe(2);
});

it('usePostJournalEntry posts to the post endpoint', async () => {
  const { result } = renderHook(() => usePostJournalEntry(), { wrapper: makeWrapper() });
  result.current.mutate({ id: 'jed1', idempotencyKey: 'k1' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});

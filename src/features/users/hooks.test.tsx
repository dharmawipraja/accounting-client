import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useUsers, useCreateUser, useResetPassword } from './hooks';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('lists users from the envelope', async () => {
  const { result } = renderHook(() => useUsers({ limit: 20, offset: 0 }), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.total).toBe(2);
  expect(result.current.data?.data[0].email).toBe('admin@buku.id');
});

it('create returns a temp password', async () => {
  const { result } = renderHook(() => useCreateUser(), { wrapper });
  const res = await result.current.mutateAsync({ email: 'x@y.z', name: 'X', role: 'VIEWER' });
  expect(res.tempPassword).toBe('Temp-abc123');
});

it('reset-password returns a fresh temp password', async () => {
  const { result } = renderHook(() => useResetPassword(), { wrapper });
  const res = await result.current.mutateAsync('u2');
  expect(res.tempPassword).toBe('Temp-reset9');
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { useLogin } from './useLogin';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('logs in, stores tokens, and hydrates the user', async () => {
  const { result } = renderHook(() => useLogin(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ email: 'admin@buku.id', password: 'ok' });
  });
  await waitFor(() => {
    expect(useSession.getState().accessToken).toBe('access-1');
    expect(useSession.getState().user?.role).toBe('ADMIN');
    expect(useSession.getState().status).toBe('authenticated');
  });
});

it('surfaces an ApiError on bad credentials', async () => {
  const { result } = renderHook(() => useLogin(), { wrapper });
  await expect(
    result.current.mutateAsync({ email: 'admin@buku.id', password: 'wrong' }),
  ).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useChangePassword } from './useChangePassword';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('posts to /auth/change-password and resolves ok', async () => {
  let body: unknown;
  server.use(
    http.post(`${API}/auth/change-password`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({ ok: true });
    }),
  );
  const { result } = renderHook(() => useChangePassword(), { wrapper });
  await result.current.mutateAsync({ currentPassword: 'old', newPassword: 'new-password-1' });
  await waitFor(() => expect(body).toEqual({ currentPassword: 'old', newPassword: 'new-password-1' }));
});

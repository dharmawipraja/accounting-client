import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API, auditFixtures } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useAuditLog } from './useAuditLog';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('passes filters as query params and returns the array', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let seenMethod: string | null = null;
  let seenLimit: string | null = null;
  let seenOffset: string | null = null;
  server.use(http.get(`${API}/audit`, ({ request }) => {
    const p = new URL(request.url).searchParams;
    seenMethod = p.get('method'); seenLimit = p.get('limit'); seenOffset = p.get('offset');
    return HttpResponse.json(auditFixtures());
  }));
  const { result } = renderHook(() => useAuditLog({ method: 'POST', limit: 50, offset: 50 }), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.length).toBeGreaterThan(0);
  expect(seenMethod).toBe('POST');
  expect(seenLimit).toBe('50');
  expect(seenOffset).toBe('50');
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API, companySettingsFixture } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useCompanySettings, useUpdateCompanySettings } from './hooks';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('useCompanySettings returns the parsed settings', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  const { result } = renderHook(() => useCompanySettings(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.legalName).toBe('My Company');
});

it('useUpdateCompanySettings PATCHes the body', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let body: Record<string, unknown> | null = null;
  server.use(http.patch(`${API}/company/settings`, async ({ request }) => {
    body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...companySettingsFixture(), ...body });
  }));
  const { result } = renderHook(() => useUpdateCompanySettings(), { wrapper });
  result.current.mutate({ legalName: 'PT Baru', npwp: '', address: '', fiscalYearStartMonth: 1, segregationOfDutiesEnabled: true, isPkp: true });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(body).toMatchObject({ legalName: 'PT Baru', segregationOfDutiesEnabled: true });
});

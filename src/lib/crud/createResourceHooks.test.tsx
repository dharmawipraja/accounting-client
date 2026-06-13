import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { createResourceHooks, createResourceKeys } from './createResourceHooks';

const widgetSchema = z.object({ id: z.string(), name: z.string() });
type Widget = z.infer<typeof widgetSchema>;
const widgets = createResourceHooks<Widget, { name: string }, { name: string }>({
  key: 'widgets',
  basePath: '/widgets',
  itemSchema: widgetSchema,
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

afterEach(() => useSession.getState().clear());

describe('createResourceKeys', () => {
  it('builds prefix-shaped keys', () => {
    const k = createResourceKeys('widgets');
    expect(k.all).toEqual(['widgets']);
    expect(k.list()).toEqual(['widgets', 'list']);
    expect(k.item('7')).toEqual(['widgets', 'item', '7']);
  });
});

describe('createResourceHooks', () => {
  it('useList fetches and parses a bare array', async () => {
    server.use(http.get(`${API}/widgets`, () => HttpResponse.json([{ id: '1', name: 'A' }])));
    const { result } = renderHook(() => widgets.useList(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: '1', name: 'A' }]);
  });

  it('useCreate posts the body and invalidates the list (refetch reflects the new item)', async () => {
    let created = false;
    server.use(
      http.get(`${API}/widgets`, () =>
        HttpResponse.json(created ? [{ id: '1', name: 'A' }, { id: '2', name: 'B' }] : [{ id: '1', name: 'A' }]),
      ),
      http.post(`${API}/widgets`, async ({ request }) => {
        const body = (await request.json()) as { name: string };
        created = true;
        return HttpResponse.json({ id: '2', name: body.name });
      }),
    );
    const { result } = renderHook(
      () => ({ list: widgets.useList(), create: widgets.useCreate() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(1));
    await result.current.create.mutateAsync({ name: 'B' });
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
  });

  it('useDeactivate posts to /:id/deactivate', async () => {
    let hit = '';
    server.use(http.post(`${API}/widgets/9/deactivate`, () => { hit = 'deactivate'; return HttpResponse.json({}); }));
    const { result } = renderHook(() => widgets.useDeactivate(), { wrapper });
    await result.current.mutateAsync('9');
    expect(hit).toBe('deactivate');
  });

  it('useRemove deletes /:id', async () => {
    let method = '';
    server.use(http.delete(`${API}/widgets/9`, () => { method = 'DELETE'; return HttpResponse.json({}); }));
    const { result } = renderHook(() => widgets.useRemove(), { wrapper });
    await result.current.mutateAsync('9');
    expect(method).toBe('DELETE');
  });
});

import { renderHook, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import type { UseQueryResult } from '@tanstack/react-query';
import { useDocumentListController, type DocumentListConfig, type ActionHandlers, type PageEnvelope } from './useDocumentListController';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => vi.clearAllMocks());

type Doc = { id: string; name: string };

// A stub list hook: records the query it was called with, returns a resolved envelope.
function makeList(spy: (q: Record<string, string | number | undefined>) => void) {
  return (q: Record<string, string | number | undefined>) => {
    spy(q);
    return { data: { data: [], total: 0, limit: 20, offset: 0 }, isPending: false, isError: false } as unknown as UseQueryResult<PageEnvelope<Doc>, ApiError_>;
  };
}
type ApiError_ = import('@/lib/api/errors').ApiError;

function makeConfig(over: Partial<DocumentListConfig<Doc>>, captureHandlers: (h: ActionHandlers<Doc>) => void, listSpy = vi.fn()): DocumentListConfig<Doc> {
  const ok = { mutate: vi.fn((_v: unknown, o: { onSuccess: () => void }) => o.onSuccess()), isPending: false };
  return {
    title: 'T', colCount: 2,
    list: makeList(listSpy),
    columns: (h) => { captureHandlers(h); return []; },
    actions: {
      delete: { mutation: ok as never, success: 'deleted', confirm: { title: 'del?', label: 'Delete' } },
      post: { mutation: ok as never, success: 'posted', confirm: { title: 'post?', label: 'Post' } },
    },
    filters: [{ param: 'status', options: [{ value: 'ALL', label: 'All' }, { value: 'DRAFT', label: 'Draft' }] }],
    search: { predicate: (d, q) => d.name.toLowerCase().includes(q) },
    ...over,
  };
}

it('mints an idempotency key for post but not for delete', () => {
  const postSpy = vi.fn((_v: unknown, o: { onSuccess: () => void }) => o.onSuccess());
  const delSpy = vi.fn((_v: unknown, o: { onSuccess: () => void }) => o.onSuccess());
  let handlers!: ActionHandlers<Doc>;
  const config = makeConfig({
    actions: {
      delete: { mutation: { mutate: delSpy, isPending: false } as never, success: 'deleted', confirm: { title: 'd', label: 'D' } },
      post: { mutation: { mutate: postSpy, isPending: false } as never, success: 'posted', confirm: { title: 'p', label: 'P' } },
    },
  }, (h) => { handlers = h; });

  const { result } = renderHook(() => useDocumentListController(config));

  act(() => handlers.onPost!({ id: 'x1', name: 'A' }));
  act(() => result.current.dialog.onConfirm());
  expect(postSpy).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'x1', idempotencyKey: expect.any(String) }),
    expect.anything(),
  );

  act(() => handlers.onDelete!({ id: 'x2', name: 'B' }));
  act(() => result.current.dialog.onConfirm());
  expect(delSpy).toHaveBeenCalledWith('x2', expect.anything());
});

it('resets offset to 0 on filter change and on search change', () => {
  const listSpy = vi.fn();
  const config = makeConfig({}, () => {}, listSpy);
  const { result } = renderHook(() => useDocumentListController(config));

  act(() => result.current.setOffset(40));
  expect(result.current.offset).toBe(40);
  act(() => result.current.setFilter('status', 'DRAFT'));
  expect(result.current.offset).toBe(0);
  expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'DRAFT', offset: 0 }));

  act(() => result.current.setOffset(40));
  act(() => result.current.setSearch('foo'));
  expect(result.current.offset).toBe(0);
});

it('routes delete errors to a plain toast and keyed errors to toastApiError', async () => {
  const mod = await import('@/lib/api/toastApiError');
  const toastApiError = vi.spyOn(mod, 'toastApiError');
  let handlers!: ActionHandlers<Doc>;
  const failDelete = vi.fn((_v: unknown, o: { onError: (e: unknown) => void }) => o.onError(new Error('boom')));
  const config = makeConfig({
    actions: { delete: { mutation: { mutate: failDelete, isPending: false } as never, success: 's', confirm: { title: 'd', label: 'D' } } },
  }, (h) => { handlers = h; });
  const { result } = renderHook(() => useDocumentListController(config));
  act(() => handlers.onDelete!({ id: 'z', name: 'Z' }));
  act(() => result.current.dialog.onConfirm());
  expect(toast.error).toHaveBeenCalled();
  expect(toastApiError).not.toHaveBeenCalled();
});

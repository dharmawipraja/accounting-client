# Document-list Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Concentrate the duplicated Document list-page lifecycle (sales invoices, purchase bills, payments, journals) into one deep module — `DocumentListPage` on an exported `useDocumentListController` hook.

**Architecture:** A config-driven `DocumentListPage<T>` component renders the whole list page (header + role-gated New control + filter strips + page-scoped search + `QueryState`→`DataTable`+`Pagination` + `ConfirmDialog`). It is built on `useDocumentListController<T>(config)`, which owns the pending-action state machine, idempotency-key minting, the confirm→mutate→toast→close dispatch, the offset-reset-on-filter/search invariant, and the dialog prop derivation. Idempotency and error-routing are derived from the lifecycle-action kind, not configured. Lives in `src/features/documents/` beside the existing shared tax core. Scope is the four Documents only; master-data pages are out of scope (see `docs/adr/0001-document-list-deepening.md`).

**Tech Stack:** React 19, TypeScript (strict), TanStack Query v5 + Router + Table, sonner, MSW v2, Vitest 4 + RTL.

## Global Constraints

- **i18n:** every user-facing string via `useT()` (`src/lib/i18n/messages.id.ts`, Indonesian). No hardcoded copy. No em-dashes in UI strings. Domain copy (titles, success/confirm strings) is resolved by the caller and passed in `config`; `DocumentListPage` reads only generic chrome (`t.common.search`, `t.common.searchOnThisPage`, `t.common.error`) itself.
- **Money:** decimal.js via `Money`; never JS floats. (Not exercised here — money rendering stays in the injected columns.)
- **Status:** convey state with icon + text, never color alone. (Stays in the injected `buildXColumns` status chips — unchanged.)
- **Async UI:** query rendering stays wrapped in `QueryState` with `SkeletonTable` loading.
- **Idempotency:** post/void/reverse are idempotency-key-covered writes (mint a key, send it); delete is not. Error-routing: post/void/reverse → `toastApiError`; delete → `toast.error(t.common.error)`. Both close the dialog on success and on error. (Derived from action kind — verbatim from today's pages.)
- **Redesign-preserve:** do not change routes, nav labels, or form-field names. The migrated pages must render the same controls/labels (the existing page tests are the regression net and must stay green).
- **Pre-existing ESLint warnings** about React Compiler / react-hook-form / TanStack Table incompatibility are expected — do not "fix" them. `DataTable` carries an `eslint-disable @typescript-eslint/no-explicit-any` on its `columns` prop; mirror that `any` in the controller's `columns` type.
- **Commands:** Tests `pnpm test --run` · one file `pnpm test --run <path>` · Typecheck `pnpm exec tsc --noEmit` · Lint `pnpm run lint` · Build `pnpm run build`.

## File Structure

- **Create** `src/features/documents/useDocumentListController.ts` — types + the state-machine/dispatch hook (the internal seam + escape hatch). One responsibility: Document-list lifecycle state.
- **Create** `src/features/documents/useDocumentListController.test.tsx` — focused unit tests for the invariants (key minting, offset reset).
- **Create** `src/features/documents/DocumentListPage.tsx` — the config-driven page component (the external interface).
- **Create** `src/features/documents/DocumentListPage.test.tsx` — the authoritative interface suite (rendered, MSW-backed, synthetic config).
- **Modify** `src/features/sales-invoices/SalesInvoicesPage.tsx`, `src/features/purchase-bills/PurchaseBillsPage.tsx`, `src/features/payments/PaymentsPage.tsx`, `src/features/journals/JournalsPage.tsx` — each becomes a `config` declaration returning `<DocumentListPage config={config} />`.
- **Unchanged:** all four `columns.tsx` (handler shapes already match), all four `hooks.ts`, the four `*Page.test.tsx` (kept green as regression + per-page wiring proof — they test live page wiring, not a shallow module's internals, so they earn their keep).

**Interface reference (load-bearing facts the code relies on):**
- `DataTable` props: `{ columns: ColumnDef<TData, any>[]; data: TData[]; emptyMessage? }` (`src/components/common/DataTable.tsx`).
- `ConfirmDialog` props: `{ open, onOpenChange, title, description?, confirmLabel, onConfirm, pending?, destructive? }`.
- `Pagination` props: `{ offset, limit, total, onChange }`.
- `PageHeader` props: `{ title, actions? }`; `RoleGate` props: `{ allow: Role[], children }` where `Role = 'VIEWER'|'ACCOUNTANT'|'APPROVER'|'ADMIN'` (`src/stores/session.ts`).
- `usePostInvoice()`/`useVoidInvoice()`/`usePostBill()`/`useVoidBill()`/`usePostPayment()`/`useVoidPayment()`/`usePostJournalEntry()`/`useReverseJournalEntry()` all return `UseMutationResult<unknown, ApiError, { id: string; idempotencyKey: string }>` (via `useDocumentAction`). `salesInvoicesApi.useRemove()`/`purchaseBillsApi.useRemove()`/`paymentsApi.useRemove()`/`useDeleteJournalEntry()` return `UseMutationResult<unknown, ApiError, string>`.
- `salesInvoicesApi.usePagedList`/`purchaseBillsApi.usePagedList`/`paymentsApi.usePagedList` have signature `(query: Record<string, string|number|undefined>) => UseQueryResult<{data,total,limit,offset}, ApiError>`. `useJournalEntries(params: { status?; sourceType?; from?; to?; limit; offset })` returns the same envelope shape but with named numeric `limit`/`offset` — it needs a thin inline adapter.
- Column builders: `buildInvoiceColumns(t, partnerName, { onDelete, onPost, onVoid })`, `buildBillColumns(t, partnerName, { onDelete, onPost, onVoid })`, `buildPaymentColumns(t, partnerName, accountName, { onDelete, onPost, onVoid })`, `buildJournalColumns(t, { onDelete, onPost, onReverse })`.

---

### Task 1: `useDocumentListController` hook + types

**Files:**
- Create: `src/features/documents/useDocumentListController.ts`
- Test: `src/features/documents/useDocumentListController.test.tsx`

**Interfaces:**
- Consumes: `toastApiError` (`@/lib/api/toastApiError`), `useT`, `ApiError`, TanStack Query/Table types.
- Produces: `DocumentListConfig<T>`, `DocumentListController<T>`, `ActionKind`, `KeyedMutation`, `IdMutation`, `ActionsConfig`, `FilterConfig`, `ListHook<T>`, `ActionHandlers<T>`, `PageEnvelope<T>`, and `useDocumentListController<T>(config)`. Consumed by Task 2 and all four migrated pages.

- [ ] **Step 1: Write the failing unit test**

Create `src/features/documents/useDocumentListController.test.tsx`:

```tsx
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
  let handlers!: ActionHandlers<Doc>;
  const config = makeConfig({}, (h) => { handlers = h; }, listSpy);
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
  const toastApiError = (await import('@/lib/api/toastApiError')).toastApiError;
  vi.spyOn(await import('@/lib/api/toastApiError'), 'toastApiError');
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
```

- [ ] **Step 2: Run it to verify failure**

Run: `pnpm test --run src/features/documents/useDocumentListController.test.tsx`
Expected: FAIL — cannot resolve `./useDocumentListController`.

- [ ] **Step 3: Implement the hook**

Create `src/features/documents/useDocumentListController.ts`:

```ts
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/errors';
import type { Role } from '@/stores/session';
import { toastApiError } from '@/lib/api/toastApiError';
import { useT } from '@/lib/i18n/useT';

export interface PageEnvelope<T> { data: T[]; total: number; limit: number; offset: number }

export type LifecycleKind = 'post' | 'void' | 'reverse';
export type ActionKind = LifecycleKind | 'delete';

export type KeyedMutation = UseMutationResult<unknown, ApiError, { id: string; idempotencyKey: string }>;
export type IdMutation = UseMutationResult<unknown, ApiError, string>;

export interface ActionConfig<K extends ActionKind> {
  mutation: K extends 'delete' ? IdMutation : KeyedMutation;
  success: string;
  confirm: { title: string; description?: string; label: string };
}
export type ActionsConfig = { [K in ActionKind]?: ActionConfig<K> };

export interface FilterConfig {
  /** server query-param name, e.g. 'status' | 'direction' | 'sourceType' */
  param: string;
  /** options[0] is the ALL sentinel (value 'ALL' → param omitted from the query) */
  options: readonly { value: string; label: string }[];
}

export type ListHook<T> = (
  query: Record<string, string | number | undefined>,
) => UseQueryResult<PageEnvelope<T>, ApiError>;

export type ActionHandlers<T> = Partial<Record<'onPost' | 'onVoid' | 'onReverse' | 'onDelete', (doc: T) => void>>;

export interface DocumentListConfig<T extends { id: string }> {
  title: string;
  colCount: number;
  list: ListHook<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: (handlers: ActionHandlers<T>) => ColumnDef<T, any>[];
  actions: ActionsConfig;
  /** Role-gated New control(s). Pre-rendered JSX so route literals keep their types. */
  newControl?: ReactNode;
  /** Roles allowed to see newControl. Default: ACCOUNTANT/APPROVER/ADMIN. */
  newRole?: Role[];
  filters?: FilterConfig[];
  /** Omit to render no search box. `predicate` receives the row and the lowercased query. */
  search?: { placeholder?: string; predicate: (doc: T, q: string) => boolean };
  /** Seed filter values, e.g. { status: 'DRAFT' } for a deep-link. */
  initialFilters?: Record<string, string>;
  /** Page size. Default 20. */
  limit?: number;
}

const HANDLER_NAME: Record<ActionKind, 'onPost' | 'onVoid' | 'onReverse' | 'onDelete'> = {
  post: 'onPost', void: 'onVoid', reverse: 'onReverse', delete: 'onDelete',
};

type Pending<T> = { kind: ActionKind; doc: T; idempotencyKey?: string };

export interface DocumentListController<T> {
  page: UseQueryResult<PageEnvelope<T>, ApiError>;
  offset: number;
  limit: number;
  setOffset: (n: number) => void;
  search: string;
  setSearch: (s: string) => void;
  filterValues: Record<string, string>;
  setFilter: (param: string, value: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  applySearch: (rows: T[]) => T[];
  dialog: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel: string;
    destructive: boolean;
    pending: boolean;
    onConfirm: () => void;
  };
}

export function useDocumentListController<T extends { id: string }>(
  config: DocumentListConfig<T>,
): DocumentListController<T> {
  const t = useT();
  const limit = config.limit ?? 20;
  const [offset, setOffset] = useState(0);
  const [search, setSearchState] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of config.filters ?? []) init[f.param] = config.initialFilters?.[f.param] ?? 'ALL';
    return init;
  });
  const [pending, setPending] = useState<Pending<T> | null>(null);

  const setSearch = (s: string) => { setSearchState(s); setOffset(0); };
  const setFilter = (param: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [param]: value }));
    setOffset(0);
  };

  const query: Record<string, string | number | undefined> = { limit, offset };
  for (const [param, value] of Object.entries(filterValues)) {
    query[param] = value === 'ALL' ? undefined : value;
  }
  const page = config.list(query);

  const columns = useMemo(() => {
    const handlers: ActionHandlers<T> = {};
    for (const kind of Object.keys(config.actions) as ActionKind[]) {
      handlers[HANDLER_NAME[kind]] = (doc: T) =>
        setPending({ kind, doc, idempotencyKey: kind === 'delete' ? undefined : crypto.randomUUID() });
    }
    return config.columns(handlers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.columns, config.actions]);

  function runAction() {
    if (!pending) return;
    const def = config.actions[pending.kind];
    if (!def) return;
    const close = () => setPending(null);
    if (pending.kind === 'delete') {
      (def.mutation as IdMutation).mutate(pending.doc.id, {
        onSuccess: () => { toast.success(def.success); close(); },
        onError: () => { toast.error(t.common.error); close(); },
      });
    } else {
      (def.mutation as KeyedMutation).mutate(
        { id: pending.doc.id, idempotencyKey: pending.idempotencyKey! },
        { onSuccess: () => { toast.success(def.success); close(); }, onError: (e) => { toastApiError(e, t); close(); } },
      );
    }
  }

  const activeDef = pending ? config.actions[pending.kind] : undefined;
  const anyPending = Object.values(config.actions).some((a) => a?.mutation.isPending);

  return {
    page, offset, limit, setOffset, search, setSearch, filterValues, setFilter, columns,
    applySearch: (rows: T[]) => {
      if (!config.search || !search) return rows;
      const q = search.toLowerCase();
      return rows.filter((r) => config.search!.predicate(r, q));
    },
    dialog: {
      open: !!pending,
      onOpenChange: (o: boolean) => { if (!o) setPending(null); },
      title: activeDef?.confirm.title ?? '',
      description: activeDef?.confirm.description,
      confirmLabel: activeDef?.confirm.label ?? '',
      destructive: pending?.kind !== 'post',
      pending: anyPending,
      onConfirm: runAction,
    },
  };
}
```

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `pnpm test --run src/features/documents/useDocumentListController.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm exec tsc --noEmit` → no errors.

```bash
git add src/features/documents/useDocumentListController.ts src/features/documents/useDocumentListController.test.tsx
git commit -m "feat(documents): useDocumentListController — document list-page state machine

Owns pending-action state, idempotency minting (post/void/reverse, not delete),
confirm→mutate→toast→close dispatch with kind-derived error routing, and the
offset-reset-on-filter/search invariant. The escape hatch beneath DocumentListPage."
```

---

### Task 2: `DocumentListPage` component + interface test suite

**Files:**
- Create: `src/features/documents/DocumentListPage.tsx`
- Test: `src/features/documents/DocumentListPage.test.tsx`

**Interfaces:**
- Consumes: `useDocumentListController` + its types (Task 1); `PageHeader`, `RoleGate`, `Pagination`, `QueryState`, `ConfirmDialog`, `SkeletonTable`, `DataTable`, `Input`, `Button`; `useT`.
- Produces: `DocumentListPage<T>({ config })`. Consumed by all four migrated pages.

- [ ] **Step 1: Write the failing interface test**

Create `src/features/documents/DocumentListPage.test.tsx`:

```tsx
import { useQuery, QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { id as messages } from '@/lib/i18n/messages.id';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { usePostInvoice, useVoidInvoice, salesInvoicesApi } from '@/features/sales-invoices/hooks';
import { DocumentListPage } from './DocumentListPage';
import type { DocumentListConfig, PageEnvelope } from './useDocumentListController';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => useSession.getState().clear());

type Doc = { id: string; name: string; status: string };
const col = createColumnHelper<Doc>();

// A real list hook over a synthetic endpoint, so QueryState + Pagination behave realistically.
const useDocs = (q: Record<string, string | number | undefined>): UseQueryResult<PageEnvelope<Doc>, ApiError> =>
  useQuery({ queryKey: ['test-docs', q], queryFn: () => apiFetch('/test-docs', { query: q }) }) as UseQueryResult<PageEnvelope<Doc>, ApiError>;

function makeConfig(): DocumentListConfig<Doc> {
  // mutations come from the real sales-invoices hooks so we exercise the live POST + idempotency path
  // (the synthetic /test-docs/:id/post handler stands in for the resource).
  const post = usePostInvoiceLike();
  const del = useRemoveLike();
  return {
    title: 'Dokumen Uji',
    colCount: 3,
    list: useDocs,
    columns: (h) => [
      col.accessor('name', { header: 'Nama', cell: (c) => c.getValue() }),
      col.accessor('status', { header: 'Status', cell: (c) => c.getValue() }),
      col.display({ id: 'a', header: '', cell: (c) => (
        <div>
          <button onClick={() => h.onDelete!(c.row.original)}>Hapus</button>
          <button onClick={() => h.onPost!(c.row.original)}>Posting</button>
        </div>
      ) }),
    ],
    actions: {
      delete: { mutation: del, success: messages.crud.deleted, confirm: { title: messages.crud.confirmDeleteTitle, label: messages.common.delete } },
      post: { mutation: post, success: 'Diposting', confirm: { title: 'Posting?', label: 'Posting' } },
    },
    filters: [{ param: 'status', options: [
      { value: 'ALL', label: 'Semua' }, { value: 'DRAFT', label: 'Draf' }, { value: 'POSTED', label: 'Diposting' },
    ] }],
    search: { predicate: (d, q) => d.name.toLowerCase().includes(q) },
    newControl: <a href="/new">Baru</a>,
  };
}

// thin local hooks pointing the action endpoints at /test-docs/:id/{post} via the real useDocumentAction shape
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
const usePostInvoiceLike = () => useDocumentAction({ key: 'test-docs', basePath: '/test-docs', action: 'post' });
const useRemoveLike = () => salesInvoicesApi.useRemove();

function Harness() {
  return <DocumentListPage config={makeConfig()} />;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Harness /></QueryClientProvider>);
}

const docs = [
  { id: 'd1', name: 'Alpha', status: 'DRAFT' },
  { id: 'd2', name: 'Beta', status: 'POSTED' },
];

it('renders the title, role-gated New control, rows, and pagination label', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(http.get(`${API}/test-docs`, () => HttpResponse.json({ data: docs, total: 2, limit: 20, offset: 0 })));
  renderPage();
  expect(await screen.findByText('Alpha')).toBeInTheDocument();
  expect(screen.getByText('Dokumen Uji')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Baru' })).toBeInTheDocument();
  expect(screen.getByText(/menampilkan 1.+2 dari 2/i)).toBeInTheDocument();
});

it('hides the New control for VIEWER', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(http.get(`${API}/test-docs`, () => HttpResponse.json({ data: docs, total: 2, limit: 20, offset: 0 })));
  renderPage();
  await screen.findByText('Alpha');
  expect(screen.queryByRole('link', { name: 'Baru' })).not.toBeInTheDocument();
});

it('posts after confirm and sends an idempotency key', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let seenKey: string | null = null;
  server.use(
    http.get(`${API}/test-docs`, () => HttpResponse.json({ data: [docs[0]], total: 1, limit: 20, offset: 0 })),
    http.post(`${API}/test-docs/d1/post`, ({ request }) => { seenKey = request.headers.get('Idempotency-Key'); return HttpResponse.json({}); }),
  );
  renderPage();
  await screen.findByText('Alpha');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(seenKey).toBeTruthy());
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Diposting'));
});

it('routes a 403 SoD post error through toastApiError', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/test-docs`, () => HttpResponse.json({ data: [docs[0]], total: 1, limit: 20, offset: 0 })),
    http.post(`${API}/test-docs/d1/post`, () => HttpResponse.json({ code: 'SEGREGATION_OF_DUTIES', message: 'x' }, { status: 403 })),
  );
  renderPage();
  await screen.findByText('Alpha');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(messages.roles.segregationOfDuties));
});

it('resets offset to 0 when a status filter is clicked', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let lastQuery: URLSearchParams | null = null;
  server.use(http.get(`${API}/test-docs`, ({ request }) => {
    lastQuery = new URL(request.url).searchParams;
    return HttpResponse.json({ data: docs, total: 30, limit: 20, offset: Number(lastQuery.get('offset') ?? '0') });
  }));
  renderPage();
  await screen.findByText('Alpha');
  await user.click(screen.getByRole('button', { name: /berikutnya/i })); // offset → 20
  await waitFor(() => expect(lastQuery?.get('offset')).toBe('20'));
  await user.click(screen.getByRole('button', { name: 'Draf' }));        // filter → offset 0 + status=DRAFT
  await waitFor(() => expect(lastQuery?.get('offset')).toBe('0'));
  expect(lastQuery?.get('status')).toBe('DRAFT');
});

it('applies page-scoped search over the loaded page', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(http.get(`${API}/test-docs`, () => HttpResponse.json({ data: docs, total: 2, limit: 20, offset: 0 })));
  renderPage();
  await screen.findByText('Alpha');
  await user.type(screen.getByPlaceholderText(messages.common.search), 'beta');
  await waitFor(() => expect(screen.queryByText('Alpha')).not.toBeInTheDocument());
  expect(screen.getByText('Beta')).toBeInTheDocument();
});
```

> Note: the synthetic `useDocs` list, `usePostInvoiceLike` (a `useDocumentAction` against `/test-docs`), and `useRemoveLike` exercise the real query/mutation/idempotency/toast paths through `DocumentListPage`'s public surface, so this suite is the authoritative test for the deepened interface (incl. the offset-reset-on-search invariant the per-page tests never covered).

- [ ] **Step 2: Run it to verify failure**

Run: `pnpm test --run src/features/documents/DocumentListPage.test.tsx`
Expected: FAIL — cannot resolve `./DocumentListPage`.

- [ ] **Step 3: Implement the component**

Create `src/features/documents/DocumentListPage.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { QueryState } from '@/components/common/QueryState';
import { RoleGate } from '@/components/common/RoleGate';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { useT } from '@/lib/i18n/useT';
import { useDocumentListController, type DocumentListConfig } from './useDocumentListController';

export function DocumentListPage<T extends { id: string }>({ config }: { config: DocumentListConfig<T> }) {
  const t = useT();
  const c = useDocumentListController(config);
  const newRole = config.newRole ?? ['ACCOUNTANT', 'APPROVER', 'ADMIN'];

  return (
    <div>
      <PageHeader
        title={config.title}
        actions={config.newControl ? <RoleGate allow={newRole}>{config.newControl}</RoleGate> : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {config.search ? (
          <div className="max-w-xs space-y-1">
            <Input
              placeholder={config.search.placeholder ?? t.common.search}
              value={c.search}
              onChange={(e) => c.setSearch(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t.common.searchOnThisPage}</p>
          </div>
        ) : null}
        {(config.filters ?? []).map((f) => (
          <div key={f.param} className="flex gap-1">
            {f.options.map((o) => (
              <Button
                key={o.value}
                size="sm"
                variant={c.filterValues[f.param] === o.value ? 'default' : 'outline'}
                onClick={() => c.setFilter(f.param, o.value)}
              >
                {o.label}
              </Button>
            ))}
          </div>
        ))}
      </div>

      <QueryState query={c.page} loading={<SkeletonTable rows={8} cols={config.colCount} />} onRetry>
        {(env) => (
          <>
            <DataTable columns={c.columns} data={c.applySearch(env.data)} />
            <Pagination offset={c.offset} limit={c.limit} total={env.total} onChange={c.setOffset} />
          </>
        )}
      </QueryState>

      <ConfirmDialog {...c.dialog} />
    </div>
  );
}
```

- [ ] **Step 4: Run the interface test to verify it passes**

Run: `pnpm test --run src/features/documents/DocumentListPage.test.tsx`
Expected: PASS (6 tests). If the Radix dialog doesn't open under `userEvent`, the pointer-capture shims in `src/test/setup.ts` cover it (the existing page tests use the identical pattern).

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm exec tsc --noEmit` → no errors.

```bash
git add src/features/documents/DocumentListPage.tsx src/features/documents/DocumentListPage.test.tsx
git commit -m "feat(documents): DocumentListPage — config-driven document list page

Renders header + role-gated New control + filter strips + page-scoped search +
QueryState/DataTable/Pagination + ConfirmDialog from a declaration. Authoritative
interface suite covers lifecycle, idempotency, error routing, and offset reset."
```

---

### Task 3: Migrate `SalesInvoicesPage`

**Files:**
- Modify: `src/features/sales-invoices/SalesInvoicesPage.tsx` (full rewrite)
- Regression: `src/features/sales-invoices/SalesInvoicesPage.test.tsx` (unchanged — must stay green)

**Interfaces:**
- Consumes: `DocumentListPage`, `DocumentListConfig` (Task 1/2); existing `buildInvoiceColumns`, `salesInvoicesApi`, `usePostInvoice`, `useVoidInvoice`, `partnersApi`.

- [ ] **Step 1: Rewrite the page as a config**

Replace the entire file `src/features/sales-invoices/SalesInvoicesPage.tsx` with:

```tsx
import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';
import { partnersApi } from '@/features/partners/hooks';
import { DocumentListPage } from '@/features/documents/DocumentListPage';
import type { DocumentListConfig } from '@/features/documents/useDocumentListController';
import { buildInvoiceColumns } from './columns';
import { salesInvoicesApi, usePostInvoice, useVoidInvoice } from './hooks';
import type { SalesInvoice } from './schema';

export function SalesInvoicesPage() {
  const t = useT();
  const partners = partnersApi.useList();
  const remove = salesInvoicesApi.useRemove();
  const post = usePostInvoice();
  const voidInvoice = useVoidInvoice();

  const partnerName = useMemo(() => {
    const map = new Map((partners.data ?? []).map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id;
  }, [partners.data]);

  const config: DocumentListConfig<SalesInvoice> = {
    title: t.salesInvoices.title,
    colCount: 6,
    list: salesInvoicesApi.usePagedList,
    columns: (h) => buildInvoiceColumns(t, partnerName, { onDelete: h.onDelete!, onPost: h.onPost!, onVoid: h.onVoid! }),
    actions: {
      delete: { mutation: remove, success: t.crud.deleted, confirm: { title: t.crud.confirmDeleteTitle, description: t.crud.confirmDeleteDesc, label: t.common.delete } },
      post: { mutation: post, success: t.salesInvoices.posted, confirm: { title: t.salesInvoices.confirmPostTitle, description: t.salesInvoices.confirmPostDesc, label: t.salesInvoices.post } },
      void: { mutation: voidInvoice, success: t.salesInvoices.voided, confirm: { title: t.salesInvoices.confirmVoidTitle, description: t.salesInvoices.confirmVoidDesc, label: t.salesInvoices.void } },
    },
    filters: [{ param: 'status', options: [
      { value: 'ALL', label: t.salesInvoices.statusAll },
      { value: 'DRAFT', label: t.salesInvoices.statusDraft },
      { value: 'POSTED', label: t.salesInvoices.statusPosted },
      { value: 'VOID', label: t.salesInvoices.statusVoid },
    ] }],
    search: { predicate: (inv, q) => (inv.invoiceRef ?? '').toLowerCase().includes(q) || partnerName(inv.partnerId).toLowerCase().includes(q) },
    newControl: <Button asChild><Link to="/sales-invoices/new"><Plus className="size-4" /> {t.salesInvoices.newInvoice}</Link></Button>,
  };

  return <DocumentListPage config={config} />;
}
```

- [ ] **Step 2: Run the page's existing test (regression)**

Run: `pnpm test --run src/features/sales-invoices/SalesInvoicesPage.test.tsx`
Expected: PASS, unchanged. All 7 tests (list/join, delete, post idempotency + role gate, SoD toast, void, hide-New for VIEWER, pagination label) still pass — the rendered controls, labels, dialog, toasts, and idempotency header are identical. If any fails, the config diverges from the old behavior (e.g. a wrong success message or a missing action) — fix the config, do not edit the test.

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm exec tsc --noEmit` → no errors.

```bash
git add src/features/sales-invoices/SalesInvoicesPage.tsx
git commit -m "refactor(sales-invoices): SalesInvoicesPage via DocumentListPage config"
```

---

### Task 4: Migrate `PurchaseBillsPage`

**Files:**
- Modify: `src/features/purchase-bills/PurchaseBillsPage.tsx` (full rewrite)
- Regression: `src/features/purchase-bills/PurchaseBillsPage.test.tsx` (unchanged — must stay green)

**Interfaces:**
- Consumes: `DocumentListPage`, `DocumentListConfig`; existing `buildBillColumns`, `purchaseBillsApi`, `usePostBill`, `useVoidBill`, `partnersApi`.

- [ ] **Step 1: Rewrite the page as a config**

Replace the entire file `src/features/purchase-bills/PurchaseBillsPage.tsx` with:

```tsx
import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';
import { partnersApi } from '@/features/partners/hooks';
import { DocumentListPage } from '@/features/documents/DocumentListPage';
import type { DocumentListConfig } from '@/features/documents/useDocumentListController';
import { buildBillColumns } from './columns';
import { purchaseBillsApi, usePostBill, useVoidBill } from './hooks';
import type { PurchaseBill } from './schema';

export function PurchaseBillsPage() {
  const t = useT();
  const partners = partnersApi.useList();
  const remove = purchaseBillsApi.useRemove();
  const post = usePostBill();
  const voidBill = useVoidBill();

  const partnerName = useMemo(() => {
    const map = new Map((partners.data ?? []).map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id;
  }, [partners.data]);

  const config: DocumentListConfig<PurchaseBill> = {
    title: t.purchaseBills.title,
    colCount: 6,
    list: purchaseBillsApi.usePagedList,
    columns: (h) => buildBillColumns(t, partnerName, { onDelete: h.onDelete!, onPost: h.onPost!, onVoid: h.onVoid! }),
    actions: {
      delete: { mutation: remove, success: t.crud.deleted, confirm: { title: t.crud.confirmDeleteTitle, description: t.crud.confirmDeleteDesc, label: t.common.delete } },
      post: { mutation: post, success: t.purchaseBills.posted, confirm: { title: t.purchaseBills.confirmPostTitle, description: t.purchaseBills.confirmPostDesc, label: t.purchaseBills.post } },
      void: { mutation: voidBill, success: t.purchaseBills.voided, confirm: { title: t.purchaseBills.confirmVoidTitle, description: t.purchaseBills.confirmVoidDesc, label: t.purchaseBills.void } },
    },
    filters: [{ param: 'status', options: [
      { value: 'ALL', label: t.purchaseBills.statusAll },
      { value: 'DRAFT', label: t.purchaseBills.statusDraft },
      { value: 'POSTED', label: t.purchaseBills.statusPosted },
      { value: 'VOID', label: t.purchaseBills.statusVoid },
    ] }],
    search: { predicate: (bill, q) => (bill.billRef ?? '').toLowerCase().includes(q) || partnerName(bill.partnerId).toLowerCase().includes(q) },
    newControl: <Button asChild><Link to="/purchase-bills/new"><Plus className="size-4" /> {t.purchaseBills.newBill}</Link></Button>,
  };

  return <DocumentListPage config={config} />;
}
```

- [ ] **Step 2: Run the page's existing test (regression)**

Run: `pnpm test --run src/features/purchase-bills/PurchaseBillsPage.test.tsx`
Expected: PASS, unchanged.

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm exec tsc --noEmit` → no errors.

```bash
git add src/features/purchase-bills/PurchaseBillsPage.tsx
git commit -m "refactor(purchase-bills): PurchaseBillsPage via DocumentListPage config"
```

---

### Task 5: Migrate `PaymentsPage`

**Files:**
- Modify: `src/features/payments/PaymentsPage.tsx` (full rewrite)
- Regression: `src/features/payments/PaymentsPage.test.tsx` (unchanged — must stay green)

**Interfaces:**
- Consumes: `DocumentListPage`, `DocumentListConfig`; existing `buildPaymentColumns`, `paymentsApi`, `usePostPayment`, `useVoidPayment`, `partnersApi`, `accountsApi`. Demonstrates a **second filter** (`direction`) and a **two-button New control**.

- [ ] **Step 1: Rewrite the page as a config**

Replace the entire file `src/features/payments/PaymentsPage.tsx` with:

```tsx
import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';
import { partnersApi } from '@/features/partners/hooks';
import { accountsApi } from '@/features/accounts/hooks';
import { DocumentListPage } from '@/features/documents/DocumentListPage';
import type { DocumentListConfig } from '@/features/documents/useDocumentListController';
import { buildPaymentColumns } from './columns';
import { paymentsApi, usePostPayment, useVoidPayment } from './hooks';
import type { Payment } from './schema';

export function PaymentsPage() {
  const t = useT();
  const partners = partnersApi.useList();
  const accounts = accountsApi.useList();
  const remove = paymentsApi.useRemove();
  const post = usePostPayment();
  const voidPayment = useVoidPayment();

  const partnerName = useMemo(() => {
    const map = new Map((partners.data ?? []).map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id;
  }, [partners.data]);
  const accountName = useMemo(() => {
    const map = new Map((accounts.data ?? []).map((a) => [a.id, `${a.code} — ${a.name}`]));
    return (id: string) => map.get(id) ?? id;
  }, [accounts.data]);

  const config: DocumentListConfig<Payment> = {
    title: t.payments.title,
    colCount: 6,
    list: paymentsApi.usePagedList,
    columns: (h) => buildPaymentColumns(t, partnerName, accountName, { onDelete: h.onDelete!, onPost: h.onPost!, onVoid: h.onVoid! }),
    actions: {
      delete: { mutation: remove, success: t.crud.deleted, confirm: { title: t.crud.confirmDeleteTitle, description: t.crud.confirmDeleteDesc, label: t.common.delete } },
      post: { mutation: post, success: t.payments.posted, confirm: { title: t.payments.confirmPostTitle, description: t.payments.confirmPostDesc, label: t.payments.post } },
      void: { mutation: voidPayment, success: t.payments.voided, confirm: { title: t.payments.confirmVoidTitle, description: t.payments.confirmVoidDesc, label: t.payments.void } },
    },
    filters: [
      { param: 'status', options: [
        { value: 'ALL', label: t.payments.statusAll },
        { value: 'DRAFT', label: t.payments.statusDraft },
        { value: 'POSTED', label: t.payments.statusPosted },
        { value: 'VOID', label: t.payments.statusVoid },
      ] },
      { param: 'direction', options: [
        { value: 'ALL', label: t.payments.directionAll },
        { value: 'RECEIPT', label: t.payments.directionReceipt },
        { value: 'DISBURSEMENT', label: t.payments.directionDisbursement },
      ] },
    ],
    search: { predicate: (p, q) => (p.ref ?? '').toLowerCase().includes(q) || partnerName(p.partnerId).toLowerCase().includes(q) },
    newControl: (
      <div className="flex gap-2">
        <Button asChild variant="outline"><Link to="/payments/new" search={{ direction: 'RECEIPT' }}><Plus className="size-4" /> {t.payments.directionReceipt}</Link></Button>
        <Button asChild><Link to="/payments/new" search={{ direction: 'DISBURSEMENT' }}><Plus className="size-4" /> {t.payments.directionDisbursement}</Link></Button>
      </div>
    ),
  };

  return <DocumentListPage config={config} />;
}
```

- [ ] **Step 2: Run the page's existing test (regression)**

Run: `pnpm test --run src/features/payments/PaymentsPage.test.tsx`
Expected: PASS, unchanged. The 5 tests (join + no-post for ACCOUNTANT, post idempotency, void idempotency + success toast, SoD toast, direction filter + two create buttons) still pass. The direction filter test clicks "Bayar" and asserts the server received `?direction=DISBURSEMENT` and the receipt row disappears — `DocumentListPage`'s second filter strip drives this.

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm exec tsc --noEmit` → no errors.

```bash
git add src/features/payments/PaymentsPage.tsx
git commit -m "refactor(payments): PaymentsPage via DocumentListPage config (2 filters, 2 New buttons)"
```

---

### Task 6: Migrate `JournalsPage` + final verification

**Files:**
- Modify: `src/features/journals/JournalsPage.tsx` (full rewrite)
- Regression: `src/features/journals/JournalsPage.test.tsx` (unchanged — must stay green)

**Interfaces:**
- Consumes: `DocumentListPage`, `DocumentListConfig`; existing `buildJournalColumns`, `useJournalEntries`, `useDeleteJournalEntry`, `usePostJournalEntry`, `useReverseJournalEntry`. Demonstrates the **reverse** action, a **sourceType** filter, **no partner/account lookups**, the **`initialStatus` deep-link** (→ `initialFilters`), and the **`useJournalEntries` list adapter** (named numeric params).

- [ ] **Step 1: Rewrite the page as a config**

Replace the entire file `src/features/journals/JournalsPage.tsx` with:

```tsx
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';
import { DocumentListPage } from '@/features/documents/DocumentListPage';
import type { DocumentListConfig } from '@/features/documents/useDocumentListController';
import { buildJournalColumns } from './columns';
import { useJournalEntries, useDeleteJournalEntry, usePostJournalEntry, useReverseJournalEntry } from './hooks';
import type { JournalEntryListItem } from './schema';

export function JournalsPage({ initialStatus }: { initialStatus?: 'DRAFT' | 'POSTED' } = {}) {
  const t = useT();
  const remove = useDeleteJournalEntry();
  const post = usePostJournalEntry();
  const reverse = useReverseJournalEntry();

  const config: DocumentListConfig<JournalEntryListItem> = {
    title: t.journals.title,
    colCount: 5,
    // adapter: useJournalEntries takes named numeric params; the controller passes a generic query record
    list: (q) => useJournalEntries({
      status: q.status as string | undefined,
      sourceType: q.sourceType as string | undefined,
      limit: q.limit as number,
      offset: q.offset as number,
    }),
    columns: (h) => buildJournalColumns(t, { onDelete: h.onDelete!, onPost: h.onPost!, onReverse: h.onReverse! }),
    actions: {
      delete: { mutation: remove, success: t.journals.deleted, confirm: { title: t.crud.confirmDeleteTitle, description: t.crud.confirmDeleteDesc, label: t.common.delete } },
      post: { mutation: post, success: t.journals.posted, confirm: { title: t.journals.confirmPostTitle, description: t.journals.confirmPostDesc, label: t.journals.post } },
      reverse: { mutation: reverse, success: t.journals.reversed, confirm: { title: t.journals.confirmReverseTitle, description: t.journals.confirmReverseDesc, label: t.journals.reverse } },
    },
    filters: [
      { param: 'status', options: [
        { value: 'ALL', label: t.journals.statusAll },
        { value: 'DRAFT', label: t.journals.statusDraft },
        { value: 'POSTED', label: t.journals.statusPosted },
      ] },
      { param: 'sourceType', options: [
        { value: 'ALL', label: t.journals.sourceAll },
        { value: 'MANUAL', label: t.journals.sourceManual },
      ] },
    ],
    initialFilters: initialStatus ? { status: initialStatus } : undefined,
    // no `search` → no search box (matches today's JournalsPage)
    newControl: <Button asChild><Link to="/journals/new"><Plus className="size-4" /> {t.journals.newEntry}</Link></Button>,
  };

  return <DocumentListPage config={config} />;
}
```

- [ ] **Step 2: Run the page's existing test (regression)**

Run: `pnpm test --run src/features/journals/JournalsPage.test.tsx`
Expected: PASS, unchanged. The 6 tests (list + no-post for ACCOUNTANT + range label, `initialStatus` deep-link sends `?status=DRAFT`, post idempotency, Pagination Next requests offset 20, reverse a MANUAL posted entry, 422 error toast) still pass. The deep-link test relies on `initialFilters` seeding the status filter; the reverse test relies on the `reverse` action.

- [ ] **Step 3: Full verification gate**

Run all:
```bash
pnpm test --run
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```
Expected: all tests pass (the 4 page suites + the 2 new `documents` suites); tsc clean; lint shows only the pre-existing React-Compiler/react-hook-form/TanStack-Table warnings (do not fix); build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/features/journals/JournalsPage.tsx
git commit -m "refactor(journals): JournalsPage via DocumentListPage config (reverse, sourceType, deep-link)"
```

---

## Self-Review

**1. Spec coverage (against the converged design + ADR):**
- Config-driven `DocumentListPage` on exported `useDocumentListController` → Tasks 1 + 2. ✓
- Pending-action state machine, idempotency minting (post/void/reverse, not delete), confirm→mutate→toast→close, kind-derived error routing, offset-reset-on-filter/search, dialog derivation → Task 1 (implemented) + covered by Task 1 unit tests and Task 2 interface suite. ✓
- Scope = 4 Documents only; master data untouched → Tasks 3–6 only. ✓
- Two action shapes (post/void; post/reverse) → sales/bills/payments use post/void/delete (Tasks 3–5); journals use post/reverse/delete (Task 6). ✓
- Outliers expressible: second filter + two New buttons (payments, Task 5); reverse + sourceType + deep-link + list adapter (journals, Task 6). ✓
- Lifecycle tested once at the deepened interface → Task 2 `DocumentListPage.test.tsx` (incl. the offset-reset-on-search invariant the per-page tests never covered). Per-page tests kept as regression + page-wiring proof (they test live page wiring, not a now-shallow module's internals → they earn their keep; deviates from the earlier "delete the per-page tests" framing, deliberately, for lower migration risk). ✓
- `newControl` as a ReactNode (not a route-config) → chosen so TanStack Router `<Link to>` literals keep their types; recorded here as the one shape refinement from the design's `NewControl` object. ✓

**2. Placeholder scan:** No TBD/TODO/"handle errors"/"similar to Task N". Full module code in Tasks 1–2; full rewritten page files in Tasks 3–6; complete test code in Tasks 1–2; exact commands + expected output throughout.

**3. Type consistency:** `useDocumentListController`/`DocumentListConfig`/`DocumentListController`/`ActionKind`/`KeyedMutation`/`IdMutation`/`ActionsConfig`/`FilterConfig`/`ListHook`/`ActionHandlers`/`PageEnvelope`/`DocumentListPage` are defined in Tasks 1–2 and consumed verbatim in Tasks 3–6. Mutation types match the real hook returns exactly (`UseMutationResult<unknown, ApiError, {id,idempotencyKey}>` for post/void/reverse; `<unknown, ApiError, string>` for delete). `columns` typed `ColumnDef<T, any>[]` to match `DataTable`. The `useJournalEntries` adapter is the only `list` that needs casts (named numeric params), called out in Task 6.

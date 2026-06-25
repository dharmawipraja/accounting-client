# Split the Resource-Hooks Factory by Shape — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-size-fits-all `createResourceHooks` with two shape-matched factories — `createMasterDataHooks` (core + activate/deactivate) and `createDocumentHooks` (core + item) — over a shared private `createCrudHooks` core, eliminating ~10 dead hooks.

**Architecture:** A private `createCrudHooks` builds the 5 common hooks (list/pagedList/create/update/remove) + internal helpers; the two exported factories add their shape-specific hooks. Returned hook *names* are unchanged, so api-object consumers don't change — only which factory each feature calls. Behavior-preserving (hook bodies move verbatim).

**Tech Stack:** TypeScript (strict), TanStack Query v5, Zod, Vitest + RTL/MSW. In-process.

## Global Constraints

- **Pure, behavior-preserving — hook behavior and api-object hook names unchanged.** The full suite is the regression net. No user-facing change.
- **`pnpm run build`** (`tsc -b && vite build`) is the real typecheck (NOT `tsc --noEmit`) — it proves every consumer moved to the right factory and the two return shapes type-check. Run before each commit.
- **Lint** stays at 0 errors / the 8 pre-existing React-Compiler/react-hook-form/TanStack-Table warnings.
- `createResourceKeys` and the `ResourceKeys`/`ResourceConfig` types MUST remain exported from `src/lib/crud/createResourceHooks.ts` (card 5's `keys.ts` registry + 4 test files import `createResourceKeys` from there). No new dependencies.
- **Commands:** Build `pnpm run build` · Tests `pnpm test --run` · one file `pnpm test --run <path>` · Lint `pnpm run lint`.

## File Structure

- **`src/lib/crud/createResourceHooks.ts`** — Task 1 rewrites it: `ResourceConfig`/`ResourceKeys`/`createResourceKeys` unchanged; add private `createCrudHooks` + exported `createMasterDataHooks` + `createDocumentHooks`; keep `createResourceHooks` as a thin delegating shim (removed in Task 2).
- **6 feature `hooks.ts`** — Task 1 swaps the factory symbol (master vs document).
- **`src/features/documents/DocumentEditor.test.tsx`** — Task 1 swaps its synthetic factory to `createDocumentHooks`.
- **`src/lib/crud/createResourceHooks.test.tsx`** — Task 2 rewrite to test both factories.
- **`CONTEXT.md`** — Task 2 note.

---

### Task 1: Introduce the two factories + migrate consumers (shim keeps build green)

**Files:**
- Modify: `src/lib/crud/createResourceHooks.ts` (full rewrite of the factory section)
- Modify: `src/features/accounts/hooks.ts`, `src/features/partners/hooks.ts`, `src/features/tax-codes/hooks.ts` (→ `createMasterDataHooks`)
- Modify: `src/features/sales-invoices/hooks.ts`, `src/features/payments/hooks.ts`, `src/features/purchase-bills/hooks.ts` (→ `createDocumentHooks`)
- Modify: `src/features/documents/DocumentEditor.test.tsx` (→ `createDocumentHooks`)

**Interfaces:**
- Produces: `createMasterDataHooks<TItem,TCreate,TUpdate>(config)` → `{ keys, useList, usePagedList, useCreate, useUpdate, useRemove, useActivate, useDeactivate }`; `createDocumentHooks<TItem,TCreate,TUpdate>(config)` → `{ keys, useList, usePagedList, useItem, useCreate, useUpdate, useRemove }`. Both take the existing `ResourceConfig<TItem>`. `createResourceHooks` remains temporarily (delegating; returns all 9 as before).

This task keeps `createResourceHooks` working (now used only by its own test), so the build stays green.

- [ ] **Step 1: Rewrite the factory file**

Replace the body of `src/lib/crud/createResourceHooks.ts` from the `createResourceHooks` function (line 40) onward with the following (the imports, `ResourceConfig`, `ResourceKeys`, and `createResourceKeys` at the top of the file are UNCHANGED — keep them):

```ts
// Shared CRUD core: the hooks common to every resource shape. Not exported —
// consumed by the two shape-specific factories below.
function createCrudHooks<TItem, TCreate, TUpdate>(config: ResourceConfig<TItem>) {
  const { basePath, itemSchema, paginated = false } = config;
  const keys = config.keys;
  const listSchema = itemSchema.array();
  const envelopeSchema = z.object({
    data: listSchema,
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  });

  const invalidate = (qc: ReturnType<typeof useQueryClient>) =>
    qc.invalidateQueries({ queryKey: keys.all });

  function useList(): UseQueryResult<TItem[], ApiError> {
    return useQuery<TItem[], ApiError>({
      queryKey: keys.list(),
      queryFn: paginated
        ? async () => {
            const envelope = await apiFetch(basePath, {
              schema: envelopeSchema,
              query: { limit: 200 },
            });
            return envelope.data;
          }
        : () => apiFetch(basePath, { schema: listSchema }),
    });
  }

  type Envelope = { data: TItem[]; total: number; limit: number; offset: number };
  function usePagedList(
    query: Record<string, string | number | undefined> = {},
  ): UseQueryResult<Envelope, ApiError> {
    return useQuery<Envelope, ApiError>({
      queryKey: keys.list(query),
      queryFn: () => apiFetch(basePath, { schema: envelopeSchema, query }),
    });
  }

  function useCreate(): UseMutationResult<TItem, ApiError, TCreate> {
    const qc = useQueryClient();
    return useMutation<TItem, ApiError, TCreate>({
      mutationFn: (data) =>
        apiFetch(basePath, { method: 'POST', body: data, schema: itemSchema }),
      onSuccess: () => invalidate(qc),
    });
  }

  function useUpdate(): UseMutationResult<TItem, ApiError, { id: string; data: TUpdate }> {
    const qc = useQueryClient();
    return useMutation<TItem, ApiError, { id: string; data: TUpdate }>({
      mutationFn: ({ id, data }) =>
        apiFetch(`${basePath}/${id}`, { method: 'PATCH', body: data, schema: itemSchema }),
      onSuccess: () => invalidate(qc),
    });
  }

  function useRemove(): UseMutationResult<unknown, ApiError, string> {
    const qc = useQueryClient();
    return useMutation<unknown, ApiError, string>({
      mutationFn: (id) => apiFetch(`${basePath}/${id}`, { method: 'DELETE' }),
      onSuccess: () => invalidate(qc),
    });
  }

  return { keys, basePath, itemSchema, invalidate, useList, usePagedList, useCreate, useUpdate, useRemove };
}

// Master data (accounts, partners, tax codes): an activate/deactivate lifecycle,
// edited in dialogs (no standalone detail view, so no useItem).
export function createMasterDataHooks<TItem, TCreate = unknown, TUpdate = unknown>(
  config: ResourceConfig<TItem>,
) {
  const core = createCrudHooks<TItem, TCreate, TUpdate>(config);

  function useDeactivate(): UseMutationResult<unknown, ApiError, string> {
    const qc = useQueryClient();
    return useMutation<unknown, ApiError, string>({
      mutationFn: (id) => apiFetch(`${core.basePath}/${id}/deactivate`, { method: 'POST' }),
      onSuccess: () => core.invalidate(qc),
    });
  }

  // Reactivation: there is no `/activate` endpoint; the update DTOs accept an
  // optional `isActive`, so a partial PATCH flips the row back on.
  function useActivate(): UseMutationResult<unknown, ApiError, string> {
    const qc = useQueryClient();
    return useMutation<unknown, ApiError, string>({
      mutationFn: (id) => apiFetch(`${core.basePath}/${id}`, { method: 'PATCH', body: { isActive: true } }),
      onSuccess: () => core.invalidate(qc),
    });
  }

  return {
    keys: core.keys,
    useList: core.useList,
    usePagedList: core.usePagedList,
    useCreate: core.useCreate,
    useUpdate: core.useUpdate,
    useRemove: core.useRemove,
    useDeactivate,
    useActivate,
  };
}

// Documents (sales invoices, payments, purchase bills): a draft -> post -> void
// lifecycle (transitions via useDocumentAction) plus a detail view (useItem).
export function createDocumentHooks<TItem, TCreate = unknown, TUpdate = unknown>(
  config: ResourceConfig<TItem>,
) {
  const core = createCrudHooks<TItem, TCreate, TUpdate>(config);

  function useItem(id: string): UseQueryResult<TItem, ApiError> {
    return useQuery<TItem, ApiError>({
      queryKey: core.keys.item(id),
      queryFn: () => apiFetch(`${core.basePath}/${id}`, { schema: core.itemSchema }),
      enabled: !!id,
    });
  }

  return {
    keys: core.keys,
    useList: core.useList,
    usePagedList: core.usePagedList,
    useItem,
    useCreate: core.useCreate,
    useUpdate: core.useUpdate,
    useRemove: core.useRemove,
  };
}

// Transitional: the original union factory, kept so the build stays green while
// consumers migrate. Removed in the next task. Delegates — no duplicated bodies.
export function createResourceHooks<TItem, TCreate = unknown, TUpdate = unknown>(
  config: ResourceConfig<TItem>,
) {
  const master = createMasterDataHooks<TItem, TCreate, TUpdate>(config);
  const doc = createDocumentHooks<TItem, TCreate, TUpdate>(config);
  return { ...master, useItem: doc.useItem };
}
```

- [ ] **Step 2: Migrate the 3 master-data features**

In each of `src/features/accounts/hooks.ts`, `src/features/partners/hooks.ts`, `src/features/tax-codes/hooks.ts`:
- Line 1 import: `import { createResourceHooks } from '@/lib/crud/createResourceHooks';` → `import { createMasterDataHooks } from '@/lib/crud/createResourceHooks';`
- The call (line 5): `createResourceHooks<...>(` → `createMasterDataHooks<...>(`

- [ ] **Step 3: Migrate the 3 document features**

In `src/features/sales-invoices/hooks.ts`, `src/features/payments/hooks.ts`, `src/features/purchase-bills/hooks.ts`:
- Line 1 import: `createResourceHooks` → `createDocumentHooks`
- The call (sales-invoices:11, payments:6, purchase-bills:11): `createResourceHooks<...>(` → `createDocumentHooks<...>(`

(`accounts`/`partners`/`tax-codes`/`sales-invoices`/`payments`/`purchase-bills` consumers of the returned api objects are UNCHANGED — the hook names on each object are identical to before.)

- [ ] **Step 4: Migrate the document editor test harness**

In `src/features/documents/DocumentEditor.test.tsx`:
- Line 11: `import { createResourceHooks, createResourceKeys } from '@/lib/crud/createResourceHooks';` → `import { createDocumentHooks, createResourceKeys } from '@/lib/crud/createResourceHooks';`
- Line 21: `const testApi = createResourceHooks<TestItem, TestCreate, Partial<TestCreate>>({ ... })` → `const testApi = createDocumentHooks<TestItem, TestCreate, Partial<TestCreate>>({ ... })`

(`test-docs` is document-like — `DocumentEditor` uses `useCreate`/`useUpdate`/`useItem`, all present on `createDocumentHooks`.)

- [ ] **Step 5: Verify build + suite**

Run: `pnpm run build` → succeeds.
Run: `pnpm test --run` → all pass (api-object hook names unchanged; `createResourceHooks` still works via delegation and is now used only by its own test).

- [ ] **Step 6: Commit**

```bash
git add src/lib/crud/createResourceHooks.ts src/features/accounts/hooks.ts src/features/partners/hooks.ts src/features/tax-codes/hooks.ts src/features/sales-invoices/hooks.ts src/features/payments/hooks.ts src/features/purchase-bills/hooks.ts src/features/documents/DocumentEditor.test.tsx
git commit -m "refactor(crud): add createMasterDataHooks + createDocumentHooks over a shared core

Two shape-matched factories: master data gets activate/deactivate (no item),
documents get item (no activate/deactivate); shared createCrudHooks builds the
common list/pagedList/create/update/remove. Six features + the document editor
test harness migrated. createResourceHooks kept as a delegating shim (removed
next). Returned hook names unchanged; behavior identical."
```

---

### Task 2: Remove the shim + rewrite the factory test + CONTEXT.md (final gate)

**Files:**
- Modify: `src/lib/crud/createResourceHooks.ts` (remove the transitional `createResourceHooks`)
- Modify: `src/lib/crud/createResourceHooks.test.tsx` (rewrite to test both factories)
- Modify: `CONTEXT.md`

**Interfaces:**
- Consumes: `createMasterDataHooks`, `createDocumentHooks`, `createResourceKeys` (Task 1).
- Produces: nothing new — finalizes the split.

- [ ] **Step 1: Remove the transitional shim**

In `src/lib/crud/createResourceHooks.ts`, delete the entire `createResourceHooks` function added in Task 1 (the "Transitional: the original union factory" block). Leave `createCrudHooks`, `createMasterDataHooks`, `createDocumentHooks`, `createResourceKeys`, and the types.

- [ ] **Step 2: Rewrite the factory test**

Replace the entire `src/lib/crud/createResourceHooks.test.tsx` with:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { createMasterDataHooks, createDocumentHooks, createResourceKeys } from './createResourceHooks';
import { partnersApi } from '@/features/partners/hooks';

const widgetSchema = z.object({ id: z.string(), name: z.string() });
type Widget = z.infer<typeof widgetSchema>;
const cfg = (key: string, basePath: string) => ({ keys: createResourceKeys(key), basePath, itemSchema: widgetSchema });
const masterWidgets = createMasterDataHooks<Widget, { name: string }, { name: string }>(cfg('widgets', '/widgets'));
const docWidgets = createDocumentHooks<Widget, { name: string }, { name: string }>(cfg('docwidgets', '/docwidgets'));

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
    expect(k.list()).toEqual(['widgets', 'list', undefined]);
    expect(k.list({ limit: 10 })).toEqual(['widgets', 'list', { limit: 10 }]);
    expect(k.item('7')).toEqual(['widgets', 'item', '7']);
  });
});

describe('createMasterDataHooks', () => {
  it('exposes activate/deactivate and no detail-item hook', () => {
    expect(masterWidgets).toHaveProperty('useActivate');
    expect(masterWidgets).toHaveProperty('useDeactivate');
    expect(masterWidgets).not.toHaveProperty('useItem');
  });

  it('useList fetches and parses a bare array', async () => {
    server.use(http.get(`${API}/widgets`, () => HttpResponse.json([{ id: '1', name: 'A' }])));
    const { result } = renderHook(() => masterWidgets.useList(), { wrapper });
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
      () => ({ list: masterWidgets.useList(), create: masterWidgets.useCreate() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(1));
    await result.current.create.mutateAsync({ name: 'B' });
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
  });

  it('useDeactivate posts to /:id/deactivate', async () => {
    let hit = '';
    server.use(http.post(`${API}/widgets/9/deactivate`, () => { hit = 'deactivate'; return HttpResponse.json({}); }));
    const { result } = renderHook(() => masterWidgets.useDeactivate(), { wrapper });
    await result.current.mutateAsync('9');
    expect(hit).toBe('deactivate');
  });

  it('useRemove deletes /:id', async () => {
    let method = '';
    server.use(http.delete(`${API}/widgets/9`, () => { method = 'DELETE'; return HttpResponse.json({}); }));
    const { result } = renderHook(() => masterWidgets.useRemove(), { wrapper });
    await result.current.mutateAsync('9');
    expect(method).toBe('DELETE');
  });
});

describe('createDocumentHooks', () => {
  it('exposes a detail-item hook and no activate/deactivate', () => {
    expect(docWidgets).toHaveProperty('useItem');
    expect(docWidgets).not.toHaveProperty('useActivate');
    expect(docWidgets).not.toHaveProperty('useDeactivate');
  });

  it('useItem fetches and parses a single item', async () => {
    server.use(http.get(`${API}/docwidgets/9`, () => HttpResponse.json({ id: '9', name: 'Z' })));
    const { result } = renderHook(() => docWidgets.useItem('9'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: '9', name: 'Z' });
  });

  it('useRemove deletes /:id', async () => {
    let method = '';
    server.use(http.delete(`${API}/docwidgets/9`, () => { method = 'DELETE'; return HttpResponse.json({}); }));
    const { result } = renderHook(() => docWidgets.useRemove(), { wrapper });
    await result.current.mutateAsync('9');
    expect(method).toBe('DELETE');
  });
});

it('usePagedList returns the envelope and forwards limit/offset query params', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let seenLimit: string | null = null;
  let seenOffset: string | null = null;
  server.use(http.get(`${API}/partners`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    seenLimit = u.get('limit'); seenOffset = u.get('offset');
    return HttpResponse.json({ data: [], total: 7, limit: 20, offset: 20 });
  }));
  const { result } = renderHook(() => partnersApi.usePagedList({ limit: 20, offset: 20 }), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.total).toBe(7);
  expect(seenLimit).toBe('20');
  expect(seenOffset).toBe('20');
});
```

- [ ] **Step 3: Add a CONTEXT.md note**

In `CONTEXT.md`, under the existing Document / master-data vocabulary, add a short entry (match the file's style):

```markdown
**Resource-hooks factories** *(decision 2026-06-26)*
The CRUD hook factory is split along the Document / master-data line over a shared
private `createCrudHooks` core (list/pagedList/create/update/remove): `createMasterDataHooks`
adds activate/deactivate (no detail view) for accounts/partners/tax-codes;
`createDocumentHooks` adds `useItem` (no activate/deactivate) for sales-invoices/payments/
purchase-bills, whose draft/post/void lifecycle transitions go through `useDocumentAction`.
```

- [ ] **Step 4: Verify no `createResourceHooks` reference remains**

Run: `grep -rn "createResourceHooks\b" src`
Expected: ONLY matches for the FILENAME path `@/lib/crud/createResourceHooks` in import statements (the module is still named that) and `./createResourceHooks` in the test — NO reference to the removed `createResourceHooks` *function* (no `createResourceHooks<` call, no `createResourceHooks }` / `, createResourceHooks` import of the symbol). If the symbol is still imported/called anywhere, fix it.

- [ ] **Step 5: Full verification gate**

Run all:
```bash
pnpm run build
pnpm test --run
pnpm run lint
```
Expected: build succeeds (real `tsc -b` — confirms the removed function has no remaining callers and both factories type-check at all 6 features + the editor harness); full suite passes (the rewritten factory test + all feature/page tests); lint = 0 errors / 8 pre-existing warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/crud/createResourceHooks.ts src/lib/crud/createResourceHooks.test.tsx CONTEXT.md
git commit -m "refactor(crud): remove the createResourceHooks shim; test the two factories

Deletes the transitional union factory now that all consumers use the
shape-specific factories; rewrites the factory test to cover createMasterDataHooks
(activate/deactivate, no item) and createDocumentHooks (item, no activate/deactivate)
plus the shared core behaviors. Documents the split in CONTEXT.md."
```

---

## Self-Review

**1. Spec coverage:**
- Private `createCrudHooks` core + `createMasterDataHooks` (+activate/deactivate, no item) + `createDocumentHooks` (+item, no activate/deactivate) → Task 1 Step 1. ✓
- `createResourceKeys`/`ResourceKeys`/`ResourceConfig` stay exported → unchanged top of file. ✓
- 6 feature configs migrated; api-object hook names unchanged → Task 1 Steps 2–3. ✓
- Document editor test harness → `createDocumentHooks` → Task 1 Step 4. ✓
- Factory test rewritten to exercise both factories (same behaviors + shape checks) → Task 2 Step 2. ✓
- `createResourceHooks` removed; CONTEXT.md note → Task 2 Steps 1, 3. ✓
- Behavior-preserving; build is the gate → Global Constraints + Task 2 Step 5. ✓
- **Spec correction:** the spec said "2 document test harnesses" switch to `createDocumentHooks`; in fact only `DocumentEditor.test` constructs the factory — `DocumentListPage.test` imports only `createResourceKeys` (unaffected). Handled (Task 1 Step 4 lists only `DocumentEditor.test`).

**2. Placeholder scan:** No TBD/vague steps. Full factory file body, exact per-file import/call edits, the complete rewritten test, the CONTEXT.md block, and a grep + full-gate verification.

**3. Type consistency:** Both factories take `ResourceConfig<TItem>` and `<TItem, TCreate = unknown, TUpdate = unknown>` — same generics as the old `createResourceHooks`. `createMasterDataHooks` returns the 8 members master-data consumers already use (`useDeactivate`/`useActivate`/`useRemove`/`useList`/`usePagedList`/`useCreate`/`useUpdate` + `keys`); `createDocumentHooks` returns the 7 document consumers use (`useItem`/`useRemove`/`useList`/`usePagedList`/`useCreate`/`useUpdate` + `keys`). The transitional `createResourceHooks` (Task 1 only) returns the union (all 9), identical to today. `createCrudHooks` exposes `basePath`/`itemSchema`/`invalidate` internally for the two factories to build their extra hooks; these are not re-exposed on the public objects.

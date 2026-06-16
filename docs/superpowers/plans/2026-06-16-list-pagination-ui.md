# List Pagination UI (Plan 12) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real server-side pagination to the four enveloped list pages (Partners, Sales Invoices, Purchase Bills, Payments) — `LIMIT=20` + the existing `Pagination` component, status/direction filters server-side, text search scoped to the current page.

**Architecture:** Add `usePagedList` to the `createResourceHooks` factory (returns the `{data,total,limit,offset}` envelope); the 4 pages switch from the wholesale `useList()` to `usePagedList(...)`. `useList()` stays for the select dropdowns + payment allocation. MSW handlers gain status/direction filtering so tests verify server-side filtering.

**Tech Stack:** React 19, TanStack Query v5, shadcn/ui, Vitest 4 + RTL + MSW v2.

**Reference spec:** `docs/superpowers/specs/2026-06-16-list-pagination-ui-design.md`

---

### Task 1: `usePagedList` factory hook + i18n key

**Files:**
- Modify: `src/lib/crud/createResourceHooks.ts`
- Modify: `src/lib/i18n/messages.id.ts`
- Test: `src/lib/crud/createResourceHooks.test.tsx` (new)

- [ ] **Step 1: Make `createResourceKeys.list` accept optional params.** In `src/lib/crud/createResourceHooks.ts`, update the interface and factory:

```ts
export interface ResourceKeys {
  all: readonly unknown[];
  list: (params?: unknown) => readonly unknown[];
  item: (id: string) => readonly unknown[];
}

export function createResourceKeys(key: string): ResourceKeys {
  return {
    all: [key],
    list: (params?: unknown) => [key, 'list', params],
    item: (id: string) => [key, 'item', id],
  };
}
```

(`useList()` already calls `keys.list()` → now `[key,'list',undefined]`; backward-compatible. Invalidation via `keys.all` = `[key]` still prefix-matches.)

- [ ] **Step 2: Add `usePagedList` to the factory.** Inside `createResourceHooks`, after the `useList` function (the `envelopeSchema` const already exists above), add:

```ts
  type Envelope = { data: TItem[]; total: number; limit: number; offset: number };
  function usePagedList(
    query: Record<string, string | number | undefined> = {},
  ): UseQueryResult<Envelope, ApiError> {
    return useQuery<Envelope, ApiError>({
      queryKey: keys.list(query),
      queryFn: () => apiFetch(basePath, { schema: envelopeSchema, query }),
    });
  }
```

(The explicit `<Envelope, ApiError>` generics match how `useList` is typed — without them, `useQuery` infers the error as `Error`, which won't satisfy the `ApiError` return annotation. `envelopeSchema` infers to exactly `Envelope`.)
```

And add `usePagedList` to the returned object (currently `return { keys, useList, useItem, useCreate, useUpdate, useDeactivate, useRemove };`):

```ts
  return { keys, useList, usePagedList, useItem, useCreate, useUpdate, useDeactivate, useRemove };
```

- [ ] **Step 3: Add the i18n key.** In `src/lib/i18n/messages.id.ts`, add to the `common` group:

```ts
    searchOnThisPage: 'Pencarian berlaku untuk halaman ini',
```

- [ ] **Step 4: Write the test** — `src/lib/crud/createResourceHooks.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { partnersApi } from '@/features/partners/hooks';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

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

- [ ] **Step 5: Verify** — `pnpm test --run src/lib/crud/createResourceHooks.test.tsx` (PASS, 1 test) and `pnpm build` (succeeds).

- [ ] **Step 6: Commit**
```bash
git add src/lib/crud/createResourceHooks.ts src/lib/i18n/messages.id.ts src/lib/crud/createResourceHooks.test.tsx
git commit -m "feat(crud): usePagedList factory hook (envelope + query params)"
```

---

### Task 2: MSW handlers — server-side status/direction filtering

**Files:** Modify `src/test/handlers.ts`

The four enveloped handlers currently only slice by `limit`/`offset`. Add filtering by the supported params **before** slicing (the `/partners` handler has no status filter and stays as-is).

- [ ] **Step 1:** Update the `GET /sales-invoices` and `GET /purchase-bills` handlers (around lines 175 and 231) to filter by `status`:

```ts
  http.get(`${API}/sales-invoices`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    let data = salesInvoiceFixtures();
    const status = u.get('status'); if (status) data = data.filter((x) => x.status === status);
    const limit = Number(u.get('limit') ?? '50');
    const offset = Number(u.get('offset') ?? '0');
    return HttpResponse.json({ data: data.slice(offset, offset + limit), total: data.length, limit, offset });
  }),
```

(and the same shape for `purchase-bills` with `purchaseBillFixtures()`.)

- [ ] **Step 2:** Update the `GET /payments` handler (around line 210) to filter by `status` **and** `direction`:

```ts
  http.get(`${API}/payments`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    let data = paymentFixtures();
    const status = u.get('status'); if (status) data = data.filter((x) => x.status === status);
    const direction = u.get('direction'); if (direction) data = data.filter((x) => x.direction === direction);
    const limit = Number(u.get('limit') ?? '50');
    const offset = Number(u.get('offset') ?? '0');
    return HttpResponse.json({ data: data.slice(offset, offset + limit), total: data.length, limit, offset });
  }),
```

(Use the actual fixture helper names already in the file — read each handler to match. Keep `/partners` unchanged.)

- [ ] **Step 3: Verify** — `pnpm test --run` (the full suite stays GREEN — these handlers are additive filters; the pages don't yet send `status`/`direction` as query params, so current behavior is unchanged).

- [ ] **Step 4: Commit**
```bash
git add src/test/handlers.ts
git commit -m "test(lists): MSW handlers filter sales-invoices/purchase-bills/payments by status/direction"
```

---

### Task 3: `PartnersPage` — pagination

**Files:**
- Modify: `src/features/partners/PartnersPage.tsx`
- Test: `src/features/partners/PartnersPage.test.tsx`

- [ ] **Step 1: Edit the page.** In `src/features/partners/PartnersPage.tsx`:

Add the import:
```tsx
import { Pagination } from '@/components/common/Pagination';
```
Add a module-level const (after the imports):
```tsx
const LIMIT = 20;
```
Replace `const list = partnersApi.useList();` with:
```tsx
  const [offset, setOffset] = useState(0);
  const page = partnersApi.usePagedList({ limit: LIMIT, offset });
```
Replace the `rows` memo:
```tsx
  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (page.data?.data ?? []).filter((p) => !q || p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  }, [page.data, search]);
```
Replace the search `<div className="mb-4 max-w-xs">…</div>` block with one that adds the hint:
```tsx
      <div className="mb-4 max-w-xs space-y-1">
        <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <p className="text-xs text-muted-foreground">{t.common.searchOnThisPage}</p>
      </div>
```
Replace the list render block:
```tsx
      {page.isLoading ? <Skeleton className="h-40 w-full" />
        : page.isError ? <ErrorState error={page.error} />
        : <>
            <DataTable columns={columns} data={rows} />
            <Pagination offset={offset} limit={LIMIT} total={page.data?.total ?? 0} onChange={setOffset} />
          </>}
```

- [ ] **Step 2: Update the test.** In `src/features/partners/PartnersPage.test.tsx`, add a pagination case (the two existing tests still pass — the `/partners` handler returns an envelope). Add:

```tsx
it('paginates: shows the count and advances offset on Berikutnya', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  const base = partnerFixtures()[0]; // guarantees a partnerSchema-valid shape
  const many = Array.from({ length: 25 }, (_, i) => ({ ...base, id: `p${i}`, code: `C${i}`, name: `Partner ${i}` }));
  let seenOffset: string | null = null;
  server.use(http.get(`${API}/partners`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    seenOffset = u.get('offset');
    const limit = Number(u.get('limit') ?? '20');
    const offset = Number(u.get('offset') ?? '0');
    return HttpResponse.json({ data: many.slice(offset, offset + limit), total: many.length, limit, offset });
  }));
  const { default: userEvent } = await import('@testing-library/user-event');
  renderPage();
  expect(await screen.findByText('Partner 0')).toBeInTheDocument();
  expect(screen.getByText(/Menampilkan 1.*25/)).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('button', { name: /berikutnya/i }));
  await waitFor(() => expect(seenOffset).toBe('20'));
});
```

Update this file's imports: add `waitFor` to the `@testing-library/react` import (it currently imports `render, screen`) and add `partnerFixtures` to the `@/test/handlers` import (currently `{ API }`). Spreading `partnerFixtures()[0]` guarantees each `many` row satisfies `partnerSchema`, so the envelope parse won't throw.

- [ ] **Step 3: Run tests** — `pnpm test --run src/features/partners/PartnersPage.test.tsx` (PASS).

- [ ] **Step 4: Commit**
```bash
git add src/features/partners/PartnersPage.tsx src/features/partners/PartnersPage.test.tsx
git commit -m "feat(partners): paginated list page"
```

---

### Task 4: `SalesInvoicesPage` — pagination + server status filter

**Files:**
- Modify: `src/features/sales-invoices/SalesInvoicesPage.tsx`
- Test: `src/features/sales-invoices/SalesInvoicesPage.test.tsx`

- [ ] **Step 1: Edit the page.** In `src/features/sales-invoices/SalesInvoicesPage.tsx`:

Add import `import { Pagination } from '@/components/common/Pagination';` and module const `const LIMIT = 20;`.

Replace `const list = salesInvoicesApi.useList();` with:
```tsx
  const [offset, setOffset] = useState(0);
```
and add the paged query AFTER the `status` state is declared (so it can reference it). Replace the existing line `const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');` region by inserting, just after the `setAction` state line:
```tsx
  const page = salesInvoicesApi.usePagedList({ limit: LIMIT, offset, status: status === 'ALL' ? undefined : status });
```

Replace the `rows` memo (status moves server-side — keep only the text search):
```tsx
  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (page.data?.data ?? []).filter((inv) =>
      !q || (inv.invoiceRef ?? '').toLowerCase().includes(q) || partnerName(inv.partnerId).toLowerCase().includes(q));
  }, [page.data, search, partnerName]);
```

Change the status filter button `onClick` to reset offset:
```tsx
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => { setStatus(s); setOffset(0); }}>
```

Add the search hint — change the search `<Input … />` to wrap with the hint (inside the existing `flex flex-wrap gap-2` filter row, replace the bare `<Input>` with):
```tsx
        <div className="max-w-xs space-y-1">
          <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
          <p className="text-xs text-muted-foreground">{t.common.searchOnThisPage}</p>
        </div>
```

Replace the list render block:
```tsx
      {page.isLoading ? <Skeleton className="h-40 w-full" />
        : page.isError ? <ErrorState error={page.error} />
        : <>
            <DataTable columns={columns} data={rows} />
            <Pagination offset={offset} limit={LIMIT} total={page.data?.total ?? 0} onChange={setOffset} />
          </>}
```

- [ ] **Step 2: Update the test.** Read `src/features/sales-invoices/SalesInvoicesPage.test.tsx`. Its existing status-filter assertion now works server-side (Task 2 made the handler filter by `status`), so it should still pass — run it first and adapt only if a case relied on client-side filtering of a mixed array on one page. Add a pagination assertion (the `Pagination` "Menampilkan …" label renders). If the test renders without a router but the page uses `<Link>`, it already has a router stub — keep it.

- [ ] **Step 3: Run tests** — `pnpm test --run src/features/sales-invoices/SalesInvoicesPage.test.tsx` (PASS).

- [ ] **Step 4: Commit**
```bash
git add src/features/sales-invoices/SalesInvoicesPage.tsx src/features/sales-invoices/SalesInvoicesPage.test.tsx
git commit -m "feat(sales-invoices): paginated list + server status filter"
```

---

### Task 5: `PurchaseBillsPage` — pagination + server status filter

**Files:**
- Modify: `src/features/purchase-bills/PurchaseBillsPage.tsx`
- Test: `src/features/purchase-bills/PurchaseBillsPage.test.tsx`

`PurchaseBillsPage` mirrors `SalesInvoicesPage` (it uses `purchaseBillsApi`, `billRef`, `buildBillColumns`). Apply the identical transform:

- [ ] **Step 1: Edit the page.** In `src/features/purchase-bills/PurchaseBillsPage.tsx`:
  - Add `import { Pagination } from '@/components/common/Pagination';` and `const LIMIT = 20;`.
  - Replace `const list = purchaseBillsApi.useList();` with `const [offset, setOffset] = useState(0);` and add, after the `setAction` state line:
    ```tsx
    const page = purchaseBillsApi.usePagedList({ limit: LIMIT, offset, status: status === 'ALL' ? undefined : status });
    ```
  - Replace the `rows` memo to read `(page.data?.data ?? [])`, drop the status check, keep the text search (matching on `billRef` + `partnerName`), deps `[page.data, search, partnerName]`.
  - Status button `onClick={() => { setStatus(s); setOffset(0); }}`.
  - Wrap the search `<Input>` with the `searchOnThisPage` hint (as in Task 4).
  - Replace the render block: `page.isLoading`/`page.isError`/`page.error`, `<DataTable data={rows} />` + `<Pagination offset={offset} limit={LIMIT} total={page.data?.total ?? 0} onChange={setOffset} />`.

  (Read the file first; it is the structural twin of `SalesInvoicesPage.tsx` with `bill`/`billRef`/`purchaseBills` substitutions.)

- [ ] **Step 2: Update the test** — `src/features/purchase-bills/PurchaseBillsPage.test.tsx`: same as Task 4 — the server status filter (Task 2) keeps the existing status assertion working; add a `Pagination` label assertion. Run first, adapt only if needed.

- [ ] **Step 3: Run tests** — `pnpm test --run src/features/purchase-bills/PurchaseBillsPage.test.tsx` (PASS).

- [ ] **Step 4: Commit**
```bash
git add src/features/purchase-bills/PurchaseBillsPage.tsx src/features/purchase-bills/PurchaseBillsPage.test.tsx
git commit -m "feat(purchase-bills): paginated list + server status filter"
```

---

### Task 6: `PaymentsPage` — pagination + server status & direction filters

**Files:**
- Modify: `src/features/payments/PaymentsPage.tsx`
- Test: `src/features/payments/PaymentsPage.test.tsx`

- [ ] **Step 1: Edit the page.** In `src/features/payments/PaymentsPage.tsx`:

Add `import { Pagination } from '@/components/common/Pagination';` and `const LIMIT = 20;`.

Replace `const list = paymentsApi.useList();` with `const [offset, setOffset] = useState(0);`, and add (after the `direction` + `setAction` state lines):
```tsx
  const page = paymentsApi.usePagedList({
    limit: LIMIT,
    offset,
    status: status === 'ALL' ? undefined : status,
    direction: direction === 'ALL' ? undefined : direction,
  });
```

Replace the `rows` memo (both status AND direction move server-side — keep only the text search):
```tsx
  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (page.data?.data ?? []).filter((p) =>
      !q || (p.ref ?? '').toLowerCase().includes(q) || partnerName(p.partnerId).toLowerCase().includes(q));
  }, [page.data, search, partnerName]);
```

Reset offset on both filters:
```tsx
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => { setStatus(s); setOffset(0); }}>
```
```tsx
            <Button key={d} size="sm" variant={direction === d ? 'default' : 'outline'} onClick={() => { setDirection(d); setOffset(0); }}>
```

Wrap the search `<Input>` with the hint (as in Task 4).

Replace the render block: `page.isLoading`/`page.isError`/`page.error`, `<DataTable data={rows} />` + `<Pagination offset={offset} limit={LIMIT} total={page.data?.total ?? 0} onChange={setOffset} />`.

- [ ] **Step 2: Update the test** — `src/features/payments/PaymentsPage.test.tsx`: the existing status/direction assertions now run server-side (Task 2 handler filters both); run first and adapt only if a case relied on client filtering of a mixed page. Add a `Pagination` label assertion.

- [ ] **Step 3: Run tests** — `pnpm test --run src/features/payments/PaymentsPage.test.tsx` (PASS).

- [ ] **Step 4: Commit**
```bash
git add src/features/payments/PaymentsPage.tsx src/features/payments/PaymentsPage.test.tsx
git commit -m "feat(payments): paginated list + server status/direction filters"
```

---

### Task 7: Full verification

- [ ] **Step 1:** `pnpm test --run` — expect all green (~223 + the new createResourceHooks test + any added page-pagination cases; no test removed).
- [ ] **Step 2:** `pnpm lint` — 0 errors (pre-existing react-compiler/react-hook-form warnings acceptable; introduce no NEW errors).
- [ ] **Step 3:** `pnpm build` — success (`tsc -b && vite build`).
- [ ] **Step 4: Dev smoke (optional)** — `pnpm dev`, log in, open each of the 4 lists: confirm rows + the "Menampilkan 1–N dari {total}" label render, the status/direction filters re-query the server (offset resets), Berikutnya/Sebelumnya page, and the search box filters the current page. (Read-only — no SoD concerns.) Stop the server.
- [ ] **Step 5: Commit** (only if Step 1-3 required any fixups)
```bash
git add -A && git commit -m "chore(lists): pagination UI verification fixups"
```

---

## Done Criteria

- Partners / Sales Invoices / Purchase Bills / Payments each page server-side via `usePagedList` + the `Pagination` component (`LIMIT=20`); status (and payments' direction) filter server-side and reset to page 1; the text search filters the current page with a clarifying hint.
- `useList()`, the select dropdowns, and `useOpenDocuments` are unchanged (still wholesale).
- All tests pass; lint clean; build green. No route changes.

## Out of Scope (YAGNI)

Server-side free-text search (API has none), a `partnerId` filter control, paginating the dropdowns / payment allocation, a configurable page size, URL-synced offset.

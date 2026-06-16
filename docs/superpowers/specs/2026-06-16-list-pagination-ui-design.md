# List Pagination UI (Plan 12) — Design

**Plan:** 12 — Real server-side pagination on the four enveloped list pages (Partners, Sales Invoices, Purchase Bills, Payments), following the API v1 migration (which made these endpoints return `{data,total,limit,offset}` but left the pages loading the first 200 with no pager).

**Status:** approved design, pre-implementation.

**Context:** The v1 migration (`ed007f5`) added envelope unwrapping (`createResourceHooks` `paginated:true` → `useList` returns the first 200 as an array). This slice adds the actual pager UI so lists are reachable beyond 200, with the status/direction filters moved server-side for accuracy. Verified live (2026-06-16): the four lists are enveloped; `?status=` and `?direction=` filter server-side; the real status values are exact (`DRAFT`/`POSTED`/`VOID`).

---

## Purpose

Turn the four enveloped list pages into properly paged lists: page through all rows (not just the first 200), with server-side `status`/`direction` filtering (accurate across pages) and a current-page client-side text search. Reuse the existing `Pagination` component and the journals pagination pattern.

---

## Decision (approved)

**Option A:** server-side pagination + server-side status/direction filters; the existing text-search box stays but filters only the loaded page (the API has no free-text search). `PartnerSelect`/`AccountSelect`/`TaxCodeMultiSelect` and `useOpenDocuments` keep loading wholesale (they need all items).

---

## Architecture

### 1. `usePagedList` — new factory hook (`src/lib/crud/createResourceHooks.ts`)

`useList()` (wholesale, `limit:200`, returns `TItem[]`) is **unchanged** — it backs the select dropdowns and payment allocation. A new sibling hook serves the list *pages*:

- Make `createResourceKeys.list` accept an optional params arg so paged queries cache per-(filter,offset) and stay distinct from the wholesale list:
  ```ts
  // in createResourceKeys
  list: (params?: unknown) => [key, 'list', params] as const,
  ```
  (`useList()` calls `keys.list()` → `[key,'list',undefined]`; backward-compatible.)
- Add `usePagedList` to the factory's returned object:
  ```ts
  function usePagedList(
    query: Record<string, string | number | undefined> = {},
  ): UseQueryResult<{ data: TItem[]; total: number; limit: number; offset: number }, ApiError> {
    return useQuery({
      queryKey: keys.list(query),
      queryFn: () => apiFetch(basePath, { schema: envelopeSchema, query }),
    });
  }
  ```
  `envelopeSchema` already exists in the factory. Return `usePagedList` alongside `useList`/`useItem`/etc.
- Invalidation is unchanged: mutations invalidate `keys.all` (`[key]`), which prefix-matches **both** `[key,'list',undefined]` and `[key,'list',query]` — so create/update/void/deactivate refresh the pages and the dropdowns.

(Only the four paginated features call `usePagedList`. `accounts`/`tax-codes` never do — they remain bare via `useList`.)

### 2. The four list pages

Pattern (mirrors `JournalsPage`): `const LIMIT = 20;` + `const [offset, setOffset] = useState(0);`

| Page | `usePagedList(query)` | Server filters | Client (page-scoped) |
|---|---|---|---|
| `PartnersPage` | `{ limit, offset }` | — | text search (code/name) |
| `SalesInvoicesPage` | `{ limit, offset, status? }` | `status` | text search (ref/partner) |
| `PurchaseBillsPage` | `{ limit, offset, status? }` | `status` | text search (ref/partner) |
| `PaymentsPage` | `{ limit, offset, status?, direction? }` | `status`, `direction` | text search (ref/partner) |

- `status` passes the **exact** value (`DRAFT`/`POSTED`/`VOID`) to `?status=` when ≠ `ALL` (drop the old `startsWith('VOID')` client workaround — confirmed unnecessary). `direction` passes `RECEIPT`/`DISBURSEMENT` when ≠ `ALL`.
- A status/direction filter change calls `setOffset(0)` (reset to page 1). A `pick(setter, value)` helper does `setter(value); setOffset(0)` (as in journals).
- Render:
  ```tsx
  const rows = (page.data?.data ?? []).filter(/* client text search only */);
  // … Skeleton/ErrorState on page.isLoading/isError …
  <DataTable columns={columns} data={rows} />
  <Pagination offset={offset} limit={LIMIT} total={page.data?.total ?? 0} onChange={setOffset} />
  ```
- A muted hint next to the search input: `t.common.searchOnThisPage` ("Pencarian berlaku untuk halaman ini").
- `partnerName` lookups still use `partnersApi.useList()` (wholesale) — unchanged.

**Unchanged:** `PartnerSelect`/`AccountSelect`/`TaxCodeMultiSelect`, `useOpenDocuments` (still `useList`, wholesale ≤200).

### 3. MSW handlers (`src/test/handlers.ts`)

The four enveloped handlers currently only slice by `limit`/`offset`. Add filtering of the fixture array by the supported params **before** slicing, so tests exercise real server-side filtering and `total` reflects the filtered count:
- `/partners` — (no status filter; unchanged except already-enveloped).
- `/sales-invoices`, `/purchase-bills` — filter by `status` when present.
- `/payments` — filter by `status` and `direction` when present.

```ts
// pattern inside each handler, before slicing:
const u = new URL(request.url).searchParams;
let data = <fixtures>();
const status = u.get('status'); if (status) data = data.filter((x) => x.status === status);
const direction = u.get('direction'); if (direction) data = data.filter((x) => x.direction === direction); // payments only
const limit = Number(u.get('limit')) || 50;
const offset = Number(u.get('offset')) || 0;
return HttpResponse.json({ data: data.slice(offset, offset + limit), total: data.length, limit, offset });
```

---

## i18n

One new key in the `common` group: `searchOnThisPage: 'Pencarian berlaku untuk halaman ini'`. (`common.paginationShowing`, `common.prev`, `common.next` already exist for `Pagination`.)

---

## Data flow

1. Page mounts → `offset=0`, filters at defaults → `usePagedList({ limit:20, offset:0, … })` → envelope.
2. Render page 1's `data` (after client text-search) + `Pagination` showing `1–N of total`.
3. Changing a status/direction filter → server refetch under the new query key, `offset` reset to 0.
4. **Berikutnya**/**Sebelumnya** → `setOffset(offset ± 20)` → refetch that page.
5. Typing in search → filters the currently-loaded page only (hint clarifies).

## Error & edge handling

- `page.isLoading` → `Skeleton`; `page.isError` → `ErrorState` (with `traceId`).
- Empty page → `DataTable` empty state; `Pagination` shows `0` / disables next.
- `Pagination` already guards: prev disabled at `offset<=0`, next disabled at `offset+limit>=total`.
- A create/void/delete invalidates `[key]` → the current page refetches (count/rows update).

---

## Testing

The four page tests already render the page against the MSW envelope handlers. Update each:
- **Pagination:** assert the `Pagination` label (`Menampilkan 1–N dari {total}`) renders; where the fixture has > `LIMIT` rows (or a fixture is extended to), assert **Berikutnya** sends `offset=20` and renders page 2. Use a fixture with enough rows for at least one page boundary in one representative test.
- **Server status filter:** clicking a status button sends `status=` (the handler filters) and narrows the rows; `offset` resets to 0.
- **Page-scoped search:** typing filters the loaded page client-side (unchanged behavior, now explicitly page-scoped).
- Keep the existing role-gating / action (post/void) assertions.

A `createResourceHooks` unit test (or one representative feature hook test) covers `usePagedList` returning the envelope with `total` and passing `limit`/`offset`/`status` as query params.

Full suite expected ≈ **223 + a few net new** (the page tests are modified; +1 hook test). Final: `pnpm test --run`, `pnpm lint`, `pnpm build` green. No route changes / no route-tree regen.

---

## Scope

**In:** `usePagedList` + `createResourceKeys.list(params)`; the four list pages (offset state, server `status`/`direction` filters, `Pagination`, page-scoped search + hint, drop the `startsWith('VOID')` workaround); the four MSW handlers gaining filter support; the page tests; one i18n key.

**Out (YAGNI):** server-side free-text search (API has none), a `partnerId` filter control, paginating the select dropdowns / `useOpenDocuments` (stay wholesale ≤200), a user-configurable page size, and URL-synced pagination state (offset is local component state, like journals).

---

## Reuse summary

| Need | Reuse (unchanged) |
|---|---|
| Envelope fetch | `apiFetch` + the factory's existing `envelopeSchema` |
| Pager UI | `Pagination` (`offset, limit, total, onChange`) |
| Pattern | `JournalsPage` (LIMIT/offset/`usePagedList`-equivalent) |
| Table | `DataTable` |
| Loading/error | `Skeleton`, `ErrorState` |

New: `usePagedList` in `createResourceHooks`, the four page edits, four MSW handler edits, one i18n key, page-test updates.

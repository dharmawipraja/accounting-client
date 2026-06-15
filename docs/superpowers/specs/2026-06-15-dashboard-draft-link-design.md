# Dashboard "Jurnal Draft" → Journals Deep-Link (Plan 11) — Design

**Plan:** 11 — a small polish item: make the dashboard's "Jurnal Draft" summary card clickable, navigating to the journals register **pre-filtered to DRAFT**. The last deferred item after the core app (Plans 1–10) was completed.

**Status:** approved design, pre-implementation.

---

## Purpose

Clicking the "Jurnal Draft" count on the dashboard should land the user on the draft entries (the approval queue) — i.e. `/journals` filtered to `status=DRAFT` — instead of being a static number.

---

## Current state

- `DashboardPage.tsx:41` renders `<SummaryCard title={t.dashboard.draftEntries} value={drafts.data?.total ?? '—'} … />` — not clickable. `SummaryCard` has no link/onClick support.
- The journals route (`src/app/routes/_app/journals.index.tsx`) renders `JournalsPage` directly with **no search params**.
- `JournalsPage`'s status filter is **local `useState`**: `const [status, setStatus] = useState<'ALL'|'DRAFT'|'POSTED'>('ALL')` (`STATUSES = ['ALL','DRAFT','POSTED']`). No deep-link today.
- `DashboardPage.test` renders with only `QueryClientProvider` (no router). `JournalsPage.test`/`PaymentsPage.test` already use a `RouterProvider` stub (the established pattern for testing `Link`-containing pages).

---

## Changes (three touchpoints)

### 1. `JournalsPage` — accept an initial status

`src/features/journals/JournalsPage.tsx`: add an optional prop and seed the existing status state from it. No other change.

```tsx
export function JournalsPage({ initialStatus }: { initialStatus?: 'DRAFT' | 'POSTED' } = {}) {
  // …
  const [status, setStatus] = useState<(typeof STATUSES)[number]>(initialStatus ?? 'ALL');
  // …
}
```

The filter buttons, query, pagination, and actions are unchanged. The page stays testable standalone (pass the prop directly).

### 2. `journals.index.tsx` route — read a `status` search param

`src/app/routes/_app/journals.index.tsx`: add `validateSearch` and an inline component that passes the param through (the testable-page pattern — router wiring lives in the route file).

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { JournalsPage } from '@/features/journals/JournalsPage';

export const Route = createFileRoute('/_app/journals/')({
  validateSearch: (search: Record<string, unknown>): { status?: 'DRAFT' | 'POSTED' } => ({
    status: search.status === 'DRAFT' || search.status === 'POSTED' ? search.status : undefined,
  }),
  component: function JournalsRoute() {
    const { status } = Route.useSearch();
    return <JournalsPage initialStatus={status} />;
  },
});
```

(`validateSearch` mirrors the existing pattern in `src/app/routes/_app/payments.new.tsx` / `reports.general-ledger.tsx`.)

### 3. `DashboardPage` — wrap the draft card in a typed Link

`src/features/dashboard/DashboardPage.tsx`: wrap only the Jurnal Draft `SummaryCard` in a `Link`. `SummaryCard` itself is unchanged.

```tsx
import { Link } from '@tanstack/react-router';
// …
<Link to="/journals" search={{ status: 'DRAFT' }} className="block rounded-xl transition-colors hover:opacity-90">
  <SummaryCard title={t.dashboard.draftEntries} value={drafts.data?.total ?? '—'} loading={drafts.isLoading} error={drafts.isError} onRetry={() => void drafts.refetch()} />
</Link>
```

The `to="/journals"` resolves to the index route; `search={{ status: 'DRAFT' }}` is typed against the route's `validateSearch` (so this only type-checks after change #2 — but no route-tree regeneration is needed since `journals.index.tsx` already exists; modifying its `validateSearch` is enough).

---

## Data flow

1. Dashboard renders the draft card inside a `Link` to `/journals?status=DRAFT`.
2. Click → the journals index route validates `status=DRAFT` → passes `initialStatus="DRAFT"` to `JournalsPage`.
3. `JournalsPage` mounts with its status filter seeded to `DRAFT` → the list query fires with `status=DRAFT` and the DRAFT filter button is active.

## Error & edge handling

- An unrecognized `?status=` value → `validateSearch` returns `undefined` → `JournalsPage` defaults to `ALL` (no crash).
- No new endpoints, schemas, or i18n. No route-tree regeneration (the route file already exists; only its `validateSearch`/component change).

---

## Testing

- **`JournalsPage.test`** (already a `RouterProvider` stub): add a case rendering `<JournalsPage initialStatus="DRAFT" />` and assert the initial list request carries `status=DRAFT` (capture the query param) — and/or that the DRAFT filter button renders in its active variant.
- **`DashboardPage.test`**: upgrade the render to a `RouterProvider` stub (mirroring `JournalsPage.test` — a minimal memory router with a root + the dashboard component) so the new `<Link>` mounts. Assert the draft card's value sits inside an anchor whose `href` targets `/journals` with `status=DRAFT` (e.g. `closest('a')` has `href` containing `/journals` and `status=DRAFT`). Existing card-value assertions are preserved inside the router.

Full suite expected ≈ **221 + ~1–2 net new** (one new JournalsPage case; the DashboardPage test is modified, not added). Final: `pnpm test --run`, `pnpm lint`, `pnpm build` green. **No `routeTree.gen.ts` regeneration needed** (no new route files).

---

## Scope

**In:** the `JournalsPage` `initialStatus` prop, the journals index `validateSearch`, the dashboard draft-card `Link`, and the two test updates.

**Out (YAGNI):** making other dashboard cards clickable, a general `to` prop on `SummaryCard`, deep-linking other journals filters (sourceType), or any new route file. After this the only-known-deferred item is closed.

---

## Reuse summary

| Need | Reuse (unchanged) |
|---|---|
| Typed navigation | `@tanstack/react-router` `Link` (typed `to`/`search`) |
| Search param | `validateSearch` (per `payments.new.tsx`) |
| Card | `SummaryCard` (wrapped externally, not modified) |
| Test router | the `RouterProvider` stub pattern from `JournalsPage.test` |

New: nothing — three small edits to existing files + two test updates.

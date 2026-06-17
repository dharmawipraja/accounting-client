# Loading / Error / Not-Found UI — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming)
**Scope:** App-wide — every feature surface.

## Goal

Replace the client's ad-hoc loading/error/not-found rendering with a small, reusable state system: shimmer **skeletons** for loading, a richer **error** layer (inline + route-level + a render-crash boundary) with friendly per-type copy and retry, and real **not-found** UI (a 404 page for unknown routes plus a "record not found" state for detail pages). All copy in Indonesian via the existing `useT` catalog.

## Background — current state (audited)

- **Loading:** a single `src/components/ui/skeleton.tsx` (`animate-pulse` box). Pages render `<Skeleton className="h-40 w-full" />` (lists) or `h-96` (editors). No composed/content-shaped skeletons; `common.loading` ("Memuat…") exists but is unused.
- **Error:** `src/components/common/ErrorState.tsx` (`{ error: unknown }`) shows an API message + `traceId`. No `onRetry`. Mutations use `toastApiError` / `applyApiErrorToForm` (good — kept as-is). **No React error boundary** (a thrown render error blanks the app). **No router `errorComponent`.**
- **Not-found:** **No router `notFoundComponent`** and no 404 page. Detail pages show the generic `ErrorState` for a 404 — indistinguishable from other failures. (One isolated `usePeriods` maps 404→null.)
- **Stack:** React 19, TanStack Query 5 + Router 1, Tailwind 4, shadcn/ui, `tw-animate-css` **already installed**, sonner, Zod 4. i18n is a single hardcoded `id` catalog in `src/lib/i18n/messages.id.ts` (`useT()`), English planned later.
- **Page pattern:** lists use `usePagedList()` → `{ data, total, limit, offset }`; details use `useItem(id)` → `TItem`; both return `UseQueryResult<…, ApiError>`. `DataTable` already renders `EmptyState` when `data.length === 0`.

## Decisions (from brainstorming)

1. **Skeleton approach: Tailwind shimmer via `tw-animate-css` (option E)** — zero new dependencies, composed into reusable components, themed with existing CSS variables. (Rejected: native pulse = too plain; react-loading-skeleton / react-content-loader = unnecessary deps; MUI/Mantine = drags in an unused kit.)
2. **Error upgrades: all four** — top-level error boundary, retry actions, friendly per-type copy, router-level `errorComponent`.
3. **404 style: minimal numeral (style A)** — large muted "404", reused for detail "record not found".
4. **Scope: app-wide** — every feature page adopts the shared pattern.

## Architecture

Three layers mapped to the three failure modes, glued by one helper component so every page branches identically.

| Layer | Catches | Mechanism |
|---|---|---|
| Loading | in-flight queries | shimmer `Skeleton` + `SkeletonTable/Form/Cards` |
| Error | query errors, route-load failures, render crashes | `ErrorState` (inline) + root `errorComponent` + `AppErrorBoundary` |
| Not-found | unknown routes, missing records | root `notFoundComponent` + reusable `NotFound` |

### Components & units

**Loading**
- `src/components/ui/skeleton.tsx` — extend with a `variant?: 'shimmer' | 'pulse'` prop, default `'shimmer'`. Shimmer is a gradient-sweep utility; `pulse` keeps `animate-pulse`. Built on the `--muted` token.
- `src/index.css` — add the shimmer keyframe + utility class (gradient sweep over `--muted` → `--muted`/lighter).
- `src/components/common/skeletons/SkeletonTable.tsx` — props `{ rows?: number; cols?: number }`; renders a header row + `rows` shimmer rows of `cols` bars, matching `DataTable`.
- `src/components/common/skeletons/SkeletonForm.tsx` — props `{ fields?: number }`; label+input bar pairs, for editor/detail pages.
- `src/components/common/skeletons/SkeletonCards.tsx` — props `{ count?: number }`; dashboard summary-card skeletons.

**Error**
- `src/components/common/describeError.ts` — pure `describeError(error: unknown, t: Messages): { kind, title, message, showRetry }`. Mapping:
  - no `ApiError` / no `status` (network/offline) → `errors.offline`, `showRetry: true`
  - 401 → `errors.unauthorized`, `showRetry: false` (refresh handled elsewhere; treat as generic)
  - 403 → `errors.forbidden`, `showRetry: false`
  - 404 → `errors.notFound`, `showRetry: false` (callers may special-case to `NotFound`)
  - 422 → `errors.validation`, `showRetry: false`
  - ≥500 → `errors.server`, `showRetry: true`
  - default → `errors.generic`, `showRetry: true`
  - always carries `traceId` through to the caller for display.
- `src/components/common/ErrorState.tsx` — refactor to `{ error: unknown; onRetry?: () => void }`. Renders icon + title + message from `describeError`; shows a "Coba lagi" button only when `showRetry` **and** `onRetry` provided; shows `Referensi: <traceId>` when present.
- `src/components/common/AppErrorBoundary.tsx` — class component with `getDerivedStateFromError`/`componentDidCatch`; renders a full-screen `FatalError` (icon, `errors.fatalTitle`, `errors.fatalMessage`, reload button → `window.location.reload()`); logs `error`/`info`. Wraps the app in `main.tsx`.
- Root route gets `errorComponent` (TanStack Router) → renders `ErrorState` inside the shell (no retry wired; route reload via router).

**Not-found**
- `src/components/common/NotFound.tsx` — props `{ title?: string; message?: string; action?: ReactNode }`. Default = page 404 (big muted "404" numeral, `notFound.pageTitle`, `notFound.pageMessage`, link "Kembali ke Dasbor"). Detail pages pass `variant="record"`-style props (`notFound.recordTitle/Message`) and a "Kembali ke daftar" action.
- Root route gets `notFoundComponent` → `<NotFound />`.

**Glue**
- `src/components/common/QueryState.tsx` — `{ query: UseQueryResult<T, ApiError>; loading: ReactNode; onRetry?: boolean; notFound?: ReactNode; children: (data: T) => ReactNode }`. Branch order: `isPending` → `loading`; `isError` → if `notFound` provided and `error` is `ApiError` 404 → `notFound`, else `<ErrorState error onRetry={onRetry ? query.refetch : undefined} />`; else `children(data)`.

### Data-flow patterns

- **List page:**
  ```tsx
  <QueryState query={page} loading={<SkeletonTable rows={8} cols={COLS} />} onRetry>
    {(env) => <><DataTable data={filter(env.data)} /><Pagination total={env.total} …/></>}
  </QueryState>
  ```
  Empty handled inside by existing `DataTable` → `EmptyState`.
- **Detail/editor page:**
  ```tsx
  <QueryState query={item} loading={<SkeletonForm fields={6} />} notFound={<NotFound …record />} onRetry>
    {(data) => <InvoiceForm … />}
  </QueryState>
  ```
  Create mode (no id) bypasses `QueryState` and renders the form directly.
- **Dashboard:** `SkeletonCards` for the grid; each `SummaryCard` keeps its own loading/error+retry, aligned to the new `ErrorState`/skeleton styling.

### i18n additions (`messages.id.ts`)

- `errors`: `offline`, `unauthorized`, `forbidden`, `notFound`, `validation`, `server`, `generic` (each `{ title, message }`), plus `retry` ("Coba lagi"), `fatalTitle`, `fatalMessage`, `reload`.
- `notFound`: `pageTitle`, `pageMessage`, `backToDashboard`, `recordTitle`, `recordMessage`, `backToList`.
- Surface existing `common.loading` where a text loading hint is wanted.
- Structured as nested objects so the future English catalog mirrors the shape.

## Error handling (of the system itself)

- `describeError` never throws: it defensively handles non-`ApiError` values (string/Error/unknown) → `errors.generic`.
- `AppErrorBoundary` is the last resort for render crashes; query/route errors are handled before reaching it.
- `QueryState` uses `isPending` (not `isLoading`) so disabled/idle queries (e.g. `useItem('')`) don't render a skeleton forever; detail create-mode bypasses it entirely.

## Testing strategy

- **Unit:** `describeError` — table of `(status|error) → { kind, title, showRetry }`; non-ApiError inputs → generic.
- **Component (RTL):** `SkeletonTable`/`SkeletonForm`/`SkeletonCards` render the requested counts; `ErrorState` shows retry only when `showRetry && onRetry`, click calls `onRetry`; `NotFound` renders default and record variants; `AppErrorBoundary` renders `FatalError` when a child throws.
- **Integration (RTL + MSW):** a representative list page shows skeleton → table; an error response → `ErrorState` and "Coba lagi" triggers refetch (handler returns success on retry); a detail page with a 404 handler → `NotFound` record state; an unknown route → `NotFound` page (router test). Reuse existing MSW handlers/fixtures and respect documented jsdom/MSW gotchas.
- Full suite stays green; lint/build clean.

## Files

**New**
- `src/components/common/skeletons/SkeletonTable.tsx`
- `src/components/common/skeletons/SkeletonForm.tsx`
- `src/components/common/skeletons/SkeletonCards.tsx`
- `src/components/common/QueryState.tsx`
- `src/components/common/NotFound.tsx`
- `src/components/common/AppErrorBoundary.tsx`
- `src/components/common/describeError.ts`

**Changed**
- `src/components/ui/skeleton.tsx` (shimmer variant)
- `src/index.css` (shimmer keyframe/utility)
- `src/components/common/ErrorState.tsx` (`onRetry` + `describeError`)
- `src/app/routes/__root.tsx` (`errorComponent`, `notFoundComponent`)
- `src/main.tsx` (wrap `AppErrorBoundary`)
- `src/lib/i18n/messages.id.ts` (`errors.*`, `notFound.*`)
- Every feature page that renders `useList`/`usePagedList`/`useItem` (apply `QueryState` + composed skeletons): partners, sales-invoices, purchase-bills, payments, dashboard, journals, reports, periods, audit, accounts, tax-codes, company settings, plus auth screens where a loading/error state applies.

## Out of scope / non-goals

- No change to the mutation error UX (`toastApiError`, `applyApiErrorToForm`) — already good.
- No new dependency.
- No English translation catalog (structure only, to land later).
- No redesign of `DataTable`/`EmptyState` beyond styling alignment.

## Build sequence (high level — detailed plan to follow)

1. Skeleton primitive + shimmer utility, then composed skeletons.
2. `describeError` + `ErrorState` refactor.
3. `NotFound` + `AppErrorBoundary` + router wiring.
4. `QueryState` glue.
5. i18n strings.
6. Roll out across feature pages, app-wide.
7. Tests at each step.

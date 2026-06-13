# Dashboard (Plan 4b) — Design Spec

**Status:** Approved
**Date:** 2026-06-13
**Plan:** 4b — Dashboard (final slice of Plan 4)

## Goal

Replace the placeholder `/dashboard` route with an at-a-glance summary screen: seven KPI cards driven by the three financial reports plus a draft-journal count, with a period selector controlling the date-ranged cards.

## Context

- The `/dashboard` route already exists (`src/app/routes/_app/dashboard.tsx`) as a placeholder rendering only `PageHeader`; `/` redirects to it and it is already in the `AppShell` nav. Plan 4b **replaces the placeholder body only** — no new routing or nav work.
- Building blocks already present: shadcn `Card` (`components/ui/card.tsx`), `Skeleton`, `apiFetch<T>(path, { query, schema })`, `Money`/`MoneyText`, date-fns with `id` locale, `formatDateID`.
- Reports are read-only (`any` auth), so all roles see all cards — no role-gating.

### Live-reconciled report shapes (API verified 2026-06-13)

All money is 4-decimal strings. Only the fields the cards consume are listed; schemas are tolerant (Zod strips the rest), matching the payments/invoice schema style.

- `GET /reports/balance-sheet?asOf=YYYY-MM-DD` →
  `{ asOf, assets:{groups,total}, liabilities:{groups,total}, equity:{groups,total}, totalAssets, totalLiabilities, totalEquity, currentYearEarnings, balanced }`
- `GET /reports/income-statement?from=&to=` →
  `{ from, to, revenue, revenueLines, cogs, cogsLines, grossProfit, operatingExpense, operatingExpenseLines, operatingProfit, otherIncome, otherExpense, profitBeforeTax, taxExpense, netIncome }`
- `GET /reports/cash-flow?from=&to=` →
  `{ from, to, netIncome, operating:{adjustments,total}, investing:{lines,total}, financing:{lines,total}, netChange, kasAwal, kasAkhir, reconciles }`
- `GET /ledger/journal-entries?status=DRAFT&limit=1` → paginated envelope `{ data, total, limit, offset }` (use `.total`)

## Architecture

Approach: **per-report query hooks + a presentational card grid** (chosen over a single aggregated hook so each card caches / loads / errors independently, and over a backend aggregation endpoint which does not exist). The four requests fire in parallel, so there is no latency penalty.

### Files

```
src/features/dashboard/
  period.ts            // Period type + pure preset computation (today injected; testable)
  schema.ts            // tolerant Zod schemas: balanceSheet, incomeStatement, cashFlow, draftCount
  hooks.ts             // useBalanceSheet / useIncomeStatement / useCashFlow / useDraftCount
  SummaryCard.tsx      // presentational card: title, value, loading/error/hint
  DashboardFilters.tsx // period selector (presets + custom range)
  DashboardPage.tsx    // owns period state, calls hooks, renders filters + 7-card grid
```

Modify:
- `src/app/routes/_app/dashboard.tsx` — render `<DashboardPage />` instead of the placeholder.
- `src/lib/query/keys.ts` — add a `reports` key namespace (plain keys, not `createResourceKeys`).
- `src/lib/i18n/messages.id.ts` — add a `dashboard` group.
- `src/test/handlers.ts` — add report fixtures + handlers (echo query params).

### Period logic (`period.ts`)

```ts
type PeriodPreset = 'month' | 'quarter' | 'year' | 'custom';
type Period = { preset: PeriodPreset; from: string; to: string }; // dates YYYY-MM-DD
```

Pure `computePeriod(preset, today): Period` using date-fns `startOfMonth` / `startOfQuarter` / `startOfYear` + `format(_, 'yyyy-MM-dd')`. `today` is injected (a `Date`) so the function is deterministic in tests.

- **month** → `from` = first day of `today`'s month, `to` = `today`
- **quarter** → `from` = first day of `today`'s quarter, `to` = `today`
- **year** (default) → `from` = `YYYY-01-01`, `to` = `today`
- **custom** → caller supplies `from` / `to` (preset stays `'custom'`)

The balance sheet's `asOf` = the period's `to`. A helper `isValidRange(period)` returns `from <= to` (string compare is safe for `YYYY-MM-DD`).

### Schemas (`schema.ts`)

Tolerant, money via the shared `moneyString`:

- `balanceSheetSchema` → `{ asOf?, totalAssets, totalLiabilities, totalEquity, currentYearEarnings?, balanced? }`
- `incomeStatementSchema` → `{ from?, to?, revenue, netIncome }`
- `cashFlowSchema` → `{ from?, to?, netChange, kasAwal?, kasAkhir }`
- `draftCountSchema` → `{ total: number }` (parses the journal-entries envelope; extra keys stripped)

### Hooks (`hooks.ts`)

Four thin `useQuery` wrappers over `apiFetch`, each validating with its schema:

| Hook | Endpoint + query | Query key | `enabled` |
|---|---|---|---|
| `useBalanceSheet(asOf)` | `/reports/balance-sheet` `{asOf}` | `['reports','balance-sheet',asOf]` | `!!asOf` |
| `useIncomeStatement(from,to)` | `/reports/income-statement` `{from,to}` | `['reports','income-statement',from,to]` | range valid |
| `useCashFlow(from,to)` | `/reports/cash-flow` `{from,to}` | `['reports','cash-flow',from,to]` | range valid |
| `useDraftCount()` | `/ledger/journal-entries` `{status:'DRAFT',limit:1}` | `['reports','draft-count']` | always |

`queryKeys.reports = { all, balanceSheet(asOf), incomeStatement(from,to), cashFlow(from,to), draftCount() }`. Changing the period changes the keys → automatic refetch. The page passes `enabled: isValidRange(period)` for the two range hooks (and a valid `asOf`) so an invalid custom range fires nothing.

## Components & data flow

`DashboardPage`:
- `const today = new Date()` (real app code; the test injects via MSW-independent control — see Testing).
- `const [period, setPeriod] = useState(() => computePeriod('year', today))`.
- Derives `from`, `to`, `asOf = to`, `valid = isValidRange(period)`.
- Calls the four hooks; renders `<DashboardFilters>` then a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) of seven `<SummaryCard>`s.

### Card → source mapping

| Card title (i18n) | Owning query | Field | Render |
|---|---|---|---|
| Total Aset | balanceSheet | `totalAssets` | `MoneyText` |
| Total Kewajiban | balanceSheet | `totalLiabilities` | `MoneyText` |
| Total Ekuitas | balanceSheet | `totalEquity` | `MoneyText` |
| Pendapatan | incomeStatement | `revenue` | `MoneyText` |
| Laba Bersih | incomeStatement | `netIncome` | `MoneyText` |
| Kas Akhir | cashFlow | `kasAkhir` | `MoneyText` |
| Jurnal Draft | draftCount | `total` | integer |

Each card's `loading` / `error` / `onRetry` come from its owning query (`isLoading`, `isError`, `refetch`). Balance-sheet cards share one query, so a balance-sheet failure puts exactly those three into the error state; the other four are unaffected. Hint text: balance-sheet cards show `per {asOf}`; income-statement/cash-flow cards show `{from} – {to}`; the draft card has no hint.

### `SummaryCard.tsx`

Props `{ title: string; value: ReactNode; loading?: boolean; error?: boolean; onRetry?: () => void; hint?: string }`. shadcn `Card` with muted `CardTitle`; value large + `tabular-nums`.
- `loading` → `<Skeleton className="h-8 w-32" />` in the value slot (title/chrome remain).
- `error` → "Gagal memuat" + a ghost "Coba lagi" button calling `onRetry`.
- `hint` → muted caption under the value.

### `DashboardFilters.tsx`

Props `{ period: Period; onSelectPreset: (p: PeriodPreset) => void; onCustomChange: (from: string, to: string) => void }`.
- Segmented preset buttons: **Bulan Ini / Kuartal Ini / Tahun Ini / Kustom** (active = `default` variant, others `outline`).
- When `period.preset === 'custom'`, reveal two `type="date"` inputs (**Dari** / **Sampai**) bound to `from`/`to`.
- Muted resolved-range label via `formatDateID`.
- If `!isValidRange(period)`, show a small hint ("Tanggal 'Dari' harus sebelum 'Sampai'") and the page leaves the **date-ranged** report queries (income-statement, cash-flow) disabled (those cards keep their last good values). The balance-sheet query is gated only on a non-empty `asOf` (= `to`), so an empty/half-typed `to` also disables it.

The page resolves presets: `onSelectPreset(preset)` → `setPeriod(computePeriod(preset, today))`; `onCustomChange(from,to)` → `setPeriod({ preset:'custom', from, to })`.

## States

- **Loading** — independent per-card skeletons (four parallel queries).
- **Error** — inline per card + retry; no global toast (read-only screen). 401 stays handled by the existing global refresh interceptor.
- **Zero / empty** — zeros are valid data → `Rp 0` / `0`; no special empty screen (a fresh company legitimately reads zero).
- **Invalid custom range** (`from > to`) — the date-ranged report queries (income-statement, cash-flow) are disabled, filter shows a hint, those cards retain last good values; balance-sheet (gated on `asOf` only) is unaffected when `to` is a valid date.

## i18n (`dashboard` group)

Card titles (`totalAssets`, `totalLiabilities`, `totalEquity`, `revenue`, `netIncome`, `endingCash`, `draftEntries`), presets (`thisMonth`, `thisQuarter`, `thisYear`, `custom`), range labels (`from` = "Dari", `to` = "Sampai", `rangeInvalid`), states (`loadError` = "Gagal memuat", `retry` = "Coba lagi"), and a `hintAsOf` / range caption helper. The page title reuses `nav.dashboard`.

## Testing

- **`period.test.ts`** (pure, fixed `today = 2026-06-13`): `month` → `2026-06-01`..`2026-06-13`; `quarter` → `2026-04-01`..`2026-06-13`; `year` → `2026-01-01`..`2026-06-13`; `isValidRange` true/false cases.
- **`schema.test.ts`**: `balanceSheet`/`incomeStatement`/`cashFlow` parse the reconciled fixtures and strip extra keys; `draftCount` reads envelope `total`.
- **`SummaryCard.test.tsx`**: renders title + value; `loading` → skeleton, no value; `error` → shows "Coba lagi" and clicking calls `onRetry`.
- **`DashboardPage.test.tsx`** (MSW integration):
  1. All endpoints return reconciled fixtures → the seven card values render (formatted money for the six money cards, integer for Jurnal Draft).
  2. Click **Bulan Ini** → income-statement + cash-flow refetch with `from` = month start (handlers echo query params; assert the rendered/received `from`).
  3. Custom range: enter `from`/`to` → queries fire with those params; `from > to` → no fetch + invalid hint shown.
  4. Cash-flow returns 500 → Kas Akhir card shows error + **Coba lagi**; clicking refetches (then succeeds), other cards unaffected.

MSW handlers for `/reports/balance-sheet`, `/reports/income-statement`, `/reports/cash-flow` echo `asOf`/`from`/`to` from the query string so the param-passing assertions are real; the `/ledger/journal-entries` handler branches on `status=DRAFT` to return `{ data:[], total:N, limit, offset }`.

To keep `DashboardPage` tests deterministic despite `new Date()`, the preset-switch and custom-range assertions rely on **explicit user actions** (clicking a preset, typing a custom range) and assert the resulting request params, rather than asserting the default-load range — so they do not depend on the wall-clock date.

## Out of scope (YAGNI)

- Drill-down / clickable cards — their targets (journal register, report screens, AR/AP aging) do not exist yet; cards are display-only.
- Charts / trends / sparklines.
- A manual refresh button — TanStack Query refetch (key change + focus) covers freshness.
- Per-card currency/period customization beyond the shared selector.

## Done criteria

- `/dashboard` renders seven cards bound to the reconciled report fields, money via `MoneyText`, draft count as an integer.
- Period selector with Bulan/Kuartal/Tahun presets (default Tahun) + custom range; changing it refetches the date-ranged cards; invalid range disables fetching with a hint.
- Independent per-card loading skeletons and inline error+retry; balance-sheet error isolates to its three cards.
- All four hooks validate responses with tolerant Zod schemas under a `reports` query-key namespace.
- Tests above pass; lint clean; build green.

# Amex Theme — Phase 3b: Dashboard Recomposition — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming)
**Scope:** Phase 3b of the Amex revamp. Recompose the dashboard from a flat 7-card grid into a financial-position hero + secondary metric grid. Dashboard feature only.

## Goal

Give the dashboard Amex's "one prominent summary + secondary metrics" hierarchy: a navy premium **financial-position hero** (the balance-sheet snapshot) above a clean grid of period-performance cards. Data, queries, filters, skeletons, and error handling are unchanged — this is layout + emphasis.

## Background

- `src/features/dashboard/DashboardPage.tsx` renders `PageHeader` + `DashboardFilters` + a flat `grid sm:grid-cols-2 lg:grid-cols-4` of **7 equal `SummaryCard`s**: Total Aset / Total Kewajiban / Total Ekuitas (all from `useBalanceSheet` → `bs.data`), Pendapatan / Laba Bersih (from `useIncomeStatement` → `is.data`), Kas Akhir (from `useCashFlow` → `cf.data?.kasAkhir`), and a Jurnal Draf count (`useDraftCount` → `drafts.data?.total`, wrapped in a `<Link to="/journals" search={{ status: 'DRAFT' }}>`). `allPending` first-paint shows `<SkeletonCards count={4} />`. Period comes from `usePreferences` (Phase-1 work).
- `src/features/dashboard/SummaryCard.tsx`: `<Card>` with title (muted) + `text-2xl tabular-nums` value + optional hint; `loading` → skeleton, `error` → message + retry. Reused for the secondary metrics.
- No hierarchy today: the company's financial position reads the same weight as a draft count.

## Decisions (from brainstorming)

- **Hero style: A — navy premium** (`bg-sidebar`/navy `#00175A`, white figures, `#B7C3D9` labels, elevated navy-tinted shadow). Ties to the Phase-3a navy sidebar; marks the elevated moment.
- **Hero content:** balance-sheet position — **Total Aset** as the dominant figure, **Kewajiban `=` Ekuitas** as a supporting trio (the accounting equation visible at a glance), "per {date}".
- **Secondary grid:** Pendapatan, Laba Bersih, Kas Akhir, Jurnal Draf (the hero replaces the 3 balance-sheet cards).

## `DashboardHero` (new) — `src/features/dashboard/DashboardHero.tsx`

A navy premium panel rendering the balance-sheet snapshot from the `useBalanceSheet` query.

**Props:**
```ts
{
  assets?: string; liabilities?: string; equity?: string;  // 4dp money strings
  loading?: boolean; error?: boolean; onRetry?: () => void;
  asOf?: string;  // formatted "per <date>" hint (or label)
}
```

**Layout** (navy surface, `rounded-xl`, `p-6`, `shadow-lg` navy-tinted):
- `Posisi Keuangan` label (`text-[#B7C3D9]`/`text-sidebar-foreground/70`, uppercase small).
- **Total Aset** figure: `text-4xl font-semibold tabular-nums text-white` (`<MoneyText>` styled for navy — see note), with a `Total Aset · {asOf}` subline in muted on-navy.
- Divider (`border-white/12`), then the trio: `Kewajiban` (label + value) `=` `Ekuitas` (label + value), values `text-xl`, labels muted on-navy, the `=` in `text-sidebar-ring` (light blue).
- **Loading:** on-navy skeleton bars (`bg-white/10 rounded` — not the light `bg-muted` skeleton, which would clash on navy).
- **Error:** light error text + a retry `Button variant="outline"` that reads on navy (or a ghost button with on-navy text), calling `onRetry`.

**Money on navy:** `MoneyText` renders `tabular-nums font-semibold` in the current text color, so it inherits white inside the hero — fine. The hero sets text color to white at the figure level.

## `DashboardPage` (restructured)

Replace the 7-card grid's three balance-sheet cards with the hero; keep the rest as a secondary grid:
```tsx
{allPending ? (
  <SkeletonCards count={4} />
) : (
  <>
    <DashboardHero
      assets={bs.data?.totalAssets} liabilities={bs.data?.totalLiabilities} equity={bs.data?.totalEquity}
      loading={bs.isLoading} error={bs.isError} onRetry={() => void bs.refetch()} asOf={asOfHint}
    />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard title={t.dashboard.revenue} value={money(is.data?.revenue)} loading={is.isLoading} error={is.isError} onRetry={() => void is.refetch()} hint={rangeHint} />
      <SummaryCard title={t.dashboard.netIncome} value={money(is.data?.netIncome)} loading={is.isLoading} error={is.isError} onRetry={() => void is.refetch()} hint={rangeHint} />
      <SummaryCard title={t.dashboard.endingCash} value={money(cf.data?.kasAkhir)} loading={cf.isLoading} error={cf.isError} onRetry={() => void cf.refetch()} hint={rangeHint} />
      <Link to="/journals" search={{ status: 'DRAFT' }} className="block rounded-xl transition-opacity hover:opacity-90">
        <SummaryCard title={t.dashboard.draftEntries} value={drafts.data?.total ?? '—'} loading={drafts.isLoading} error={drafts.isError} onRetry={() => void drafts.refetch()} />
      </Link>
    </div>
  </>
)}
```
`PageHeader`, `DashboardFilters`, `allPending`, `asOfHint`/`rangeHint`, and the `usePreferences` period logic are unchanged.

## i18n

Add one key to the `dashboard` block: `financialPosition: 'Posisi Keuangan'`. The trio reuses existing `totalAssets` ('Total Aset'), `totalLiabilities` ('Total Kewajiban'), `totalEquity` ('Total Ekuitas'), and `asOfLabel`.

## Testing

- **New `DashboardHero` test:** renders `Posisi Keuangan` + the three money figures; `loading` → skeleton bars (no figures); `error` → retry button present and calls `onRetry` on click. (Pure component; pass money strings directly, no QueryClient needed.)
- **Existing `DashboardPage` tests:** the balance-sheet figures still render (now inside the hero) and net income / cash / drafts still render in the grid, so the value-based assertions stay green. Update only if a test asserts a specific card *count* or the literal "seven cards" structure — re-point it at the hero + grid.
- Full gate (`pnpm test --run && tsc && lint && build`) green; manual both-modes visual smoke (the hero is navy in both modes; secondary cards light in light mode, navy in dark).

## Files

- **New:** `src/features/dashboard/DashboardHero.tsx`, `src/features/dashboard/DashboardHero.test.tsx`.
- **Modify:** `src/features/dashboard/DashboardPage.tsx`, `src/lib/i18n/messages.id.ts`.

## Out of scope (3c)

- Motion (install `motion` + entrance animations) — the dashboard hero/cards will get subtle motion in 3c.
- 44px touch-target / focus a11y sweep.
- No query/data/route changes; no new metrics; no change to `SummaryCard` internals or `DashboardFilters`.

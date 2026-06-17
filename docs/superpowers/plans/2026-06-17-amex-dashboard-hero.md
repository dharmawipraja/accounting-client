# Amex Theme Phase 3b (Dashboard Recomposition) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the dashboard into a navy financial-position hero (balance-sheet snapshot) above a secondary metric grid.

**Architecture:** New `DashboardHero` component (navy panel from the `useBalanceSheet` query) replaces the three balance-sheet `SummaryCard`s; `DashboardPage` renders hero + a 4-card grid (revenue / net income / cash / drafts) reusing `SummaryCard`. No query/data/filter changes.

**Tech Stack:** React 19, TanStack Query, Tailwind v4 sidebar/shadow tokens, `MoneyText`, Vitest + RTL.

**Spec:** `docs/superpowers/specs/2026-06-17-amex-dashboard-hero-design.md`

**Branch:** `feat/amex-dashboard-hero` (already created; spec committed at `f8d4d30`).

---

## File Structure

- **New:** `src/features/dashboard/DashboardHero.tsx`, `src/features/dashboard/DashboardHero.test.tsx`.
- **Modify:** `src/lib/i18n/messages.id.ts` (add `dashboard.financialPosition`), `src/features/dashboard/DashboardPage.tsx` (restructure), `src/features/dashboard/DashboardPage.test.tsx` (rename/refresh one test).

---

## Task 1: Add `dashboard.financialPosition` i18n key

**Files:** Modify `src/lib/i18n/messages.id.ts`

- [ ] **Step 1: Add the key**

In `src/lib/i18n/messages.id.ts`, in the `dashboard` block, immediately after the line `asOfLabel: 'per',` (around line 80), add:
```ts
    financialPosition: 'Posisi Keuangan',
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (the `Messages` type now includes `dashboard.financialPosition`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat(i18n): add dashboard.financialPosition label

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `DashboardHero` component

**Files:** Create `src/features/dashboard/DashboardHero.tsx`, `src/features/dashboard/DashboardHero.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/dashboard/DashboardHero.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { DashboardHero } from './DashboardHero';

it('renders the financial-position label and the three figures', () => {
  render(<DashboardHero assets="1500000.0000" liabilities="600000.0000" equity="900000.0000" asOf="per 13 Jun 2026" />);
  expect(screen.getByText(id.dashboard.financialPosition)).toBeInTheDocument();
  expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
  expect(screen.getByText('Rp 600.000')).toBeInTheDocument();
  expect(screen.getByText('Rp 900.000')).toBeInTheDocument();
});

it('shows skeletons (no figures) while loading', () => {
  render(<DashboardHero loading />);
  expect(screen.getByText(id.dashboard.financialPosition)).toBeInTheDocument();
  expect(screen.queryByText('Rp 1.500.000')).not.toBeInTheDocument();
});

it('shows a retry button on error and calls onRetry', async () => {
  const onRetry = vi.fn();
  render(<DashboardHero error onRetry={onRetry} />);
  await userEvent.click(screen.getByRole('button', { name: id.dashboard.retry }));
  expect(onRetry).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run src/features/dashboard/DashboardHero.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `DashboardHero`**

Create `src/features/dashboard/DashboardHero.tsx`:
```tsx
import { MoneyText } from '@/components/common/MoneyText';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';

interface Props {
  assets?: string;
  liabilities?: string;
  equity?: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  asOf?: string;
}

/** Navy premium balance-sheet hero: Total Aset dominant, with the accounting
 *  equation (Kewajiban = Ekuitas) as supporting figures. */
export function DashboardHero({ assets, liabilities, equity, loading, error, onRetry, asOf }: Props) {
  const t = useT();
  return (
    <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-lg">
      <p className="text-xs font-semibold tracking-wide uppercase text-sidebar-foreground/70">
        {t.dashboard.financialPosition}
      </p>
      {loading ? (
        <div className="mt-2 space-y-3">
          <div className="h-10 w-56 animate-pulse rounded bg-white/10" />
          <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
        </div>
      ) : error ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-sidebar-foreground/80">{t.dashboard.loadError}</p>
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 bg-transparent text-sidebar-foreground hover:bg-white/10"
              onClick={onRetry}
            >
              {t.dashboard.retry}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-1 text-4xl font-semibold tabular-nums">
            {assets ? <MoneyText value={assets} /> : '—'}
          </div>
          <p className="mt-1 text-xs text-sidebar-foreground/70">
            {t.dashboard.totalAssets} · {asOf}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-3 border-t border-white/15 pt-4">
            <div>
              <p className="text-xs text-sidebar-foreground/70">{t.dashboard.totalLiabilities}</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums">
                {liabilities ? <MoneyText value={liabilities} /> : '—'}
              </p>
            </div>
            <span className="text-lg text-sidebar-ring">=</span>
            <div>
              <p className="text-xs text-sidebar-foreground/70">{t.dashboard.totalEquity}</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums">
                {equity ? <MoneyText value={equity} /> : '—'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec vitest run src/features/dashboard/DashboardHero.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/DashboardHero.tsx src/features/dashboard/DashboardHero.test.tsx
git commit -m "feat(dashboard): navy financial-position hero component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Restructure `DashboardPage`

**Files:** Modify `src/features/dashboard/DashboardPage.tsx`, `src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Add the import**

In `src/features/dashboard/DashboardPage.tsx`, add next to the other `./` imports:
```tsx
import { DashboardHero } from './DashboardHero';
```

- [ ] **Step 2: Replace the loaded grid with hero + secondary grid**

Replace the entire `{allPending ? ( … ) : ( … )}` block with:
```tsx
      {allPending ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="space-y-6">
          <DashboardHero
            assets={bs.data?.totalAssets}
            liabilities={bs.data?.totalLiabilities}
            equity={bs.data?.totalEquity}
            loading={bs.isLoading}
            error={bs.isError}
            onRetry={() => void bs.refetch()}
            asOf={asOfHint}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title={t.dashboard.revenue} value={money(is.data?.revenue)} loading={is.isLoading} error={is.isError} onRetry={() => void is.refetch()} hint={rangeHint} />
            <SummaryCard title={t.dashboard.netIncome} value={money(is.data?.netIncome)} loading={is.isLoading} error={is.isError} onRetry={() => void is.refetch()} hint={rangeHint} />
            <SummaryCard title={t.dashboard.endingCash} value={money(cf.data?.kasAkhir)} loading={cf.isLoading} error={cf.isError} onRetry={() => void cf.refetch()} hint={rangeHint} />
            <Link to="/journals" search={{ status: 'DRAFT' }} className="block rounded-xl transition-opacity hover:opacity-90">
              <SummaryCard title={t.dashboard.draftEntries} value={drafts.data?.total ?? '—'} loading={drafts.isLoading} error={drafts.isError} onRetry={() => void drafts.refetch()} />
            </Link>
          </div>
        </div>
      )}
```
(The three balance-sheet `SummaryCard`s — totalAssets / totalLiabilities / totalEquity — are removed; their data now feeds the hero. `PageHeader`, `DashboardFilters`, `allPending`, `asOfHint`/`rangeHint`, and the `usePreferences` period logic are unchanged.)

- [ ] **Step 3: Refresh the first dashboard test**

In `src/features/dashboard/DashboardPage.test.tsx`, update the first test (currently `'renders the seven summary cards from the reports'`) to reflect the hero — rename it and add a hero-label assertion. Replace:
```tsx
it('renders the seven summary cards from the reports', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  renderPage();
  expect(await screen.findByText('Rp 1.500.000')).toBeInTheDocument(); // totalAssets
  expect(screen.getByText('Rp 1.750.000')).toBeInTheDocument(); // netIncome
  expect(screen.getByText('Rp 1.234.000')).toBeInTheDocument(); // kasAkhir
  expect(screen.getByText('3')).toBeInTheDocument(); // draft count
});
```
with:
```tsx
it('renders the financial-position hero and the secondary metric cards', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  renderPage();
  expect(await screen.findByText('Posisi Keuangan')).toBeInTheDocument(); // hero label
  expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument(); // totalAssets (hero)
  expect(screen.getByText('Rp 1.750.000')).toBeInTheDocument(); // netIncome (grid)
  expect(screen.getByText('Rp 1.234.000')).toBeInTheDocument(); // kasAkhir (grid)
  expect(screen.getByText('3')).toBeInTheDocument(); // draft count (grid)
});
```
(The other six tests are unaffected — they assert on figure values / error / link, all of which still render.)

- [ ] **Step 4: Run the dashboard tests + typecheck**

Run: `pnpm exec vitest run src/features/dashboard && pnpm exec tsc --noEmit`
Expected: PASS (all dashboard tests, including the 3 new hero tests; 0 tsc errors).

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/DashboardPage.tsx src/features/dashboard/DashboardPage.test.tsx
git commit -m "feat(dashboard): recompose with financial-position hero + secondary grid

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full gate**

Run: `pnpm test --run && pnpm exec tsc --noEmit && pnpm run lint && pnpm run build`
Expected: all tests pass (266 + 3 new hero tests = 269), tsc 0 errors, lint 0 errors (pre-existing React-Compiler/RHF warnings only), build succeeds.

- [ ] **Step 2: Manual both-modes visual smoke** (human; the subagent cannot do this)

`pnpm dev`, open the dashboard in **light then dark**:
- A navy hero panel: "Posisi Keuangan", a large white **Total Aset** figure, "Total Aset · per {date}", and a `Kewajiban = Ekuitas` trio (the `=` in light blue) below a faint divider.
- Below it, a tidy 4-card grid: Pendapatan, Laba Bersih, Kas Akhir, and the Jurnal Draf link.
- The hero is navy in **both** modes; secondary cards are white-on-grey in light mode, navy in dark; figures are tabular; the period presets still switch the figures.
- Trigger a balance-sheet error (stop the API, reload) → the hero shows its on-navy error + a readable retry button.

- [ ] **Step 3: Commit any smoke fixes** (skip if none)

```bash
git add -A
git commit -m "fix(dashboard): hero visual smoke adjustments

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Only the dashboard feature + the one i18n key change. Do NOT install Motion, do the a11y/44px sweep, or touch `SummaryCard`/`DashboardFilters` internals — those are 3c / out of scope.
- The hero uses the navy `--sidebar-*` tokens (navy in both modes) so it's premium-navy regardless of light/dark, by design.
- `MoneyText` renders `tabular-nums font-semibold` in the inherited text color → white inside the hero automatically.

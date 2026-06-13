# Dashboard (Plan 4b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `/dashboard` route with seven KPI cards driven by the three financial reports plus a draft-journal count, controlled by a period selector.

**Architecture:** A `features/dashboard/` module: a pure period helper, tolerant Zod schemas for the three reports, four independent `useQuery` hooks over `apiFetch`, a presentational `SummaryCard`, a `DashboardFilters` period selector, and a `DashboardPage` that owns period state and renders the card grid. Each report query loads/errors independently (per-card skeleton + inline retry).

**Tech Stack:** React 19 + React Compiler, TanStack Query v5, TanStack Router (file-based), Zod v4, shadcn `Card`/`Skeleton`, date-fns, decimal.js `Money`, Vitest 4 + RTL + MSW v2.

**Reference spec:** `docs/superpowers/specs/2026-06-13-dashboard-design.md`

---

## File Structure

```
src/features/dashboard/
  period.ts               // Period type + computePeriod(preset, today) + periodValid (pure)
  period.test.ts
  schema.ts               // balanceSheet / incomeStatement / cashFlow / draftCount schemas
  schema.test.ts
  hooks.ts                // useBalanceSheet / useIncomeStatement / useCashFlow / useDraftCount
  hooks.test.tsx
  SummaryCard.tsx         // presentational card: title, value, loading/error/hint
  SummaryCard.test.tsx
  DashboardFilters.tsx    // preset buttons + custom range inputs
  DashboardFilters.test.tsx
  DashboardPage.tsx       // owns period state, calls hooks, renders the 7-card grid
  DashboardPage.test.tsx
```

Modify:
- `src/lib/i18n/messages.id.ts` — add the `dashboard` message group.
- `src/lib/query/keys.ts` — add the `reports` key namespace.
- `src/test/handlers.ts` — add report fixtures + MSW handlers.
- `src/app/routes/_app/dashboard.tsx` — render `<DashboardPage />` instead of the placeholder.

**Existing helpers to reuse (do NOT recreate):** `apiFetch(path, { query, schema })` (`src/lib/api/client.ts`), `moneyString` (`src/lib/schemas/common.ts`, already allows a leading `-`), `MoneyText` (`src/components/common/MoneyText.tsx`, prop `value: string`), `toApiDate(d: Date)` and `isRangeValid(from, to)` and `formatDateID(apiDate)` (`src/lib/format/date.ts`), `PageHeader` (`src/components/common/PageHeader.tsx`, prop `title`), `Card`/`CardHeader`/`CardTitle`/`CardContent` (`src/components/ui/card.tsx`), `Skeleton`, `Button`, `Input`, `Label`, `useT()` (returns the `id` catalog; `Messages = typeof id` so new keys are auto-typed).

**Money formatting note:** `Money.from('1500000.0000').toRupiah()` → `'Rp 1.500.000'` (id-ID currency, no decimals, ASCII space). Test fixtures below use **distinct** totals so `getByText` never matches two cards.

---

### Task 1: i18n group + report query keys

**Files:**
- Modify: `src/lib/i18n/messages.id.ts`
- Modify: `src/lib/query/keys.ts`

- [ ] **Step 1: Add the `dashboard` i18n group**

In `src/lib/i18n/messages.id.ts`, add this group inside the `id` object (place it after the existing `nav` group; keep the trailing comma so `export type Messages = typeof id;` at the bottom still type-checks):

```ts
  dashboard: {
    totalAssets: 'Total Aset',
    totalLiabilities: 'Total Kewajiban',
    totalEquity: 'Total Ekuitas',
    revenue: 'Pendapatan',
    netIncome: 'Laba Bersih',
    endingCash: 'Kas Akhir',
    draftEntries: 'Jurnal Draft',
    thisMonth: 'Bulan Ini',
    thisQuarter: 'Kuartal Ini',
    thisYear: 'Tahun Ini',
    custom: 'Kustom',
    from: 'Dari',
    to: 'Sampai',
    rangeInvalid: "Tanggal 'Dari' harus sebelum 'Sampai'",
    loadError: 'Gagal memuat',
    retry: 'Coba lagi',
    asOfLabel: 'per',
  },
```

- [ ] **Step 2: Add the `reports` query keys**

In `src/lib/query/keys.ts`, add a `reports` entry to the `queryKeys` object (after `payments`):

```ts
  reports: {
    all: ['reports'] as const,
    balanceSheet: (asOf: string) => ['reports', 'balance-sheet', asOf] as const,
    incomeStatement: (from: string, to: string) => ['reports', 'income-statement', from, to] as const,
    cashFlow: (from: string, to: string) => ['reports', 'cash-flow', from, to] as const,
    draftCount: () => ['reports', 'draft-count'] as const,
  },
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm build`
Expected: build succeeds (no TS errors). This confirms the new keys/i18n are well-typed before anything references them.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/messages.id.ts src/lib/query/keys.ts
git commit -m "feat(dashboard): add dashboard i18n group + reports query keys"
```

---

### Task 2: Period logic (`period.ts`)

**Files:**
- Create: `src/features/dashboard/period.ts`
- Test: `src/features/dashboard/period.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/dashboard/period.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computePeriod, periodValid } from './period';

// Local-time 13 Jun 2026 (month is 0-indexed). toApiDate uses local getters.
const today = new Date(2026, 5, 13);

describe('computePeriod', () => {
  it('year -> 1 Jan to today', () => {
    expect(computePeriod('year', today)).toEqual({ preset: 'year', from: '2026-01-01', to: '2026-06-13' });
  });
  it('quarter -> 1 Apr to today (Q2)', () => {
    expect(computePeriod('quarter', today)).toEqual({ preset: 'quarter', from: '2026-04-01', to: '2026-06-13' });
  });
  it('month -> 1 Jun to today', () => {
    expect(computePeriod('month', today)).toEqual({ preset: 'month', from: '2026-06-01', to: '2026-06-13' });
  });
});

describe('periodValid', () => {
  it('true when from <= to', () => {
    expect(periodValid({ preset: 'custom', from: '2026-01-01', to: '2026-06-13' })).toBe(true);
  });
  it('false when from > to', () => {
    expect(periodValid({ preset: 'custom', from: '2026-07-01', to: '2026-06-13' })).toBe(false);
  });
  it('false when a bound is empty', () => {
    expect(periodValid({ preset: 'custom', from: '', to: '2026-06-13' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/features/dashboard/period.test.ts`
Expected: FAIL — cannot resolve `./period`.

- [ ] **Step 3: Write the implementation**

Create `src/features/dashboard/period.ts`:

```ts
import { startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { isRangeValid, toApiDate } from '@/lib/format/date';

export type PeriodPreset = 'month' | 'quarter' | 'year' | 'custom';

export interface Period {
  preset: PeriodPreset;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

/** Build a Period for a non-custom preset, relative to `today`. */
export function computePeriod(preset: Exclude<PeriodPreset, 'custom'>, today: Date): Period {
  const start =
    preset === 'month' ? startOfMonth(today) : preset === 'quarter' ? startOfQuarter(today) : startOfYear(today);
  return { preset, from: toApiDate(start), to: toApiDate(today) };
}

/** True when both bounds are present and from <= to. */
export function periodValid(p: Period): boolean {
  return !!p.from && !!p.to && isRangeValid(p.from, p.to);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run src/features/dashboard/period.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/period.ts src/features/dashboard/period.test.ts
git commit -m "feat(dashboard): period presets + validity helper"
```

---

### Task 3: Report schemas (`schema.ts`)

**Files:**
- Create: `src/features/dashboard/schema.ts`
- Test: `src/features/dashboard/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/dashboard/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { balanceSheetSchema, cashFlowSchema, draftCountSchema, incomeStatementSchema } from './schema';

describe('dashboard report schemas', () => {
  it('balanceSheet keeps totals and strips nested detail', () => {
    const r = balanceSheetSchema.parse({
      asOf: '2026-06-13',
      assets: { groups: [], total: '0.0000' },
      liabilities: { groups: [], total: '0.0000' },
      equity: { groups: [], total: '0.0000' },
      totalAssets: '1500000.0000',
      totalLiabilities: '600000.0000',
      totalEquity: '900000.0000',
      currentYearEarnings: '0.0000',
      balanced: true,
    });
    expect(r.totalAssets).toBe('1500000.0000');
    expect('assets' in r).toBe(false);
  });

  it('incomeStatement keeps revenue + netIncome (incl. negative)', () => {
    const r = incomeStatementSchema.parse({
      from: '2026-01-01', to: '2026-06-13', revenue: '2000000.0000', cogs: '0.0000', netIncome: '-50000.0000',
    });
    expect(r.revenue).toBe('2000000.0000');
    expect(r.netIncome).toBe('-50000.0000');
  });

  it('cashFlow keeps netChange + kasAkhir', () => {
    const r = cashFlowSchema.parse({
      from: '2026-01-01', to: '2026-06-13', netIncome: '0.0000', netChange: '750000.0000',
      kasAwal: '250000.0000', kasAkhir: '1234000.0000', reconciles: true,
    });
    expect(r.kasAkhir).toBe('1234000.0000');
  });

  it('draftCount reads the envelope total', () => {
    const r = draftCountSchema.parse({ data: [], total: 3, limit: 1, offset: 0 });
    expect(r.total).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/features/dashboard/schema.test.ts`
Expected: FAIL — cannot resolve `./schema`.

- [ ] **Step 3: Write the implementation**

Create `src/features/dashboard/schema.ts`:

```ts
import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const balanceSheetSchema = z.object({
  asOf: z.string().nullish(),
  totalAssets: moneyString,
  totalLiabilities: moneyString,
  totalEquity: moneyString,
  currentYearEarnings: moneyString.nullish(),
  balanced: z.boolean().nullish(),
});
export type BalanceSheet = z.infer<typeof balanceSheetSchema>;

export const incomeStatementSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  revenue: moneyString,
  netIncome: moneyString,
});
export type IncomeStatement = z.infer<typeof incomeStatementSchema>;

export const cashFlowSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  netChange: moneyString,
  kasAwal: moneyString.nullish(),
  kasAkhir: moneyString,
});
export type CashFlow = z.infer<typeof cashFlowSchema>;

export const draftCountSchema = z.object({ total: z.number() });
export type DraftCount = z.infer<typeof draftCountSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run src/features/dashboard/schema.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/schema.ts src/features/dashboard/schema.test.ts
git commit -m "feat(dashboard): tolerant Zod schemas for the three reports + draft count"
```

---

### Task 4: MSW report handlers + query hooks (`hooks.ts`)

**Files:**
- Modify: `src/test/handlers.ts`
- Create: `src/features/dashboard/hooks.ts`
- Test: `src/features/dashboard/hooks.test.tsx`

- [ ] **Step 1: Add report fixtures + handlers to MSW**

First check for an existing journal-entries handler:

Run: `grep -n "journal-entries" src/test/handlers.ts`
Expected: no match (the journal register isn't built). If a match exists, extend that handler to branch on `status` per Step 1 instead of adding a duplicate.

In `src/test/handlers.ts`, add these fixtures near the other `*Fixtures` exports (top section):

```ts
// --- reports (Plan 4b dashboard) ---
export const balanceSheetFixture = (asOf: string) => ({
  asOf,
  assets: { groups: [], total: '0.0000' },
  liabilities: { groups: [], total: '0.0000' },
  equity: { groups: [], total: '0.0000' },
  totalAssets: '1500000.0000',
  totalLiabilities: '600000.0000',
  totalEquity: '900000.0000',
  currentYearEarnings: '0.0000',
  balanced: true,
});
export const incomeStatementFixture = (from: string, to: string) => ({
  from, to,
  revenue: '2000000.0000', cogs: '0.0000', grossProfit: '2000000.0000',
  operatingExpense: '0.0000', operatingProfit: '2000000.0000', otherIncome: '0.0000',
  otherExpense: '0.0000', profitBeforeTax: '2000000.0000', taxExpense: '0.0000',
  netIncome: '1750000.0000',
});
export const cashFlowFixture = (from: string, to: string) => ({
  from, to, netIncome: '1750000.0000',
  operating: { adjustments: [], total: '0.0000' }, investing: { lines: [], total: '0.0000' },
  financing: { lines: [], total: '0.0000' }, netChange: '750000.0000',
  kasAwal: '250000.0000', kasAkhir: '1234000.0000', reconciles: true,
});
```

Then add these handlers to the exported `handlers` array (alongside the other `http.get` entries):

```ts
  http.get(`${API}/reports/balance-sheet`, ({ request }) => {
    const asOf = new URL(request.url).searchParams.get('asOf') ?? '';
    return HttpResponse.json(balanceSheetFixture(asOf));
  }),
  http.get(`${API}/reports/income-statement`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    return HttpResponse.json(incomeStatementFixture(u.get('from') ?? '', u.get('to') ?? ''));
  }),
  http.get(`${API}/reports/cash-flow`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    return HttpResponse.json(cashFlowFixture(u.get('from') ?? '', u.get('to') ?? ''));
  }),
  http.get(`${API}/ledger/journal-entries`, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status');
    const total = status === 'DRAFT' ? 3 : 0;
    return HttpResponse.json({ data: [], total, limit: 1, offset: 0 });
  }),
```

- [ ] **Step 2: Write the failing test**

Create `src/features/dashboard/hooks.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it } from 'vitest';
import { useBalanceSheet, useDraftCount } from './hooks';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('useBalanceSheet parses totals from the API', async () => {
  const { result } = renderHook(() => useBalanceSheet('2026-06-13'), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.totalAssets).toBe('1500000.0000');
});

it('useDraftCount reads the envelope total', async () => {
  const { result } = renderHook(() => useDraftCount(), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.total).toBe(3);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test --run src/features/dashboard/hooks.test.tsx`
Expected: FAIL — cannot resolve `./hooks`.

- [ ] **Step 4: Write the implementation**

Create `src/features/dashboard/hooks.ts`:

```ts
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import {
  balanceSheetSchema,
  cashFlowSchema,
  draftCountSchema,
  incomeStatementSchema,
  type BalanceSheet,
  type CashFlow,
  type DraftCount,
  type IncomeStatement,
} from './schema';

export function useBalanceSheet(asOf: string): UseQueryResult<BalanceSheet, ApiError> {
  return useQuery<BalanceSheet, ApiError>({
    queryKey: queryKeys.reports.balanceSheet(asOf),
    queryFn: () => apiFetch('/reports/balance-sheet', { query: { asOf }, schema: balanceSheetSchema }),
    enabled: !!asOf,
  });
}

export function useIncomeStatement(from: string, to: string, enabled: boolean): UseQueryResult<IncomeStatement, ApiError> {
  return useQuery<IncomeStatement, ApiError>({
    queryKey: queryKeys.reports.incomeStatement(from, to),
    queryFn: () => apiFetch('/reports/income-statement', { query: { from, to }, schema: incomeStatementSchema }),
    enabled,
  });
}

export function useCashFlow(from: string, to: string, enabled: boolean): UseQueryResult<CashFlow, ApiError> {
  return useQuery<CashFlow, ApiError>({
    queryKey: queryKeys.reports.cashFlow(from, to),
    queryFn: () => apiFetch('/reports/cash-flow', { query: { from, to }, schema: cashFlowSchema }),
    enabled,
  });
}

export function useDraftCount(): UseQueryResult<DraftCount, ApiError> {
  return useQuery<DraftCount, ApiError>({
    queryKey: queryKeys.reports.draftCount(),
    queryFn: () => apiFetch('/ledger/journal-entries', { query: { status: 'DRAFT', limit: 1 }, schema: draftCountSchema }),
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test --run src/features/dashboard/hooks.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/test/handlers.ts src/features/dashboard/hooks.ts src/features/dashboard/hooks.test.tsx
git commit -m "feat(dashboard): report query hooks + MSW report handlers"
```

---

### Task 5: SummaryCard (`SummaryCard.tsx`)

**Files:**
- Create: `src/features/dashboard/SummaryCard.tsx`
- Test: `src/features/dashboard/SummaryCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/dashboard/SummaryCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { SummaryCard } from './SummaryCard';

it('renders title and value', () => {
  render(<SummaryCard title="Total Aset" value="Rp 1.500.000" />);
  expect(screen.getByText('Total Aset')).toBeInTheDocument();
  expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
});

it('shows a skeleton while loading and hides the value', () => {
  render(<SummaryCard title="Total Aset" value="Rp 1.500.000" loading />);
  expect(screen.queryByText('Rp 1.500.000')).not.toBeInTheDocument();
});

it('shows an error with a retry that fires onRetry', async () => {
  const user = userEvent.setup();
  const onRetry = vi.fn();
  render(<SummaryCard title="Kas Akhir" value="" error onRetry={onRetry} />);
  expect(screen.getByText(/gagal memuat/i)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /coba lagi/i }));
  expect(onRetry).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/features/dashboard/SummaryCard.test.tsx`
Expected: FAIL — cannot resolve `./SummaryCard`.

- [ ] **Step 3: Write the implementation**

Create `src/features/dashboard/SummaryCard.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/useT';

interface Props {
  title: string;
  value: ReactNode;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  hint?: string;
}

export function SummaryCard({ title, value, loading, error, onRetry, hint }: Props) {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : error ? (
          <div className="space-y-1">
            <p className="text-sm text-destructive">{t.dashboard.loadError}</p>
            {onRetry ? (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onRetry}>
                {t.dashboard.retry}
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
            {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run src/features/dashboard/SummaryCard.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/SummaryCard.tsx src/features/dashboard/SummaryCard.test.tsx
git commit -m "feat(dashboard): SummaryCard with loading/error/hint states"
```

---

### Task 6: DashboardFilters (`DashboardFilters.tsx`)

**Files:**
- Create: `src/features/dashboard/DashboardFilters.tsx`
- Test: `src/features/dashboard/DashboardFilters.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/dashboard/DashboardFilters.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { DashboardFilters } from './DashboardFilters';
import { computePeriod } from './period';

const today = new Date(2026, 5, 13);

it('calls onSelectPreset when a preset button is clicked', async () => {
  const user = userEvent.setup();
  const onSelectPreset = vi.fn();
  render(<DashboardFilters period={computePeriod('year', today)} onSelectPreset={onSelectPreset} onCustomChange={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: 'Bulan Ini' }));
  expect(onSelectPreset).toHaveBeenCalledWith('month');
});

it('shows custom date inputs and reports changes to from', () => {
  const onCustomChange = vi.fn();
  render(
    <DashboardFilters
      period={{ preset: 'custom', from: '2026-01-01', to: '2026-06-13' }}
      onSelectPreset={vi.fn()}
      onCustomChange={onCustomChange}
    />,
  );
  fireEvent.change(screen.getByLabelText('Dari'), { target: { value: '2026-03-01' } });
  expect(onCustomChange).toHaveBeenCalledWith('2026-03-01', '2026-06-13');
});

it('shows the invalid-range hint when from > to', () => {
  render(
    <DashboardFilters
      period={{ preset: 'custom', from: '2026-07-01', to: '2026-06-13' }}
      onSelectPreset={vi.fn()}
      onCustomChange={vi.fn()}
    />,
  );
  expect(screen.getByText(/harus sebelum/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/features/dashboard/DashboardFilters.test.tsx`
Expected: FAIL — cannot resolve `./DashboardFilters`.

- [ ] **Step 3: Write the implementation**

Create `src/features/dashboard/DashboardFilters.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { periodValid, type Period, type PeriodPreset } from './period';

interface Props {
  period: Period;
  onSelectPreset: (preset: Exclude<PeriodPreset, 'custom'>) => void;
  onCustomChange: (from: string, to: string) => void;
}

const PRESETS: { key: Exclude<PeriodPreset, 'custom'>; labelKey: 'thisMonth' | 'thisQuarter' | 'thisYear' }[] = [
  { key: 'month', labelKey: 'thisMonth' },
  { key: 'quarter', labelKey: 'thisQuarter' },
  { key: 'year', labelKey: 'thisYear' },
];

export function DashboardFilters({ period, onSelectPreset, onCustomChange }: Props) {
  const t = useT();
  const valid = periodValid(period);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            type="button"
            size="sm"
            variant={period.preset === p.key ? 'default' : 'outline'}
            onClick={() => onSelectPreset(p.key)}
          >
            {t.dashboard[p.labelKey]}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={period.preset === 'custom' ? 'default' : 'outline'}
          onClick={() => onCustomChange(period.from, period.to)}
        >
          {t.dashboard.custom}
        </Button>
      </div>

      {period.preset === 'custom' ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dash-from">{t.dashboard.from}</Label>
            <Input
              id="dash-from"
              type="date"
              aria-label={t.dashboard.from}
              value={period.from}
              onChange={(e) => onCustomChange(e.target.value, period.to)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dash-to">{t.dashboard.to}</Label>
            <Input
              id="dash-to"
              type="date"
              aria-label={t.dashboard.to}
              value={period.to}
              onChange={(e) => onCustomChange(period.from, e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {valid ? (
        <p className="text-xs text-muted-foreground">
          {formatDateID(period.from)} – {formatDateID(period.to)}
        </p>
      ) : (
        <p className="text-xs text-destructive">{t.dashboard.rangeInvalid}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run src/features/dashboard/DashboardFilters.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/DashboardFilters.tsx src/features/dashboard/DashboardFilters.test.tsx
git commit -m "feat(dashboard): period selector with presets + custom range"
```

---

### Task 7: DashboardPage (`DashboardPage.tsx`)

**Files:**
- Create: `src/features/dashboard/DashboardPage.tsx`
- Test: `src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/dashboard/DashboardPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { startOfMonth } from 'date-fns';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { toApiDate } from '@/lib/format/date';
import { useSession } from '@/stores/session';
import { DashboardPage } from './DashboardPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

it('renders the seven summary cards from the reports', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  renderPage();
  expect(await screen.findByText('Rp 1.500.000')).toBeInTheDocument(); // totalAssets
  expect(screen.getByText('Rp 1.750.000')).toBeInTheDocument(); // netIncome
  expect(screen.getByText('Rp 1.234.000')).toBeInTheDocument(); // kasAkhir
  expect(screen.getByText('3')).toBeInTheDocument(); // draft count
});

it('refetches the period cards with the new range when a preset is clicked', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let lastFrom: string | null = null;
  server.use(
    http.get(`${API}/reports/income-statement`, ({ request }) => {
      lastFrom = new URL(request.url).searchParams.get('from');
      return HttpResponse.json({ from: lastFrom, to: '2026-06-30', revenue: '2000000.0000', netIncome: '1750000.0000' });
    }),
  );
  renderPage();
  await screen.findByText('Rp 1.750.000');
  // The default load uses the year preset (from = 1 Jan), which also ends in "-01".
  // Assert against the actual current month start so the click is what's verified.
  const expectedFrom = toApiDate(startOfMonth(new Date()));
  await user.click(screen.getByRole('button', { name: 'Bulan Ini' }));
  await waitFor(() => expect(lastFrom).toBe(expectedFrom));
});

it('shows an error + retry when cash-flow fails, leaving other cards intact', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let calls = 0;
  server.use(
    http.get(`${API}/reports/cash-flow`, () => {
      calls += 1;
      return calls === 1
        ? HttpResponse.json({ code: 'INTERNAL', message: 'boom' }, { status: 500 })
        : HttpResponse.json({ from: '2026-01-01', to: '2026-06-13', netChange: '750000.0000', kasAkhir: '1234000.0000' });
    }),
  );
  renderPage();
  expect(await screen.findByText(/gagal memuat/i)).toBeInTheDocument(); // Kas Akhir errored
  expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument(); // totalAssets unaffected
  await user.click(screen.getByRole('button', { name: /coba lagi/i }));
  expect(await screen.findByText('Rp 1.234.000')).toBeInTheDocument(); // Kas Akhir after retry
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/features/dashboard/DashboardPage.test.tsx`
Expected: FAIL — cannot resolve `./DashboardPage`.

- [ ] **Step 3: Write the implementation**

Create `src/features/dashboard/DashboardPage.tsx`:

```tsx
import { useState } from 'react';
import { MoneyText } from '@/components/common/MoneyText';
import { PageHeader } from '@/components/common/PageHeader';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { DashboardFilters } from './DashboardFilters';
import { SummaryCard } from './SummaryCard';
import { useBalanceSheet, useCashFlow, useDraftCount, useIncomeStatement } from './hooks';
import { computePeriod, periodValid, type Period, type PeriodPreset } from './period';

export function DashboardPage() {
  const t = useT();
  const [period, setPeriod] = useState<Period>(() => computePeriod('year', new Date()));
  const valid = periodValid(period);
  const asOf = valid ? period.to : '';

  const bs = useBalanceSheet(asOf);
  const is = useIncomeStatement(period.from, period.to, valid);
  const cf = useCashFlow(period.from, period.to, valid);
  const drafts = useDraftCount();

  const rangeHint = valid ? `${formatDateID(period.from)} – ${formatDateID(period.to)}` : undefined;
  const asOfHint = valid ? `${t.dashboard.asOfLabel} ${formatDateID(period.to)}` : undefined;
  const money = (v?: string) => (v ? <MoneyText value={v} /> : '—');

  return (
    <div className="space-y-6">
      <PageHeader title={t.nav.dashboard} />
      <DashboardFilters
        period={period}
        onSelectPreset={(preset: Exclude<PeriodPreset, 'custom'>) => setPeriod(computePeriod(preset, new Date()))}
        onCustomChange={(from, to) => setPeriod({ preset: 'custom', from, to })}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title={t.dashboard.totalAssets} value={money(bs.data?.totalAssets)} loading={bs.isLoading} error={bs.isError} onRetry={() => void bs.refetch()} hint={asOfHint} />
        <SummaryCard title={t.dashboard.totalLiabilities} value={money(bs.data?.totalLiabilities)} loading={bs.isLoading} error={bs.isError} onRetry={() => void bs.refetch()} hint={asOfHint} />
        <SummaryCard title={t.dashboard.totalEquity} value={money(bs.data?.totalEquity)} loading={bs.isLoading} error={bs.isError} onRetry={() => void bs.refetch()} hint={asOfHint} />
        <SummaryCard title={t.dashboard.revenue} value={money(is.data?.revenue)} loading={is.isLoading} error={is.isError} onRetry={() => void is.refetch()} hint={rangeHint} />
        <SummaryCard title={t.dashboard.netIncome} value={money(is.data?.netIncome)} loading={is.isLoading} error={is.isError} onRetry={() => void is.refetch()} hint={rangeHint} />
        <SummaryCard title={t.dashboard.endingCash} value={money(cf.data?.kasAkhir)} loading={cf.isLoading} error={cf.isError} onRetry={() => void cf.refetch()} hint={rangeHint} />
        <SummaryCard title={t.dashboard.draftEntries} value={drafts.data?.total ?? '—'} loading={drafts.isLoading} error={drafts.isError} onRetry={() => void drafts.refetch()} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run src/features/dashboard/DashboardPage.test.tsx`
Expected: PASS (3 tests).

> If `getByText('3')` ever matches more than one node, it means a money fixture collided with the literal `3`; the fixtures in Task 4 are chosen distinct (`1.500.000 / 600.000 / 900.000 / 2.000.000 / 1.750.000 / 1.234.000`) specifically to avoid this — do not change them without re-checking.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/DashboardPage.tsx src/features/dashboard/DashboardPage.test.tsx
git commit -m "feat(dashboard): DashboardPage with 7-card grid + period state"
```

---

### Task 8: Wire the route + full verification

**Files:**
- Modify: `src/app/routes/_app/dashboard.tsx`

- [ ] **Step 1: Replace the placeholder route body**

Overwrite `src/app/routes/_app/dashboard.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/features/dashboard/DashboardPage';

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
});
```

- [ ] **Step 2: Run the full test suite**

Run: `pnpm test --run`
Expected: all files pass — the 4 prior payment+others suites plus the 6 new dashboard suites (period 6, schema 4, hooks 2, SummaryCard 3, DashboardFilters 3, DashboardPage 3 = 21 new tests). Total test count rises from 112 to 133.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: 0 errors. Pre-existing react-compiler `incompatible-library` warnings are acceptable; the dashboard files use no `react-hook-form`/`TanStack Table`, so they should add no new warnings.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: build succeeds; `/dashboard` ships in the bundle.

- [ ] **Step 5: Dev smoke (optional)**

Run: `pnpm dev` and open `/dashboard` after logging in (creds in `.env`); confirm the seven cards render with live values (or `Rp 0` for a fresh company), and switching presets/custom range updates the period-based cards. Stop the dev server when done.

- [ ] **Step 6: Commit**

```bash
git add src/app/routes/_app/dashboard.tsx
git commit -m "feat(dashboard): wire DashboardPage into the /dashboard route"
```

---

## Done Criteria

- `/dashboard` renders seven cards bound to the reconciled report fields: Total Aset / Kewajiban / Ekuitas (balance-sheet), Pendapatan + Laba Bersih (income-statement), Kas Akhir (cash-flow), Jurnal Draft (count). Money via `MoneyText`; draft count as an integer.
- Period selector: Bulan/Kuartal/Tahun presets (default Tahun = YTD) + custom range; changing it refetches the date-ranged cards (verified via echoed `from` query param); invalid range (`from > to`) disables the date-ranged + balance-sheet queries and shows a hint while keeping last good values.
- Four independent `useQuery` hooks validate responses with tolerant Zod schemas under the `reports` query-key namespace; per-card loading skeletons and inline error+retry; a balance-sheet failure isolates to its three cards.
- All tests pass; lint clean (no new warnings); build green.

## Out of Scope (YAGNI)

Drill-down/clickable cards (no target screens yet), charts/trends, a manual refresh button, and per-card period overrides. These are explicitly deferred.

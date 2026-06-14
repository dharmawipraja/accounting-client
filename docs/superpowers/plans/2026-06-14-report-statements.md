# Report Screens — Financial Statements (Plan 7a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared report infrastructure + the three financial statements (Neraca / Laba Rugi / Arus Kas) under `/reports`.

**Architecture:** New `features/reports/` module. A generic `useReport(path, params, schema, enabled)` runner keyed on `['report', path, params]` (isolated from the dashboard's `['reports', …]` keys — no dashboard changes, no cache collision). A `ReportDateControls` (asOf vs from/to), a shared `StatementView` row renderer, and a `ReportContent` loading/error wrapper. Each statement page fetches and maps its data into `StatementView` rows. Reports are any-auth (no role-gating).

**Tech Stack:** React 19, TanStack Router (file-based) + Query v5, Zod v4, shadcn/ui, decimal.js `Money`, Vitest 4 + RTL + MSW v2.

**Reference spec:** `docs/superpowers/specs/2026-06-14-report-statements-design.md`

---

## Ordering note

The `/reports` landing page uses typed `<Link to="/reports/balance-sheet">` etc., which only type-check once the routes exist in `src/routeTree.gen.ts` (Task 8). So the full `tsc` build is deferred to Task 8. The statement pages (Tasks 6–7) render directly (no `Link`/router) and are verified with `pnpm test --run`. Tasks 1–7 touch no routes.

## File Structure

```
src/features/reports/
  schema.ts / schema.test.ts        # Task 2 — full report schemas
  useReport.ts / useReport.test.tsx # Task 3 — generic runner
  subtypeLabel.ts / .test.ts        # Task 3 — subtype → Indonesian
  ReportDateControls.tsx / .test.tsx# Task 4 — asOf | range controls
  StatementView.tsx / .test.tsx     # Task 5 — grouped statement renderer
  ReportContent.tsx                 # Task 5 — loading/error wrapper
  BalanceSheetPage.tsx / .test.tsx  # Task 6
  IncomeStatementPage.tsx / .test.tsx, CashFlowPage.tsx / .test.tsx  # Task 7
  ReportsIndexPage.tsx              # Task 8 — /reports landing
src/app/routes/_app/reports{,.index,.balance-sheet,.income-statement,.cash-flow}.tsx  # Task 8
```

Modify: `src/lib/i18n/messages.id.ts` (+`reports` group, +`nav.reports`), `src/components/common/AppShell.tsx` (+nav item).

**Reuse:** `apiFetch(path, {query, schema})`, `MoneyText`/`Money` (`from`/`plus`/`toApi`), `toApiDate`/`isRangeValid` (`@/lib/format/date`), `Skeleton`, `ErrorState`, `PageHeader`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`, `Input`/`Label`, shadcn `Table`, `Badge`. No MSW handler changes — the statement page tests provide their own full fixtures via `server.use` (the dashboard's minimal `/reports/*` fixtures lack the `Lines`/`groups` the full schemas need).

---

### Task 1: i18n — `reports` group + nav

**Files:**
- Modify: `src/lib/i18n/messages.id.ts`

- [ ] **Step 1: Add `nav.reports` and the `reports` group**

In `src/lib/i18n/messages.id.ts`, add to the `nav` group: `reports: 'Laporan',`. Then add this group (e.g. after `journals`). Keep `export type Messages = typeof id;` intact.

```ts
  reports: {
    title: 'Laporan',
    balanceSheet: 'Neraca',
    balanceSheetDesc: 'Posisi aset, kewajiban, dan ekuitas per tanggal',
    incomeStatement: 'Laba Rugi',
    incomeStatementDesc: 'Pendapatan dan beban untuk satu periode',
    cashFlow: 'Arus Kas',
    cashFlowDesc: 'Arus kas operasi, investasi, dan pendanaan',
    asOfLabel: 'Per Tanggal',
    from: 'Dari',
    to: 'Sampai',
    rangeInvalid: "Tanggal 'Dari' harus sebelum 'Sampai'",
    assets: 'Aset',
    liabilities: 'Kewajiban',
    equity: 'Ekuitas',
    totalAssets: 'Total Aset',
    totalLiabilities: 'Total Kewajiban',
    totalEquity: 'Total Ekuitas',
    totalLiabEquity: 'Total Kewajiban + Ekuitas',
    balanced: 'Seimbang',
    unbalanced: 'Tidak seimbang',
    subtotal: 'Subtotal',
    revenue: 'Pendapatan',
    totalRevenue: 'Total Pendapatan',
    cogs: 'Harga Pokok Penjualan',
    grossProfit: 'Laba Kotor',
    operatingExpense: 'Beban Operasional',
    operatingProfit: 'Laba Operasi',
    otherIncome: 'Pendapatan Lain',
    otherExpense: 'Beban Lain',
    profitBeforeTax: 'Laba Sebelum Pajak',
    taxExpense: 'Beban Pajak',
    netIncome: 'Laba Bersih',
    operating: 'Arus Kas Operasi',
    cashFromOperating: 'Kas Bersih dari Operasi',
    investing: 'Arus Kas Investasi',
    cashFromInvesting: 'Kas Bersih dari Investasi',
    financing: 'Arus Kas Pendanaan',
    cashFromFinancing: 'Kas Bersih dari Pendanaan',
    netChange: 'Perubahan Kas Bersih',
    kasAwal: 'Kas Awal',
    kasAkhir: 'Kas Akhir',
    subtype: {
      CURRENT_ASSET: 'Aset Lancar',
      NON_CURRENT_ASSET: 'Aset Tidak Lancar',
      FIXED_ASSET: 'Aset Tetap',
      ACCUMULATED_DEPRECIATION: 'Akumulasi Penyusutan',
      CURRENT_LIABILITY: 'Utang Lancar',
      NON_CURRENT_LIABILITY: 'Utang Jangka Panjang',
      TAX_PAYABLE: 'Utang Pajak',
      TAX_RECEIVABLE: 'Pajak Dibayar Dimuka',
      EQUITY: 'Ekuitas',
      CURRENT_EARNINGS: 'Laba (Rugi) Berjalan',
      REVENUE: 'Pendapatan',
      COGS: 'Harga Pokok Penjualan',
      OPERATING_EXPENSE: 'Beban Operasional',
      OTHER_INCOME: 'Pendapatan Lain',
      OTHER_EXPENSE: 'Beban Lain',
    },
  },
```

- [ ] **Step 2: Verify** — Run: `pnpm build` (expected: succeeds).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat(reports): i18n group + nav label"
```

---

### Task 2: Schemas (`schema.ts`)

**Files:**
- Create: `src/features/reports/schema.ts`
- Test: `src/features/reports/schema.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/features/reports/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { balanceSheetReportSchema, incomeStatementReportSchema, cashFlowReportSchema } from './schema';

describe('report schemas', () => {
  it('balance sheet parses sections → subtype groups → lines + totals', () => {
    const r = balanceSheetReportSchema.parse({
      asOf: '2026-06-30',
      assets: { groups: [{ subtype: 'CURRENT_ASSET', lines: [{ code: '1-1000', name: 'Kas', amount: '500000.0000' }], subtotal: '500000.0000' }], total: '500000.0000' },
      liabilities: { groups: [], total: '0.0000' },
      equity: { groups: [{ subtype: 'CURRENT_EARNINGS', lines: [{ code: '', name: 'Laba Berjalan', amount: '500000.0000' }], subtotal: '500000.0000' }], total: '500000.0000' },
      totalAssets: '500000.0000', totalLiabilities: '0.0000', totalEquity: '500000.0000', currentYearEarnings: '500000.0000', balanced: true,
    });
    expect(r.assets.groups[0].lines[0].name).toBe('Kas');
    expect(r.totalAssets).toBe('500000.0000');
  });

  it('income statement parses line sections + computed subtotals', () => {
    const r = incomeStatementReportSchema.parse({
      from: '2026-01-01', to: '2026-06-30',
      revenue: '2000000.0000', revenueLines: [{ code: '4-1000', name: 'Pendapatan', amount: '2000000.0000' }],
      cogs: '0.0000', cogsLines: [], grossProfit: '2000000.0000',
      operatingExpense: '0.0000', operatingExpenseLines: [], operatingProfit: '2000000.0000',
      otherIncome: '0.0000', otherExpense: '0.0000', profitBeforeTax: '2000000.0000', taxExpense: '0.0000', netIncome: '1750000.0000',
    });
    expect(r.netIncome).toBe('1750000.0000');
    expect(r.revenueLines[0].name).toBe('Pendapatan');
  });

  it('cash flow parses sections (empty adjustments/lines default []) + totals', () => {
    const r = cashFlowReportSchema.parse({
      from: '2026-01-01', to: '2026-06-30', netIncome: '0.0000',
      operating: { adjustments: [], total: '0.0000' }, investing: { lines: [], total: '0.0000' }, financing: { lines: [], total: '0.0000' },
      netChange: '750000.0000', kasAwal: '250000.0000', kasAkhir: '1000000.0000', reconciles: true,
    });
    expect(r.kasAkhir).toBe('1000000.0000');
    expect(r.operating.adjustments).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/reports/schema.test.ts` (FAIL: cannot resolve `./schema`).

- [ ] **Step 3: Write the implementation** — create `src/features/reports/schema.ts`:

```ts
import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const reportLineSchema = z.object({ code: z.string(), name: z.string(), amount: moneyString });
export type ReportLine = z.infer<typeof reportLineSchema>;

const groupSchema = z.object({ subtype: z.string(), lines: z.array(reportLineSchema), subtotal: moneyString });
const sectionSchema = z.object({ groups: z.array(groupSchema), total: moneyString });

export const balanceSheetReportSchema = z.object({
  asOf: z.string().nullish(),
  assets: sectionSchema,
  liabilities: sectionSchema,
  equity: sectionSchema,
  totalAssets: moneyString,
  totalLiabilities: moneyString,
  totalEquity: moneyString,
  currentYearEarnings: moneyString.nullish(),
  balanced: z.boolean().nullish(),
});
export type BalanceSheetReport = z.infer<typeof balanceSheetReportSchema>;

export const incomeStatementReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  revenue: moneyString,
  revenueLines: z.array(reportLineSchema),
  cogs: moneyString,
  cogsLines: z.array(reportLineSchema),
  grossProfit: moneyString,
  operatingExpense: moneyString,
  operatingExpenseLines: z.array(reportLineSchema),
  operatingProfit: moneyString,
  otherIncome: moneyString,
  otherExpense: moneyString,
  profitBeforeTax: moneyString,
  taxExpense: moneyString,
  netIncome: moneyString,
});
export type IncomeStatementReport = z.infer<typeof incomeStatementReportSchema>;

const cashFlowItemSchema = z.object({ name: z.string().nullish(), amount: moneyString.nullish() }).passthrough();
const cashFlowSectionSchema = z.object({
  adjustments: z.array(cashFlowItemSchema).default([]),
  lines: z.array(cashFlowItemSchema).default([]),
  total: moneyString,
});
export const cashFlowReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  netIncome: moneyString,
  operating: cashFlowSectionSchema,
  investing: cashFlowSectionSchema,
  financing: cashFlowSectionSchema,
  netChange: moneyString,
  kasAwal: moneyString,
  kasAkhir: moneyString,
  reconciles: z.boolean().nullish(),
});
export type CashFlowReport = z.infer<typeof cashFlowReportSchema>;
export type CashFlowItem = z.infer<typeof cashFlowItemSchema>;
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/reports/schema.test.ts` (PASS, 3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/schema.ts src/features/reports/schema.test.ts
git commit -m "feat(reports): full statement schemas"
```

---

### Task 3: Runner + subtype helper

**Files:**
- Create: `src/features/reports/useReport.ts`, `src/features/reports/subtypeLabel.ts`
- Test: `src/features/reports/useReport.test.tsx`, `src/features/reports/subtypeLabel.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/reports/subtypeLabel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { subtypeLabel } from './subtypeLabel';

describe('subtypeLabel', () => {
  it('maps known subtypes to Indonesian', () => {
    expect(subtypeLabel(id, 'CURRENT_ASSET')).toBe('Aset Lancar');
    expect(subtypeLabel(id, 'TAX_PAYABLE')).toBe('Utang Pajak');
  });
  it('falls back to the raw value for unknown subtypes', () => {
    expect(subtypeLabel(id, 'WEIRD_SUBTYPE')).toBe('WEIRD_SUBTYPE');
  });
});
```

Create `src/features/reports/useReport.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useReport } from './useReport';
import { balanceSheetReportSchema } from './schema';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('fetches a report with params and parses it', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let seenAsOf: string | null = null;
  server.use(http.get(`${API}/reports/balance-sheet`, ({ request }) => {
    seenAsOf = new URL(request.url).searchParams.get('asOf');
    return HttpResponse.json({ asOf: seenAsOf, assets: { groups: [], total: '0.0000' }, liabilities: { groups: [], total: '0.0000' }, equity: { groups: [], total: '0.0000' }, totalAssets: '0.0000', totalLiabilities: '0.0000', totalEquity: '0.0000', balanced: true });
  }));
  const { result } = renderHook(() => useReport('/reports/balance-sheet', { asOf: '2026-06-30' }, balanceSheetReportSchema), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(seenAsOf).toBe('2026-06-30');
  expect(result.current.data?.balanced).toBe(true);
});

it('does not fetch when enabled is false', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let called = false;
  server.use(http.get(`${API}/reports/balance-sheet`, () => { called = true; return HttpResponse.json({}); }));
  renderHook(() => useReport('/reports/balance-sheet', { asOf: 'x' }, balanceSheetReportSchema, false), { wrapper });
  await new Promise((r) => setTimeout(r, 200));
  expect(called).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail** — `pnpm test --run src/features/reports/subtypeLabel.test.ts src/features/reports/useReport.test.tsx` (FAIL: cannot resolve the modules).

- [ ] **Step 3: Write `src/features/reports/useReport.ts`**

```ts
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ZodType } from 'zod';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';

export function useReport<T>(path: string, params: Record<string, string | undefined>, schema: ZodType<T>, enabled = true): UseQueryResult<T, ApiError> {
  return useQuery<T, ApiError>({
    queryKey: ['report', path, params],
    queryFn: () => apiFetch(path, { query: params, schema }),
    enabled,
  });
}
```

- [ ] **Step 4: Write `src/features/reports/subtypeLabel.ts`**

```ts
import type { Messages } from '@/lib/i18n/messages.id';

export function subtypeLabel(t: Messages, subtype: string): string {
  return (t.reports.subtype as Record<string, string>)[subtype] ?? subtype;
}
```

- [ ] **Step 5: Run tests to verify they pass** — `pnpm test --run src/features/reports/subtypeLabel.test.ts src/features/reports/useReport.test.tsx` (PASS, 4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/reports/useReport.ts src/features/reports/subtypeLabel.ts src/features/reports/useReport.test.tsx src/features/reports/subtypeLabel.test.ts
git commit -m "feat(reports): generic useReport runner + subtype label helper"
```

---

### Task 4: Date controls (`ReportDateControls`)

**Files:**
- Create: `src/features/reports/ReportDateControls.tsx`
- Test: `src/features/reports/ReportDateControls.test.tsx`

- [ ] **Step 1: Write the failing test** — create `src/features/reports/ReportDateControls.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ReportDateControls } from './ReportDateControls';

it('asOf mode fires onAsOf', () => {
  const onAsOf = vi.fn();
  render(<ReportDateControls mode="asOf" asOf="2026-06-30" onAsOf={onAsOf} />);
  fireEvent.change(screen.getByLabelText(/per tanggal/i), { target: { value: '2026-05-31' } });
  expect(onAsOf).toHaveBeenCalledWith('2026-05-31');
});

it('range mode fires onRange and shows the invalid hint when from > to', () => {
  const onRange = vi.fn();
  render(<ReportDateControls mode="range" from="2026-07-01" to="2026-06-30" onRange={onRange} />);
  expect(screen.getByText(/harus sebelum/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Dari'), { target: { value: '2026-01-01' } });
  expect(onRange).toHaveBeenCalledWith('2026-01-01', '2026-06-30');
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/reports/ReportDateControls.test.tsx` (FAIL: cannot resolve `./ReportDateControls`).

- [ ] **Step 3: Write the implementation** — create `src/features/reports/ReportDateControls.tsx`:

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isRangeValid } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';

interface Props {
  mode: 'asOf' | 'range';
  asOf?: string;
  from?: string;
  to?: string;
  onAsOf?: (d: string) => void;
  onRange?: (from: string, to: string) => void;
}

export function ReportDateControls({ mode, asOf = '', from = '', to = '', onAsOf, onRange }: Props) {
  const t = useT();
  if (mode === 'asOf') {
    return (
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="r-asof">{t.reports.asOfLabel}</Label>
          <Input id="r-asof" type="date" aria-label={t.reports.asOfLabel} value={asOf} onChange={(e) => onAsOf?.(e.target.value)} />
        </div>
      </div>
    );
  }
  const valid = isRangeValid(from, to);
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="r-from">{t.reports.from}</Label>
        <Input id="r-from" type="date" aria-label={t.reports.from} value={from} onChange={(e) => onRange?.(e.target.value, to)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="r-to">{t.reports.to}</Label>
        <Input id="r-to" type="date" aria-label={t.reports.to} value={to} onChange={(e) => onRange?.(from, e.target.value)} />
      </div>
      {!valid ? <p className="text-xs text-destructive">{t.reports.rangeInvalid}</p> : null}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/reports/ReportDateControls.test.tsx` (PASS, 2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/ReportDateControls.tsx src/features/reports/ReportDateControls.test.tsx
git commit -m "feat(reports): asOf | range date controls"
```

---

### Task 5: Renderer (`StatementView`) + `ReportContent`

**Files:**
- Create: `src/features/reports/StatementView.tsx`, `src/features/reports/ReportContent.tsx`
- Test: `src/features/reports/StatementView.test.tsx`

- [ ] **Step 1: Write the failing test** — create `src/features/reports/StatementView.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { StatementView } from './StatementView';

it('renders labels and amounts, bolds totals, omits amount for header rows', () => {
  render(<StatementView rows={[
    { label: 'ASET', bold: true },
    { label: '1-1000 Kas', amount: '500000.0000', level: 2 },
    { label: 'Total Aset', amount: '500000.0000', bold: true, border: true },
  ]} />);
  expect(screen.getByText('ASET')).toBeInTheDocument();
  expect(screen.getByText('1-1000 Kas')).toBeInTheDocument();
  // Kas line + Total Aset both render the amount; the 'ASET' header has none
  expect(screen.getAllByText(/Rp\s?500\.000/).length).toBe(2);
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/reports/StatementView.test.tsx` (FAIL: cannot resolve `./StatementView`).

- [ ] **Step 3: Write `src/features/reports/StatementView.tsx`**

```tsx
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { MoneyText } from '@/components/common/MoneyText';

export interface StatementRow {
  label: string;
  amount?: string;
  level?: number;
  bold?: boolean;
  border?: boolean;
}

export function StatementView({ rows }: { rows: StatementRow[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} className={r.border ? 'border-t-2' : undefined}>
              <TableCell className={r.bold ? 'font-semibold' : undefined} style={{ paddingLeft: `${1 + (r.level ?? 0) * 1.5}rem` }}>{r.label}</TableCell>
              <TableCell className={`text-right tabular-nums ${r.bold ? 'font-semibold' : ''}`}>
                {r.amount !== undefined ? <MoneyText value={r.amount} /> : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/features/reports/ReportContent.tsx`**

```tsx
import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';

export function ReportContent<T>({ query, children }: { query: UseQueryResult<T, unknown>; children: (data: T) => ReactNode }) {
  if (query.isError) return <ErrorState error={query.error} />;
  if (query.data === undefined) return <Skeleton className="h-64 w-full" />;
  return <>{children(query.data)}</>;
}
```

- [ ] **Step 5: Run test to verify it passes** — `pnpm test --run src/features/reports/StatementView.test.tsx` (PASS, 1 test).

- [ ] **Step 6: Commit**

```bash
git add src/features/reports/StatementView.tsx src/features/reports/ReportContent.tsx src/features/reports/StatementView.test.tsx
git commit -m "feat(reports): StatementView renderer + ReportContent wrapper"
```

---

### Task 6: Balance Sheet page

**Files:**
- Create: `src/features/reports/BalanceSheetPage.tsx`
- Test: `src/features/reports/BalanceSheetPage.test.tsx`

- [ ] **Step 1: Write the failing test** — create `src/features/reports/BalanceSheetPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { BalanceSheetPage } from './BalanceSheetPage';

afterEach(() => useSession.getState().clear());

const fixture = (asOf: string) => ({
  asOf,
  assets: { groups: [{ subtype: 'CURRENT_ASSET', lines: [{ code: '1-1000', name: 'Kas', amount: '500000.0000' }], subtotal: '500000.0000' }], total: '500000.0000' },
  liabilities: { groups: [], total: '0.0000' },
  equity: { groups: [{ subtype: 'CURRENT_EARNINGS', lines: [{ code: '', name: 'Laba Berjalan', amount: '500000.0000' }], subtotal: '500000.0000' }], total: '500000.0000' },
  totalAssets: '500000.0000', totalLiabilities: '0.0000', totalEquity: '500000.0000', currentYearEarnings: '500000.0000', balanced: true,
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><BalanceSheetPage /></QueryClientProvider>);
}

it('renders the balance sheet with a line, Total Aset, and the balanced badge; asOf drives the fetch', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let seenAsOf: string | null = null;
  server.use(http.get(`${API}/reports/balance-sheet`, ({ request }) => {
    seenAsOf = new URL(request.url).searchParams.get('asOf');
    return HttpResponse.json(fixture(seenAsOf ?? ''));
  }));
  renderPage();
  expect(await screen.findByText('1-1000 Kas')).toBeInTheDocument();
  expect(screen.getByText('Total Aset')).toBeInTheDocument();
  expect(screen.getByText(/seimbang/i)).toBeInTheDocument();
  await waitFor(() => expect(seenAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)); // default asOf = today
  fireEvent.change(screen.getByLabelText(/per tanggal/i), { target: { value: '2026-05-31' } });
  await waitFor(() => expect(seenAsOf).toBe('2026-05-31'));
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/reports/BalanceSheetPage.test.tsx` (FAIL: cannot resolve `./BalanceSheetPage`).

- [ ] **Step 3: Write the implementation** — create `src/features/reports/BalanceSheetPage.tsx`:

```tsx
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/PageHeader';
import { Money } from '@/lib/money/money';
import { toApiDate } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import { useT } from '@/lib/i18n/useT';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { StatementView, type StatementRow } from './StatementView';
import { subtypeLabel } from './subtypeLabel';
import { useReport } from './useReport';
import { balanceSheetReportSchema, type BalanceSheetReport } from './schema';

function buildRows(bs: BalanceSheetReport, t: Messages): StatementRow[] {
  const rows: StatementRow[] = [];
  const section = (header: string, sec: BalanceSheetReport['assets'], totalLabel: string, total: string) => {
    rows.push({ label: header, bold: true });
    for (const g of sec.groups) {
      rows.push({ label: subtypeLabel(t, g.subtype), level: 1 });
      for (const l of g.lines) rows.push({ label: `${l.code} ${l.name}`.trim(), amount: l.amount, level: 2 });
      rows.push({ label: t.reports.subtotal, amount: g.subtotal, level: 1, bold: true });
    }
    rows.push({ label: totalLabel, amount: total, bold: true, border: true });
  };
  section(t.reports.assets, bs.assets, t.reports.totalAssets, bs.totalAssets);
  section(t.reports.liabilities, bs.liabilities, t.reports.totalLiabilities, bs.totalLiabilities);
  section(t.reports.equity, bs.equity, t.reports.totalEquity, bs.totalEquity);
  rows.push({ label: t.reports.totalLiabEquity, amount: Money.from(bs.totalLiabilities).plus(Money.from(bs.totalEquity)).toApi(), bold: true, border: true });
  return rows;
}

export function BalanceSheetPage() {
  const t = useT();
  const [asOf, setAsOf] = useState(() => toApiDate(new Date()));
  const query = useReport('/reports/balance-sheet', { asOf }, balanceSheetReportSchema);
  return (
    <div>
      <PageHeader title={t.reports.balanceSheet} />
      <ReportDateControls mode="asOf" asOf={asOf} onAsOf={setAsOf} />
      <ReportContent query={query}>
        {(bs) => (
          <div className="space-y-3">
            <StatementView rows={buildRows(bs, t)} />
            <Badge variant={bs.balanced ? 'default' : 'destructive'}>{bs.balanced ? t.reports.balanced : t.reports.unbalanced}</Badge>
          </div>
        )}
      </ReportContent>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/reports/BalanceSheetPage.test.tsx` (PASS, 1 test).

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/BalanceSheetPage.tsx src/features/reports/BalanceSheetPage.test.tsx
git commit -m "feat(reports): Balance Sheet (Neraca) page"
```

---

### Task 7: Income Statement + Cash Flow pages

**Files:**
- Create: `src/features/reports/IncomeStatementPage.tsx`, `src/features/reports/CashFlowPage.tsx`
- Test: `src/features/reports/IncomeStatementPage.test.tsx`, `src/features/reports/CashFlowPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/reports/IncomeStatementPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { IncomeStatementPage } from './IncomeStatementPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><IncomeStatementPage /></QueryClientProvider>);
}

it('renders the income statement down to Laba Bersih; range drives from', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let seenFrom: string | null = null;
  server.use(http.get(`${API}/reports/income-statement`, ({ request }) => {
    seenFrom = new URL(request.url).searchParams.get('from');
    return HttpResponse.json({ from: seenFrom, to: '2026-06-30', revenue: '2000000.0000', revenueLines: [{ code: '4-1000', name: 'Pendapatan', amount: '2000000.0000' }], cogs: '0.0000', cogsLines: [], grossProfit: '2000000.0000', operatingExpense: '0.0000', operatingExpenseLines: [], operatingProfit: '2000000.0000', otherIncome: '0.0000', otherExpense: '0.0000', profitBeforeTax: '2000000.0000', taxExpense: '250000.0000', netIncome: '1750000.0000' });
  }));
  renderPage();
  expect(await screen.findByText('Laba Bersih')).toBeInTheDocument();
  expect(screen.getByText(/Rp\s?1\.750\.000/)).toBeInTheDocument(); // netIncome (unique)
  await waitFor(() => expect(seenFrom).toMatch(/^\d{4}-01-01$/)); // default from = year start
});
```

Create `src/features/reports/CashFlowPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { CashFlowPage } from './CashFlowPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><CashFlowPage /></QueryClientProvider>);
}

it('renders the cash flow statement with Kas Akhir', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(http.get(`${API}/reports/cash-flow`, () => HttpResponse.json({ from: '2026-01-01', to: '2026-06-30', netIncome: '111000.0000', operating: { adjustments: [], total: '222000.0000' }, investing: { lines: [], total: '0.0000' }, financing: { lines: [], total: '0.0000' }, netChange: '333000.0000', kasAwal: '444000.0000', kasAkhir: '777000.0000', reconciles: true })));
  renderPage();
  expect(await screen.findByText('Kas Akhir')).toBeInTheDocument();
  expect(screen.getByText(/Rp\s?777\.000/)).toBeInTheDocument(); // kasAkhir (unique)
});
```

- [ ] **Step 2: Run tests to verify they fail** — `pnpm test --run src/features/reports/IncomeStatementPage.test.tsx src/features/reports/CashFlowPage.test.tsx` (FAIL: cannot resolve the modules).

- [ ] **Step 3: Write `src/features/reports/IncomeStatementPage.tsx`**

```tsx
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { toApiDate, isRangeValid } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import { useT } from '@/lib/i18n/useT';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { StatementView, type StatementRow } from './StatementView';
import { useReport } from './useReport';
import { incomeStatementReportSchema, type IncomeStatementReport, type ReportLine } from './schema';

function yearStart(): string { const d = new Date(); return toApiDate(new Date(d.getFullYear(), 0, 1)); }

function buildRows(is: IncomeStatementReport, t: Messages): StatementRow[] {
  const rows: StatementRow[] = [];
  const lines = (header: string, ls: ReportLine[], totalLabel: string, total: string) => {
    rows.push({ label: header, bold: true });
    for (const l of ls) rows.push({ label: `${l.code} ${l.name}`.trim(), amount: l.amount, level: 1 });
    rows.push({ label: totalLabel, amount: total, level: 1, bold: true });
  };
  lines(t.reports.revenue, is.revenueLines, t.reports.totalRevenue, is.revenue);
  lines(t.reports.cogs, is.cogsLines, t.reports.cogs, is.cogs);
  rows.push({ label: t.reports.grossProfit, amount: is.grossProfit, bold: true, border: true });
  lines(t.reports.operatingExpense, is.operatingExpenseLines, t.reports.operatingExpense, is.operatingExpense);
  rows.push({ label: t.reports.operatingProfit, amount: is.operatingProfit, bold: true, border: true });
  rows.push({ label: t.reports.otherIncome, amount: is.otherIncome });
  rows.push({ label: t.reports.otherExpense, amount: is.otherExpense });
  rows.push({ label: t.reports.profitBeforeTax, amount: is.profitBeforeTax, bold: true });
  rows.push({ label: t.reports.taxExpense, amount: is.taxExpense });
  rows.push({ label: t.reports.netIncome, amount: is.netIncome, bold: true, border: true });
  return rows;
}

export function IncomeStatementPage() {
  const t = useT();
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(() => toApiDate(new Date()));
  const query = useReport('/reports/income-statement', { from, to }, incomeStatementReportSchema, isRangeValid(from, to));
  return (
    <div>
      <PageHeader title={t.reports.incomeStatement} />
      <ReportDateControls mode="range" from={from} to={to} onRange={(f, tt) => { setFrom(f); setTo(tt); }} />
      <ReportContent query={query}>{(is) => <StatementView rows={buildRows(is, t)} />}</ReportContent>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/features/reports/CashFlowPage.tsx`**

```tsx
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { toApiDate, isRangeValid } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import { useT } from '@/lib/i18n/useT';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { StatementView, type StatementRow } from './StatementView';
import { useReport } from './useReport';
import { cashFlowReportSchema, type CashFlowReport, type CashFlowItem } from './schema';

function yearStart(): string { const d = new Date(); return toApiDate(new Date(d.getFullYear(), 0, 1)); }

function buildRows(cf: CashFlowReport, t: Messages): StatementRow[] {
  const rows: StatementRow[] = [];
  rows.push({ label: t.reports.netIncome, amount: cf.netIncome });
  const section = (header: string, items: CashFlowItem[], totalLabel: string, total: string) => {
    rows.push({ label: header, bold: true });
    for (const it of items) rows.push({ label: it.name ?? '—', amount: it.amount ?? '0', level: 1 });
    rows.push({ label: totalLabel, amount: total, level: 1, bold: true });
  };
  section(t.reports.operating, cf.operating.adjustments, t.reports.cashFromOperating, cf.operating.total);
  section(t.reports.investing, cf.investing.lines, t.reports.cashFromInvesting, cf.investing.total);
  section(t.reports.financing, cf.financing.lines, t.reports.cashFromFinancing, cf.financing.total);
  rows.push({ label: t.reports.netChange, amount: cf.netChange, bold: true, border: true });
  rows.push({ label: t.reports.kasAwal, amount: cf.kasAwal });
  rows.push({ label: t.reports.kasAkhir, amount: cf.kasAkhir, bold: true, border: true });
  return rows;
}

export function CashFlowPage() {
  const t = useT();
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(() => toApiDate(new Date()));
  const query = useReport('/reports/cash-flow', { from, to }, cashFlowReportSchema, isRangeValid(from, to));
  return (
    <div>
      <PageHeader title={t.reports.cashFlow} />
      <ReportDateControls mode="range" from={from} to={to} onRange={(f, tt) => { setFrom(f); setTo(tt); }} />
      <ReportContent query={query}>{(cf) => <StatementView rows={buildRows(cf, t)} />}</ReportContent>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass** — `pnpm test --run src/features/reports/IncomeStatementPage.test.tsx src/features/reports/CashFlowPage.test.tsx` (PASS, 2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/reports/IncomeStatementPage.tsx src/features/reports/CashFlowPage.tsx src/features/reports/IncomeStatementPage.test.tsx src/features/reports/CashFlowPage.test.tsx
git commit -m "feat(reports): Income Statement + Cash Flow pages"
```

---

### Task 8: Landing + routes + nav + verification

**Files:**
- Create: `src/features/reports/ReportsIndexPage.tsx`
- Create: `src/app/routes/_app/reports.tsx`, `.index.tsx`, `.balance-sheet.tsx`, `.income-statement.tsx`, `.cash-flow.tsx`
- Modify: `src/components/common/AppShell.tsx`

- [ ] **Step 1: Create `src/features/reports/ReportsIndexPage.tsx`**

```tsx
import { Link } from '@tanstack/react-router';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { useT } from '@/lib/i18n/useT';

export function ReportsIndexPage() {
  const t = useT();
  const reports = [
    { to: '/reports/balance-sheet', title: t.reports.balanceSheet, desc: t.reports.balanceSheetDesc },
    { to: '/reports/income-statement', title: t.reports.incomeStatement, desc: t.reports.incomeStatementDesc },
    { to: '/reports/cash-flow', title: t.reports.cashFlow, desc: t.reports.cashFlowDesc },
  ] as const;
  return (
    <div>
      <PageHeader title={t.reports.title} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Link key={r.to} to={r.to} className="block">
            <Card className="transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle>{r.title}</CardTitle>
                <CardDescription>{r.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the five route files**

`src/app/routes/_app/reports.tsx`:
```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/reports')({
  component: () => <Outlet />,
});
```

`src/app/routes/_app/reports.index.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { ReportsIndexPage } from '@/features/reports/ReportsIndexPage';

export const Route = createFileRoute('/_app/reports/')({
  component: ReportsIndexPage,
});
```

`src/app/routes/_app/reports.balance-sheet.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { BalanceSheetPage } from '@/features/reports/BalanceSheetPage';

export const Route = createFileRoute('/_app/reports/balance-sheet')({
  component: BalanceSheetPage,
});
```

`src/app/routes/_app/reports.income-statement.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { IncomeStatementPage } from '@/features/reports/IncomeStatementPage';

export const Route = createFileRoute('/_app/reports/income-statement')({
  component: IncomeStatementPage,
});
```

`src/app/routes/_app/reports.cash-flow.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { CashFlowPage } from '@/features/reports/CashFlowPage';

export const Route = createFileRoute('/_app/reports/cash-flow')({
  component: CashFlowPage,
});
```

- [ ] **Step 3: Regenerate the route tree**

The new route files must be added to `src/routeTree.gen.ts` (written by the `@tanstack/router-plugin` Vite plugin) before `tsc` accepts the typed `Link`s in `ReportsIndexPage`. Start the dev server in the background to regenerate, poll until present, then stop:

Run (background): `pnpm dev`
Then poll until: `grep -q "reports/balance-sheet" src/routeTree.gen.ts && echo REGENERATED`
Expected: prints `REGENERATED` (a few seconds). Then stop the dev server. (Running `pnpm test --run` also triggers regeneration.)

Verify: `grep -c "reports" src/routeTree.gen.ts` prints ≥ 5.

- [ ] **Step 4: Add the nav item in `AppShell.tsx`**

In `src/components/common/AppShell.tsx`: add `FileChartColumn` to the `lucide-react` import, and add the nav entry after the Journals line:

```tsx
    { to: '/journals', label: t.nav.journals, icon: NotebookText },
    { to: '/reports', label: t.nav.reports, icon: FileChartColumn },
    { to: '/partners', label: t.nav.partners, icon: Users },
```

(If `FileChartColumn` is not exported by the installed `lucide-react`, use `FileBarChart` instead.)

- [ ] **Step 5: Full verification**

Run: `pnpm test --run` — expect all green (~185: 172 prior + schema 3 + useReport 2 + subtypeLabel 2 + ReportDateControls 2 + StatementView 1 + BalanceSheet 1 + IncomeStatement 1 + CashFlow 1 = 185).
Run: `pnpm lint` — expect 0 errors (pre-existing react-compiler warnings acceptable).
Run: `pnpm build` — expect success (tsc now accepts the typed `/reports/*` Links; Vite emits report chunks).

If `pnpm build` fails at `tsc` over unknown `/reports/*` routes, the tree wasn't regenerated — repeat Step 3 and rebuild.

- [ ] **Step 6: Dev smoke (optional)**

`pnpm dev`, log in (creds in `.env`), open `/reports`; click each report card; change the date controls and confirm the statement re-fetches. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/features/reports/ReportsIndexPage.tsx src/app/routes/_app/reports.tsx src/app/routes/_app/reports.index.tsx src/app/routes/_app/reports.balance-sheet.tsx src/app/routes/_app/reports.income-statement.tsx src/app/routes/_app/reports.cash-flow.tsx src/components/common/AppShell.tsx src/routeTree.gen.ts
git commit -m "feat(reports): /reports landing, routes, and nav entry"
```

---

## Done Criteria

- `/reports` lists the three statements as cards; one "Laporan" nav item.
- Each statement page has its date control (asOf for Neraca; from/to for Laba Rugi + Arus Kas, with invalid-range disabling the fetch), fetches via the generic `useReport`, and renders a grouped statement through `StatementView` (sections, subtype groups, lines, subtotals, totals) with money via `MoneyText`.
- The balance sheet shows a Seimbang/Tidak seimbang badge; the income statement runs down to Laba Bersih; the cash flow shows section totals + Kas Akhir.
- The report data layer is isolated (distinct `['report', …]` keys; no dashboard files changed).
- All tests pass (~185); lint clean; build green.

## Out of Scope (YAGNI)

Trial Balance + General Ledger (Plan 7b), AR/AP Aging (Plan 7c), unifying the dashboard's minimal report schemas, CSV/PDF export, print stylesheet, date presets, statement-line drill-down, comparative columns.

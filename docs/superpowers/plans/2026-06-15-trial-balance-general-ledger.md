# Trial Balance + General Ledger (Plan 7b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two read-only ledger reports — Trial Balance (Neraca Saldo) and General Ledger (Buku Besar) — to the `/reports` area, with Trial Balance rows drilling into an account's General Ledger.

**Architecture:** Reuse the 7a reports infrastructure entirely (`useReport`, `ReportDateControls`, `ReportContent`, the routes group, the i18n `reports` group). Add two schemas, one new flat-table renderer (`ReportTable`), two page components, and two routes. Pages are pure and testable standalone; the thin route files hold all router wiring (search params + drill-down navigation).

**Tech Stack:** React 19, TanStack Router (file-based) + Query v5, Zod v4, shadcn/ui, decimal.js `Money`, Vitest 4 + RTL + MSW v2.

**Reference spec:** `docs/superpowers/specs/2026-06-15-trial-balance-general-ledger-design.md`

---

## Ordering note

The drill-down navigation (`navigate({ to: '/reports/general-ledger', search: { accountId } })`) and `Route.useSearch()` only type-check once both routes exist in `src/routeTree.gen.ts`. So the route files + the full `tsc` build are deferred to the last task (Task 6). The page components (Tasks 4–5) render directly in tests (no router) and are verified with `pnpm test --run`.

## Reconciliation note

The TB/GL shapes below were reconciled during the 7a cycle. **Before Task 2**, re-verify both live: write a throwaway `/tmp/reconcile-7b.mjs` that reads `.env` (`VITE_API_BASE_URL`, `RECONCILE_EMAIL`, `RECONCILE_PASSWORD`), logs in, and GETs `/ledger/trial-balance?asOf=<today>` and `/reports/general-ledger?accountId=<a postable account id>&from=2026-01-01&to=<today>`. Both are read-only (no `segregationOfDutiesEnabled` toggling). Keep the script in `/tmp` (never commit). If a field name/shape differs from this plan, adjust the Task 2 schema (and any dependent cell) before pinning, and note the drift.

## File Structure

```
src/features/reports/
  schema.ts                          # Task 2 — extend: trialBalance + generalLedger schemas
  schema.test.ts                     # Task 2 — extend: 2 new parses
  ReportTable.tsx / .test.tsx        # Task 3 — flat multi-column table + MoneyCell
  TrialBalancePage.tsx / .test.tsx   # Task 4
  GeneralLedgerPage.tsx / .test.tsx  # Task 5
  ReportsIndexPage.tsx               # Task 6 — append 2 cards
src/app/routes/_app/reports.trial-balance.tsx, reports.general-ledger.tsx  # Task 6
src/lib/i18n/messages.id.ts          # Task 1 — extend reports group
```

**Reuse (unchanged):** `useReport(path, params, schema, enabled?)`, `ReportDateControls` (asOf|range), `ReportContent`, `MoneyText`/`Money` (`from`/`eq`/`zero`), `AccountSelect` (postable+active, `aria-label`), `formatDateID`/`toApiDate`/`isRangeValid`, shadcn `Table`/`TableHeader`/`TableBody`/`TableFooter`/`TableHead`/`TableRow`/`TableCell`, `Badge`, `PageHeader`, `Card`. No `handlers.ts` change — page tests override `/ledger/trial-balance` and `/reports/general-ledger` inline; `AccountSelect` uses the existing `/ledger/accounts` handler.

---

### Task 1: i18n — extend the `reports` group

**Files:** Modify `src/lib/i18n/messages.id.ts`

- [ ] **Step 1: Add the new keys**

In `src/lib/i18n/messages.id.ts`, inside the existing `reports` group (e.g. immediately after `kasAkhir: 'Kas Akhir',` and before the `subtype: {` nested object), add:

```ts
    trialBalance: 'Neraca Saldo',
    trialBalanceDesc: 'Saldo debit/kredit setiap akun per tanggal',
    generalLedger: 'Buku Besar',
    generalLedgerDesc: 'Rincian transaksi satu akun untuk satu periode',
    account: 'Akun',
    selectAccount: 'Pilih akun untuk melihat buku besar',
    total: 'Total',
    kode: 'Kode',
    nama: 'Nama',
    debit: 'Debit',
    kredit: 'Kredit',
    saldo: 'Saldo',
    tanggal: 'Tanggal',
    ref: 'Ref',
    deskripsi: 'Deskripsi',
    openingBalance: 'Saldo Awal',
    closingBalance: 'Saldo Akhir',
    totalDebit: 'Total Debit',
    totalKredit: 'Total Kredit',
```

Keep `export type Messages = typeof id;` intact. (`balanced`/`unbalanced` and the date-control labels already exist from 7a.)

- [ ] **Step 2: Verify** — Run: `pnpm build` (expected: succeeds).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat(reports): i18n for trial balance + general ledger"
```

---

### Task 2: Schemas (extend `schema.ts`)

**Files:**
- Modify: `src/features/reports/schema.ts`
- Test: `src/features/reports/schema.test.ts` (extend)

- [ ] **Step 1: Write the failing tests** — append to `src/features/reports/schema.test.ts` (inside the existing `describe`, or a new `describe`):

```ts
import { trialBalanceSchema, generalLedgerSchema } from './schema';

describe('trial balance + general ledger schemas', () => {
  it('trial balance parses rows + grand totals', () => {
    const r = trialBalanceSchema.parse({
      asOf: '2026-06-30',
      rows: [
        { accountId: 'a1', code: '1-1000', name: 'Kas', debit: '500000.0000', credit: '0.0000', balance: '500000.0000' },
        { accountId: 'a2', code: '3-1000', name: 'Modal', debit: '0.0000', credit: '500000.0000', balance: '-500000.0000' },
      ],
      totalDebit: '500000.0000', totalCredit: '500000.0000',
    });
    expect(r.rows[0].name).toBe('Kas');
    expect(r.totalDebit).toBe('500000.0000');
  });

  it('general ledger parses account + lines + opening/closing', () => {
    const r = generalLedgerSchema.parse({
      account: { id: 'a1', code: '1-1000', name: 'Kas', normalBalance: 'DEBIT' },
      from: '2026-01-01', to: '2026-06-30',
      openingBalance: '0.0000',
      lines: [{ date: '2026-03-01', entryRef: 'JE/2026/000004', description: 'Setoran modal', debit: '1000000.0000', credit: '0.0000', runningBalance: '1000000.0000' }],
      closingBalance: '1000000.0000',
    });
    expect(r.account.code).toBe('1-1000');
    expect(r.lines[0].entryRef).toBe('JE/2026/000004');
    expect(r.closingBalance).toBe('1000000.0000');
  });
});
```

If `schema.test.ts` already imports from `vitest` and `./schema`, merge the new `describe` without duplicating imports (move the two new schema names into the existing `import { … } from './schema'` line).

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/reports/schema.test.ts` (FAIL: `trialBalanceSchema`/`generalLedgerSchema` not exported).

- [ ] **Step 3: Write the implementation** — append to `src/features/reports/schema.ts` (it already imports `z` and `moneyString`):

```ts
export const trialBalanceRowSchema = z.object({
  accountId: z.string(),
  code: z.string(),
  name: z.string(),
  debit: moneyString,
  credit: moneyString,
  balance: moneyString,
});
export type TrialBalanceRow = z.infer<typeof trialBalanceRowSchema>;

export const trialBalanceSchema = z.object({
  asOf: z.string().nullish(),
  rows: z.array(trialBalanceRowSchema),
  totalDebit: moneyString,
  totalCredit: moneyString,
});
export type TrialBalance = z.infer<typeof trialBalanceSchema>;

export const generalLedgerLineSchema = z.object({
  date: z.string(),
  entryRef: z.string(),
  description: z.string().nullish(),
  debit: moneyString,
  credit: moneyString,
  runningBalance: moneyString,
});
export type GeneralLedgerLine = z.infer<typeof generalLedgerLineSchema>;

export const generalLedgerSchema = z.object({
  account: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    normalBalance: z.string(),
  }),
  from: z.string().nullish(),
  to: z.string().nullish(),
  openingBalance: moneyString,
  lines: z.array(generalLedgerLineSchema),
  closingBalance: moneyString,
});
export type GeneralLedger = z.infer<typeof generalLedgerSchema>;
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/reports/schema.test.ts` (PASS, all schema tests including the 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/schema.ts src/features/reports/schema.test.ts
git commit -m "feat(reports): trial balance + general ledger schemas"
```

---

### Task 3: `ReportTable` + `MoneyCell`

**Files:**
- Create: `src/features/reports/ReportTable.tsx`
- Test: `src/features/reports/ReportTable.test.tsx`

- [ ] **Step 1: Write the failing test** — create `src/features/reports/ReportTable.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TableCell, TableRow } from '@/components/ui/table';
import { ReportTable, MoneyCell, type ReportColumn } from './ReportTable';

interface Row { code: string; debit: string; }
const columns: ReportColumn<Row>[] = [
  { header: 'Kode', cell: (r) => r.code },
  { header: 'Debit', align: 'right', cell: (r) => <MoneyCell value={r.debit} /> },
];

it('renders headers, a row per item, and footer; zero money is blank', () => {
  render(
    <ReportTable<Row>
      columns={columns}
      rows={[{ code: '1-1000', debit: '500000.0000' }, { code: '1-2000', debit: '0.0000' }]}
      footer={<TableRow><TableCell colSpan={2}>Total</TableCell></TableRow>}
    />,
  );
  expect(screen.getByText('Kode')).toBeInTheDocument();
  expect(screen.getByText('1-1000')).toBeInTheDocument();
  expect(screen.getByText('Total')).toBeInTheDocument();
  expect(screen.getByText(/Rp\s?500\.000/)).toBeInTheDocument();
  expect(screen.queryByText(/Rp\s?0/)).not.toBeInTheDocument(); // zero debit suppressed
});

it('fires onRowClick with the clicked row', () => {
  const onRowClick = vi.fn();
  render(<ReportTable<Row> columns={columns} rows={[{ code: '1-1000', debit: '500000.0000' }]} onRowClick={onRowClick} />);
  fireEvent.click(screen.getByText('1-1000'));
  expect(onRowClick).toHaveBeenCalledWith({ code: '1-1000', debit: '500000.0000' });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/reports/ReportTable.test.tsx` (FAIL: cannot resolve `./ReportTable`).

- [ ] **Step 3: Write the implementation** — create `src/features/reports/ReportTable.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoneyText } from '@/components/common/MoneyText';
import { Money } from '@/lib/money/money';

export interface ReportColumn<T> {
  header: string;
  align?: 'right';
  cell: (row: T) => ReactNode;
}

interface ReportTableProps<T> {
  columns: ReportColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
}

export function ReportTable<T>({ columns, rows, onRowClick, footer }: ReportTableProps<T>) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c, i) => (
              <TableHead key={i} className={c.align === 'right' ? 'text-right' : undefined}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, ri) => (
            <TableRow
              key={ri}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {columns.map((c, ci) => (
                <TableCell key={ci} className={c.align === 'right' ? 'text-right tabular-nums' : undefined}>{c.cell(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {footer ? <TableFooter>{footer}</TableFooter> : null}
      </Table>
    </div>
  );
}

/** Right-aligned money cell with zero-suppression: blank for a zero amount (the ledger convention). */
export function MoneyCell({ value }: { value: string }) {
  return Money.from(value).eq(Money.zero()) ? null : <MoneyText value={value} />;
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/reports/ReportTable.test.tsx` (PASS, 2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/ReportTable.tsx src/features/reports/ReportTable.test.tsx
git commit -m "feat(reports): ReportTable flat renderer + zero-suppressed MoneyCell"
```

---

### Task 4: `TrialBalancePage`

**Files:**
- Create: `src/features/reports/TrialBalancePage.tsx`
- Test: `src/features/reports/TrialBalancePage.test.tsx`

- [ ] **Step 1: Write the failing test** — create `src/features/reports/TrialBalancePage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { TrialBalancePage } from './TrialBalancePage';

afterEach(() => useSession.getState().clear());

const fixture = (asOf: string) => ({
  asOf,
  rows: [
    { accountId: 'acc-kas', code: '1-1000', name: 'Kas', debit: '500000.0000', credit: '0.0000', balance: '500000.0000' },
    { accountId: 'acc-modal', code: '3-1000', name: 'Modal', debit: '0.0000', credit: '500000.0000', balance: '-500000.0000' },
  ],
  totalDebit: '500000.0000', totalCredit: '500000.0000',
});

function renderPage() {
  const onOpenAccount = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><TrialBalancePage onOpenAccount={onOpenAccount} /></QueryClientProvider>);
  return onOpenAccount;
}

it('renders rows + balanced badge; asOf drives the fetch; a row click opens that account', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let seenAsOf: string | null = null;
  server.use(http.get(`${API}/ledger/trial-balance`, ({ request }) => {
    seenAsOf = new URL(request.url).searchParams.get('asOf');
    return HttpResponse.json(fixture(seenAsOf ?? ''));
  }));
  const onOpenAccount = renderPage();
  expect(await screen.findByText('Kas')).toBeInTheDocument();
  expect(screen.getByText('1-1000')).toBeInTheDocument();
  expect(screen.getByText(/seimbang/i)).toBeInTheDocument();
  await waitFor(() => expect(seenAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)); // default asOf = today
  fireEvent.click(screen.getByText('Kas'));
  expect(onOpenAccount).toHaveBeenCalledWith('acc-kas');
  fireEvent.change(screen.getByLabelText(/per tanggal/i), { target: { value: '2026-05-31' } });
  await waitFor(() => expect(seenAsOf).toBe('2026-05-31'));
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/reports/TrialBalancePage.test.tsx` (FAIL: cannot resolve `./TrialBalancePage`).

- [ ] **Step 3: Write the implementation** — create `src/features/reports/TrialBalancePage.tsx`:

```tsx
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { MoneyText } from '@/components/common/MoneyText';
import { Money } from '@/lib/money/money';
import { toApiDate } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { ReportTable, MoneyCell, type ReportColumn } from './ReportTable';
import { useReport } from './useReport';
import { trialBalanceSchema, type TrialBalanceRow } from './schema';

export function TrialBalancePage({ onOpenAccount }: { onOpenAccount: (accountId: string) => void }) {
  const t = useT();
  const [asOf, setAsOf] = useState(() => toApiDate(new Date()));
  const query = useReport('/ledger/trial-balance', { asOf }, trialBalanceSchema);
  const columns: ReportColumn<TrialBalanceRow>[] = [
    { header: t.reports.kode, cell: (r) => r.code },
    { header: t.reports.nama, cell: (r) => r.name },
    { header: t.reports.debit, align: 'right', cell: (r) => <MoneyCell value={r.debit} /> },
    { header: t.reports.kredit, align: 'right', cell: (r) => <MoneyCell value={r.credit} /> },
  ];
  return (
    <div>
      <PageHeader title={t.reports.trialBalance} />
      <ReportDateControls mode="asOf" asOf={asOf} onAsOf={setAsOf} />
      <ReportContent query={query}>
        {(tb) => {
          const balanced = Money.from(tb.totalDebit).eq(Money.from(tb.totalCredit));
          return (
            <div className="space-y-3">
              <ReportTable<TrialBalanceRow>
                columns={columns}
                rows={tb.rows}
                onRowClick={(r) => onOpenAccount(r.accountId)}
                footer={
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">{t.reports.total}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums"><MoneyText value={tb.totalDebit} /></TableCell>
                    <TableCell className="text-right font-semibold tabular-nums"><MoneyText value={tb.totalCredit} /></TableCell>
                  </TableRow>
                }
              />
              <Badge variant={balanced ? 'default' : 'destructive'}>{balanced ? t.reports.balanced : t.reports.unbalanced}</Badge>
            </div>
          );
        }}
      </ReportContent>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/reports/TrialBalancePage.test.tsx` (PASS, 1 test).

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/TrialBalancePage.tsx src/features/reports/TrialBalancePage.test.tsx
git commit -m "feat(reports): Trial Balance (Neraca Saldo) page"
```

---

### Task 5: `GeneralLedgerPage`

**Files:**
- Create: `src/features/reports/GeneralLedgerPage.tsx`
- Test: `src/features/reports/GeneralLedgerPage.test.tsx`

- [ ] **Step 1: Write the failing test** — create `src/features/reports/GeneralLedgerPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { GeneralLedgerPage } from './GeneralLedgerPage';

afterEach(() => useSession.getState().clear());

function renderPage(initialAccountId?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><GeneralLedgerPage initialAccountId={initialAccountId} /></QueryClientProvider>);
}

it('shows the select-account hint and does not fetch when no account is chosen', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let called = false;
  server.use(http.get(`${API}/reports/general-ledger`, () => { called = true; return HttpResponse.json({}); }));
  renderPage(undefined);
  expect(screen.getByText(/pilih akun/i)).toBeInTheDocument();
  await new Promise((r) => setTimeout(r, 150));
  expect(called).toBe(false);
});

it('with a preselected account: sends accountId + from and renders opening, a line, and closing', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let seenAccountId: string | null = null;
  let seenFrom: string | null = null;
  server.use(http.get(`${API}/reports/general-ledger`, ({ request }) => {
    const p = new URL(request.url).searchParams;
    seenAccountId = p.get('accountId');
    seenFrom = p.get('from');
    return HttpResponse.json({
      account: { id: 'acc-kas', code: '1-1000', name: 'Kas', normalBalance: 'DEBIT' },
      from: seenFrom, to: p.get('to'),
      openingBalance: '0.0000',
      lines: [{ date: '2026-03-01', entryRef: 'JE/2026/000004', description: 'Setoran modal', debit: '1000000.0000', credit: '0.0000', runningBalance: '1000000.0000' }],
      closingBalance: '1000000.0000',
    });
  }));
  renderPage('acc-kas');
  expect(await screen.findByText('JE/2026/000004')).toBeInTheDocument();
  expect(screen.getByText('Setoran modal')).toBeInTheDocument();
  expect(screen.getByText(/Saldo Akhir/i)).toBeInTheDocument();
  await waitFor(() => expect(seenAccountId).toBe('acc-kas'));
  expect(seenFrom).toMatch(/^\d{4}-01-01$/); // default from = year start
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/reports/GeneralLedgerPage.test.tsx` (FAIL: cannot resolve `./GeneralLedgerPage`).

- [ ] **Step 3: Write the implementation** — create `src/features/reports/GeneralLedgerPage.tsx`:

```tsx
import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { MoneyText } from '@/components/common/MoneyText';
import { AccountSelect } from '@/components/common/AccountSelect';
import { formatDateID, toApiDate, isRangeValid } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { ReportTable, MoneyCell, type ReportColumn } from './ReportTable';
import { useReport } from './useReport';
import { generalLedgerSchema, type GeneralLedgerLine } from './schema';

function yearStart(): string { const d = new Date(); return toApiDate(new Date(d.getFullYear(), 0, 1)); }

export function GeneralLedgerPage({ initialAccountId }: { initialAccountId?: string }) {
  const t = useT();
  const [accountId, setAccountId] = useState(initialAccountId ?? '');
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(() => toApiDate(new Date()));
  const enabled = !!accountId && isRangeValid(from, to);
  const query = useReport('/reports/general-ledger', { accountId: accountId || undefined, from, to }, generalLedgerSchema, enabled);
  const columns: ReportColumn<GeneralLedgerLine>[] = [
    { header: t.reports.tanggal, cell: (l) => formatDateID(l.date.slice(0, 10)) },
    { header: t.reports.ref, cell: (l) => l.entryRef },
    { header: t.reports.deskripsi, cell: (l) => l.description ?? '' },
    { header: t.reports.debit, align: 'right', cell: (l) => <MoneyCell value={l.debit} /> },
    { header: t.reports.kredit, align: 'right', cell: (l) => <MoneyCell value={l.credit} /> },
    { header: t.reports.saldo, align: 'right', cell: (l) => <MoneyText value={l.runningBalance} /> },
  ];
  return (
    <div>
      <PageHeader title={t.reports.generalLedger} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t.reports.account}</span>
          <AccountSelect value={accountId} onChange={setAccountId} aria-label={t.reports.account} />
        </div>
        <ReportDateControls mode="range" from={from} to={to} onRange={(f, tt) => { setFrom(f); setTo(tt); }} />
      </div>
      {!accountId ? (
        <p className="text-sm text-muted-foreground">{t.reports.selectAccount}</p>
      ) : (
        <ReportContent query={query}>
          {(gl) => (
            <div className="space-y-2">
              <div className="text-sm font-medium">{gl.account.code} · {gl.account.name} · {gl.account.normalBalance}</div>
              <div className="text-sm text-muted-foreground">{t.reports.openingBalance}: <MoneyText value={gl.openingBalance} /></div>
              <ReportTable<GeneralLedgerLine>
                columns={columns}
                rows={gl.lines}
                footer={
                  <TableRow>
                    <TableCell colSpan={5} className="font-semibold">{t.reports.closingBalance}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums"><MoneyText value={gl.closingBalance} /></TableCell>
                  </TableRow>
                }
              />
            </div>
          )}
        </ReportContent>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/reports/GeneralLedgerPage.test.tsx` (PASS, 2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/GeneralLedgerPage.tsx src/features/reports/GeneralLedgerPage.test.tsx
git commit -m "feat(reports): General Ledger (Buku Besar) page"
```

---

### Task 6: Landing cards + routes + verification

**Files:**
- Modify: `src/features/reports/ReportsIndexPage.tsx`
- Create: `src/app/routes/_app/reports.trial-balance.tsx`, `src/app/routes/_app/reports.general-ledger.tsx`

- [ ] **Step 1: Append two cards in `ReportsIndexPage.tsx`**

In `src/features/reports/ReportsIndexPage.tsx`, add two entries to the existing `reports` array (after the `cash-flow` entry):

```tsx
    { to: '/reports/trial-balance', title: t.reports.trialBalance, desc: t.reports.trialBalanceDesc },
    { to: '/reports/general-ledger', title: t.reports.generalLedger, desc: t.reports.generalLedgerDesc },
```

(The array is `as const`; keep that. The `Link to={r.to}` is typed against the route tree, so this compiles only after Step 3's regeneration — that's expected.)

- [ ] **Step 2: Create the two route files**

`src/app/routes/_app/reports.trial-balance.tsx`:
```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { TrialBalancePage } from '@/features/reports/TrialBalancePage';

export const Route = createFileRoute('/_app/reports/trial-balance')({
  component: function TrialBalanceRoute() {
    const navigate = useNavigate();
    return (
      <TrialBalancePage
        onOpenAccount={(accountId) => navigate({ to: '/reports/general-ledger', search: { accountId } })}
      />
    );
  },
});
```

`src/app/routes/_app/reports.general-ledger.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { GeneralLedgerPage } from '@/features/reports/GeneralLedgerPage';

export const Route = createFileRoute('/_app/reports/general-ledger')({
  validateSearch: (search: Record<string, unknown>): { accountId?: string } => ({
    accountId: typeof search.accountId === 'string' ? search.accountId : undefined,
  }),
  component: function GeneralLedgerRoute() {
    const { accountId } = Route.useSearch();
    return <GeneralLedgerPage initialAccountId={accountId} />;
  },
});
```

(`validateSearch` mirrors `src/app/routes/_app/payments.new.tsx`. The 7a leaf routes confirm `createFileRoute('/_app/reports/<leaf>')` is the right id format.)

- [ ] **Step 3: Regenerate the route tree**

The new routes must be written into `src/routeTree.gen.ts` (by the `@tanstack/router-plugin` Vite plugin) before `tsc` accepts the typed `navigate({ to: '/reports/general-ledger', … })`, `Route.useSearch()`, and the two new `Link`s. Start the dev server in the background to regenerate, poll, then stop:

Start (background): `pnpm dev`
Poll until: `grep -q "reports/general-ledger" src/routeTree.gen.ts && echo REGENERATED`
Then stop the dev server. Verify: `grep -c "reports/trial-balance\|reports/general-ledger" src/routeTree.gen.ts` prints ≥ 2. (`pnpm test`/`pnpm build` also run the plugin and regenerate the tree, if the dev approach is awkward — but the build's `tsc` will fail until the tree is regenerated, so regenerate first.)

- [ ] **Step 4: Full verification**

Run: `pnpm test --run` — expect all green (~192: 185 prior + 7 new = schema 2, ReportTable 2, TrialBalance 1, GeneralLedger 2).
Run: `pnpm lint` — expect 0 errors (pre-existing react-compiler/react-hook-form warnings acceptable; introduce no new errors).
Run: `pnpm build` — expect success (`tsc -b && vite build`; tsc now accepts the typed `/reports/*` routes + the `search: { accountId }` navigation).

If `pnpm build` fails at `tsc` over the unknown `/reports/trial-balance` or `/reports/general-ledger` route, or over `search.accountId`, the tree wasn't regenerated — repeat Step 3 and rebuild.

- [ ] **Step 5: Dev smoke (optional)**

`pnpm dev`, log in (creds in `.env`), open `/reports` → the two new cards appear; open Neraca Saldo, change `asOf`, click a row → lands on Buku Besar with that account preselected and its ledger loaded; on Buku Besar, change the account/range and confirm it refetches. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/features/reports/ReportsIndexPage.tsx src/app/routes/_app/reports.trial-balance.tsx src/app/routes/_app/reports.general-ledger.tsx src/routeTree.gen.ts
git commit -m "feat(reports): trial balance + general ledger routes and landing cards"
```

---

## Done Criteria

- `/reports` lists five report cards (the 7a three + Neraca Saldo + Buku Besar).
- **Trial Balance:** asOf control, a flat Kode/Nama/Debit/Kredit table (zero-suppressed), a Total footer, and a Seimbang/Tidak seimbang badge. Each row clicks through to that account's General Ledger.
- **General Ledger:** AccountSelect + range controls; a "Pilih akun" hint with no fetch until an account is chosen; on selection (direct or via drill-down `?accountId=`) it shows the account header, opening balance, the line table (Tanggal/Ref/Deskripsi/Debit/Kredit/Saldo), and a closing-balance footer.
- Pages are tested standalone; route wiring lives in the thin route files. All tests pass (~192); lint clean; build green.

## Out of Scope (YAGNI)

GL line → journal-entry drill-through (payload carries no entry id), CSV/PDF export, print stylesheet, Trial Balance grouping/subtotals by account type, GL line pagination, comparative/prior-period columns, date presets. **Plan 7c — AR/AP Aging** is the next slice.

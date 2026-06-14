# Report Screens — Financial Statements (Plan 7a) — Design Spec

**Status:** Approved
**Date:** 2026-06-14
**Plan:** 7a — Report infrastructure + the three financial statements (Neraca, Laba Rugi, Arus Kas). First of three report slices (7b = Trial Balance + General Ledger; 7c = AR/AP Aging).

## Goal

Build the shared report infrastructure (a `/reports` landing, a generic report-runner hook, date controls, a grouped-statement renderer, loading/error states, one nav item) plus the three financial statements — the balance sheet (Neraca, `asOf`), income statement (Laba Rugi, `from/to`), and cash-flow statement (Arus Kas, `from/to`).

## Context

The reports endpoints are all read (`any` auth). The three statement shapes were reconciled in Plan 4b for the dashboard cards, but only their **top-level totals** were schema-pinned there. The full nested shapes are now reconciled (2026-06-14, `/tmp/reconcile-reports.mjs`). This slice establishes the report-runner pattern; 7b/7c reuse it.

### Live-reconciled shapes (money = 4-decimal strings)

**Balance sheet** `GET /reports/balance-sheet?asOf=`:
```
{ asOf, assets:  { groups: [{ subtype, lines: [{ code, name, amount }], subtotal }], total },
        liabilities: { groups: […], total },
        equity:      { groups: […], total },
  totalAssets, totalLiabilities, totalEquity, currentYearEarnings, balanced }
```
(equity has a `CURRENT_EARNINGS` group with a `{ code:'', name:'Laba (Rugi) Berjalan', amount }` line.)

**Income statement** `GET /reports/income-statement?from=&to=`:
```
{ from, to, revenue, revenueLines: [{code,name,amount}], cogs, cogsLines, grossProfit,
  operatingExpense, operatingExpenseLines, operatingProfit, otherIncome, otherExpense,
  profitBeforeTax, taxExpense, netIncome }
```

**Cash flow** `GET /reports/cash-flow?from=&to=`:
```
{ from, to, netIncome, operating: { adjustments: [], total }, investing: { lines: [], total },
  financing: { lines: [], total }, netChange, kasAwal, kasAkhir, reconciles }
```
(operating.adjustments / investing.lines / financing.lines were **empty** in reconciliation — their item shape is unknown, so those arrays stay tolerant; the section totals + netChange/kasAwal/kasAkhir are pinned.)

## Architecture

**Decomposition (approved):** this plan = 7a (infra + the 3 statements). 7b (Trial Balance + General Ledger) and 7c (AR/AP Aging) are separate spec→plan cycles that reuse this infra.

**Data layer (isolated — no dashboard changes):** the dashboard already owns `queryKeys.reports.balanceSheet(asOf)` etc. with **minimal** schemas (only the card totals). The report screens need the **full nested** shapes; reusing those keys with a different schema would collide in the React Query cache. So the report runner uses a **distinct** key namespace `['report', path, params]` (note `'report'`, not the dashboard's `'reports'`). No dashboard files are touched. The minor "duplication" (a 4-field card schema vs a full statement schema) is two genuinely different concerns. Unifying later is a possible follow-up, out of scope.

**Renderer (approved):** a generic `useReport` runner + a shared `StatementView` row renderer (over per-report bespoke hooks/renders). The 3 statements share the runner and a row-based layout, so each report is just a page that fetches and maps its data into rows — and 7b/7c reports drop in cheaply.

### New module `src/features/reports/`

```
schema.ts            // reportLineSchema + balanceSheet/incomeStatement/cashFlow report schemas
useReport.ts         // generic useReport(path, params, schema) over apiFetch
ReportDateControls.tsx  // asOf single-date OR from/to range (mode prop) + defaults
StatementView.tsx    // grouped-statement renderer over a rows[] array (+ StatementRow)
ReportContent.tsx    // loading(Skeleton)/error(ErrorState)/render wrapper around a query
subtypeLabel.ts      // balance-sheet account-subtype → Indonesian label helper
BalanceSheetPage.tsx
IncomeStatementPage.tsx
CashFlowPage.tsx
ReportsIndexPage.tsx // /reports landing — cards linking to each report
```

Modify: `src/lib/i18n/messages.id.ts` (+`reports` group, +`nav.reports`), `src/components/common/AppShell.tsx` (+nav item), `src/test/handlers.ts` (3 report handlers + fixtures). Routes: `reports.tsx` (layout `<Outlet/>`), `.index.tsx`, `.balance-sheet.tsx`, `.income-statement.tsx`, `.cash-flow.tsx`.

**Reuse:** `apiFetch(path, {query, schema})`, `MoneyText`/`Money`, `formatDateID`/`toApiDate`/`isRangeValid`, `Skeleton`, `ErrorState`, `PageHeader`, `Card`, `Input`/`Label`/`Button`, shadcn `Table`. No `RoleGate` (reports are any-auth).

### Schemas (`schema.ts`) — full, tolerant; money via `moneyString`

```ts
const reportLineSchema = z.object({ code: z.string(), name: z.string(), amount: moneyString });
const groupSchema = z.object({ subtype: z.string(), lines: z.array(reportLineSchema), subtotal: moneyString });
const sectionSchema = z.object({ groups: z.array(groupSchema), total: moneyString });

balanceSheetReportSchema = z.object({
  asOf: z.string().nullish(),
  assets: sectionSchema, liabilities: sectionSchema, equity: sectionSchema,
  totalAssets: moneyString, totalLiabilities: moneyString, totalEquity: moneyString,
  currentYearEarnings: moneyString.nullish(), balanced: z.boolean().nullish(),
});

incomeStatementReportSchema = z.object({
  from: z.string().nullish(), to: z.string().nullish(),
  revenue: moneyString, revenueLines: z.array(reportLineSchema),
  cogs: moneyString, cogsLines: z.array(reportLineSchema), grossProfit: moneyString,
  operatingExpense: moneyString, operatingExpenseLines: z.array(reportLineSchema), operatingProfit: moneyString,
  otherIncome: moneyString, otherExpense: moneyString, profitBeforeTax: moneyString,
  taxExpense: moneyString, netIncome: moneyString,
});

// cash-flow line items are unknown (empty in reconciliation) → tolerant passthrough rows
const cashFlowItemSchema = z.object({ name: z.string().nullish(), amount: moneyString.nullish() }).passthrough();
const cashFlowSectionSchema = z.object({ adjustments: z.array(cashFlowItemSchema).default([]), lines: z.array(cashFlowItemSchema).default([]), total: moneyString });
cashFlowReportSchema = z.object({
  from: z.string().nullish(), to: z.string().nullish(), netIncome: moneyString,
  operating: cashFlowSectionSchema, investing: cashFlowSectionSchema, financing: cashFlowSectionSchema,
  netChange: moneyString, kasAwal: moneyString, kasAkhir: moneyString, reconciles: z.boolean().nullish(),
});
```
Inferred types `BalanceSheetReport`/`IncomeStatementReport`/`CashFlowReport` exported. (`cashFlowSectionSchema` allows both `adjustments` and `lines`; operating uses adjustments, investing/financing use lines — both default `[]`.)

### Runner (`useReport.ts`)

```ts
export function useReport<T>(path: string, params: Record<string, string | undefined>, schema: ZodType<T>, enabled = true): UseQueryResult<T, ApiError> {
  return useQuery<T, ApiError>({
    queryKey: ['report', path, params],
    queryFn: () => apiFetch(path, { query: params, schema }),
    enabled,
  });
}
```
The two range reports pass `enabled = isRangeValid(from, to)` so an invalid `from > to` range never fires a request; `asOf` reports omit it (always enabled).

### Date controls (`ReportDateControls.tsx`)

Props: `{ mode: 'asOf' | 'range'; asOf?: string; from?: string; to?: string; onAsOf?: (d:string)=>void; onRange?: (from:string,to:string)=>void }`. In `asOf` mode renders one date input (label "Per Tanggal"); in `range` mode renders **Dari**/**Sampai** inputs and, when `from > to`, a hint (`isRangeValid`). The pages own the date state and pass defaults: `asOf = toApiDate(new Date())`; range `from = YYYY-01-01`, `to = toApiDate(new Date())`.

### Shared renderer (`StatementView.tsx`)

```ts
export interface StatementRow { label: string; amount?: string; level?: number; bold?: boolean; border?: boolean }
export function StatementView({ rows }: { rows: StatementRow[] }) { … }
```
Renders a borderless table: `label` indented by `level` (× padding), `amount` right-aligned via `MoneyText` (omitted when undefined → section headers), `bold` for subtotals/totals, `border` adds a top rule. Each statement page builds the `rows[]`.

## Components & data flow

Each statement page: owns date state (default per above) → `<ReportDateControls>` → `useReport(path, params, schema)` wrapped in `<ReportContent query={q}>{(data) => <StatementView rows={mapRows(data, t)} />}</ReportContent>`.

- **`BalanceSheetPage`** (`/reports/balance-sheet`, asOf): `mapRows` →
  section header **ASET**; for each `assets.groups[g]`: a `subtypeLabel(g.subtype)` sub-header (level 1), each `g.lines` (`{code} {name}`, amount, level 2), then a group subtotal (`g.subtotal`, level 1, bold border); then **Total Aset** (`totalAssets`, bold border). Repeat for **KEWAJIBAN**/`liabilities` and **EKUITAS**/`equity`. Finally a **Total Kewajiban + Ekuitas** row (`Money.from(totalLiabilities).plus(totalEquity)`) and a **Seimbang/Tidak seimbang** badge from `balanced`.
- **`IncomeStatementPage`** (`/reports/income-statement`, from/to): **Pendapatan** header + revenueLines + "Total Pendapatan"=`revenue`; **Harga Pokok Penjualan** + cogsLines + `cogs`; **Laba Kotor**=`grossProfit` (bold border); **Beban Operasional** + operatingExpenseLines + `operatingExpense`; **Laba Operasi**=`operatingProfit` (bold border); **Pendapatan Lain**=`otherIncome`; **Beban Lain**=`otherExpense`; **Laba Sebelum Pajak**=`profitBeforeTax` (bold); **Beban Pajak**=`taxExpense`; **Laba Bersih**=`netIncome` (bold border).
- **`CashFlowPage`** (`/reports/cash-flow`, from/to): **Laba Bersih**=`netIncome`; **Arus Kas Operasi** header + `operating.adjustments` items (name + amount) + "Kas Bersih dari Operasi"=`operating.total` (bold border); **Arus Kas Investasi** + `investing.lines` + `investing.total`; **Arus Kas Pendanaan** + `financing.lines` + `financing.total`; **Perubahan Kas Bersih**=`netChange` (bold); **Kas Awal**=`kasAwal`; **Kas Akhir**=`kasAkhir` (bold border).

**`ReportsIndexPage`** (`/reports`): a responsive grid of `Card`s, one per report — title (Neraca / Laba Rugi / Arus Kas) + a one-line description + a `Link` to the report route. (7b/7c append more cards.)

### Routes & nav

`reports.tsx` (layout `<Outlet/>`), `reports.index.tsx` (`ReportsIndexPage`), `reports.balance-sheet.tsx`, `reports.income-statement.tsx`, `reports.cash-flow.tsx`. `AppShell` nav gains `{ to:'/reports', label: t.nav.reports, icon: FileChartColumn }` (placed after Journals — both are ledger-derived views).

## States, roles, errors

- **Roles:** none — reports are any-auth; every role sees the same screens (no `RoleGate`).
- **Loading/error:** `ReportContent` shows `Skeleton` while loading and `ErrorState` on error.
- **Empty/zero:** zeros are valid data → `Rp 0`; a fresh/empty period legitimately reads zero. No special empty screen.
- **Invalid range:** `from > to` shows a hint and the query is left disabled (`enabled: isRangeValid(from,to)` in the page's `useReport` call for range reports).
- **Money:** never floats — all amounts via `MoneyText`; the one client-side sum (Total Kewajiban+Ekuitas) uses `Money`.

## i18n (`reports` group) + nav

`title` "Laporan"; report names + descriptions (`balanceSheet`/`balanceSheetDesc`, `incomeStatement`/`Desc`, `cashFlow`/`Desc`); date controls (`asOfLabel` "Per Tanggal", `from` "Dari", `to` "Sampai", `rangeInvalid`); balance-sheet labels (`assets` "Aset", `liabilities` "Kewajiban", `equity` "Ekuitas", `totalAssets`, `totalLiabEquity`, `balanced`, `unbalanced`); income-statement labels (`revenue`, `totalRevenue`, `cogs`, `grossProfit`, `operatingExpense`, `operatingProfit`, `otherIncome`, `otherExpense`, `profitBeforeTax`, `taxExpense`, `netIncome`); cash-flow labels (`netIncome`, `operating`, `cashFromOperating`, `investing`, `financing`, `netChange`, `kasAwal`, `kasAkhir`); a `subtype` object mapping each `accountSubtypeSchema` enum value to its own Indonesian label (e.g. `CURRENT_ASSET` "Aset Lancar", `NON_CURRENT_ASSET` "Aset Tidak Lancar", `FIXED_ASSET` "Aset Tetap", `ACCUMULATED_DEPRECIATION` "Akumulasi Penyusutan", `CURRENT_LIABILITY` "Utang Lancar", `NON_CURRENT_LIABILITY` "Utang Jangka Panjang", `TAX_PAYABLE` "Utang Pajak", `TAX_RECEIVABLE` "Pajak Dibayar Dimuka", `EQUITY` "Ekuitas", `CURRENT_EARNINGS` "Laba (Rugi) Berjalan", `REVENUE` "Pendapatan", `COGS` "Harga Pokok Penjualan", `OPERATING_EXPENSE` "Beban Operasional", `OTHER_INCOME` "Pendapatan Lain", `OTHER_EXPENSE` "Beban Lain"). Plus `nav.reports` "Laporan". `subtypeLabel(subtype)` reads this map and falls back to the raw value for any unmapped subtype.

## Testing

- **`schema.test.ts`** — `balanceSheetReportSchema`/`incomeStatementReportSchema`/`cashFlowReportSchema` each parse the reconciled full fixtures (nested groups/lines + totals; cash-flow empty sections default to `[]`).
- **`StatementView.test.tsx`** — given rows, renders labels + amounts (MoneyText), bolds rows with `bold`, omits amount for header rows (`amount` undefined).
- **`ReportDateControls.test.tsx`** — `asOf` mode: typing a date fires `onAsOf`; `range` mode: changing Dari fires `onRange(from,to)`; `from > to` shows the `rangeInvalid` hint.
- **`BalanceSheetPage.test.tsx`** — MSW returns a balance-sheet fixture; the page renders an account line and "Total Aset", and the `balanced` badge; changing `asOf` refetches with the new param (handler echoes `asOf`).
- **`IncomeStatementPage.test.tsx`** — renders "Laba Bersih" with the fixture's `netIncome`; the range control drives `from` (assert the request param).
- **`CashFlowPage.test.tsx`** — renders "Kas Akhir" with the fixture's `kasAkhir`.
- **MSW:** `GET /reports/balance-sheet|income-statement|cash-flow` return full nested fixtures (with one or two non-zero account lines so the rendering is meaningful), echoing `asOf`/`from`/`to`.

## Out of scope (YAGNI)

- Trial Balance + General Ledger (Plan 7b) and AR/AP Aging (Plan 7c).
- Unifying the dashboard's minimal report schemas with these full ones (the dashboard keeps its own card-summary schemas).
- CSV/PDF export, print stylesheet, period-preset shortcuts on the date controls, drill-down from a statement line to the general ledger, comparative columns (prior period).

## Done criteria

- `/reports` lists the three statements as cards; one "Laporan" nav item.
- Each statement page has its date control (asOf for the balance sheet; from/to for income statement + cash flow, with invalid-range handling), fetches via the generic `useReport`, and renders a grouped statement through `StatementView` (sections, subtype groups, lines, subtotals, totals) with money via `MoneyText`.
- The balance sheet shows a Seimbang/Tidak seimbang indicator; the income statement shows the computed subtotals down to Laba Bersih; the cash flow shows section totals + Kas Akhir.
- Full tolerant report schemas; report data layer is isolated from the dashboard (distinct query keys; no dashboard files changed).
- New tests pass; lint clean; build green.

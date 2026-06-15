# Trial Balance + General Ledger (Plan 7b) — Design

**Plan:** 7b — Trial Balance (Neraca Saldo) + General Ledger (Buku Besar). Second of three report slices (7a = the three financial statements, DONE; 7c = AR/AP Aging, next). Builds entirely on the 7a reports infrastructure.

**Status:** approved design, pre-implementation.

**Prior art:** `docs/superpowers/specs/2026-06-14-report-statements-design.md` (7a) established the report-runner pattern this slice reuses.

---

## Purpose

Two read-only ledger reports for the single-company Indonesian accounting client:

- **Trial Balance** (`Neraca Saldo`) — every postable account's debit/credit balance as of a date, with grand totals that must balance. The accountant's first close-check.
- **General Ledger** (`Buku Besar`) — one account's posted activity over a date range: opening balance, each journal line (date, ref, description, debit, credit, running balance), and closing balance.

They connect by **drill-down**: clicking a Trial Balance row opens that account's General Ledger with the account preselected.

All reports endpoints are read-only and any-auth (no `RoleGate`).

---

## Reconciled API shapes

Money is 4-decimal-place strings end-to-end (e.g. `"500000.0000"`). These shapes were reconciled live during the 7a cycle; they will be **re-verified against `localhost:3000` before schemas are pinned** (a throwaway `/tmp` script, creds from gitignored `.env`; both endpoints are read-only so no `segregationOfDutiesEnabled` toggling). If reconciliation surfaces a drift, the schema is adjusted and this section updated.

**Trial Balance** — `GET /ledger/trial-balance?asOf=YYYY-MM-DD`:
```jsonc
{
  "asOf": "2026-06-30",
  "rows": [
    { "accountId": "…", "code": "1-1000", "name": "Kas", "debit": "500000.0000", "credit": "0.0000", "balance": "500000.0000" }
  ],
  "totalDebit": "500000.0000",
  "totalCredit": "500000.0000"
}
```
(Each row carries both `debit` and `credit`; one side is `"0.0000"`. `balance` is the signed net. `rows` is a **bare array** — flat, in account-code order, no grouping. The endpoint lives under `/ledger`, not `/reports`.)

**General Ledger** — `GET /reports/general-ledger?accountId=&from=YYYY-MM-DD&to=YYYY-MM-DD`:
```jsonc
{
  "account": { "id": "…", "code": "1-1000", "name": "Kas", "normalBalance": "DEBIT" },
  "from": "2026-01-01",
  "to": "2026-06-30",
  "openingBalance": "0.0000",
  "lines": [
    { "date": "2026-03-01", "entryRef": "JE/2026/000004", "description": "Setoran modal", "debit": "1000000.0000", "credit": "0.0000", "runningBalance": "1000000.0000" }
  ],
  "closingBalance": "1000000.0000"
}
```
(`lines` is a **bare array** — no pagination. `date` is an ISO date/datetime string; display via the existing date formatter. `entryRef` is the human ref `JE/2026/NNNNNN`; the line payload carries **no journal-entry id**, so no drill-through to the journal entry — out of scope. `normalBalance` is `DEBIT`/`CREDIT`.)

---

## Architecture

Everything lands in the existing `src/features/reports/` module and reuses 7a's infrastructure unchanged:

- **`useReport(path, params, schema, enabled?)`** — the generic runner keyed `['report', path, params]`. Both reports use it directly (no new hook).
- **`ReportDateControls`** — `mode="asOf"` for TB, `mode="range"` for GL.
- **`ReportContent`** — the loading (`Skeleton`) / error (`ErrorState`) / render-prop wrapper.
- **`ReportsIndexPage`**, the `reports.*` routes group, and the `reports` i18n group — extended additively.

The one new shared piece is **`ReportTable`**, a flat multi-column table renderer (7a's `StatementView` is a 2-column label/amount layout and does not fit these genuinely tabular reports).

**Testability principle (carried from 7a):** page components are pure and render standalone in tests (just `QueryClientProvider`). All router wiring — reading `?accountId=` and navigating on drill-down — lives in the thin route files, which need no tests. Pages receive routing inputs as props (`initialAccountId`) and emit intent via callbacks (`onOpenAccount`).

---

## Components

### `ReportTable<T>` (new) — `src/features/reports/ReportTable.tsx`

A typed flat-table renderer over the shadcn `Table` primitives.

```ts
interface ReportColumn<T> {
  header: string;
  align?: 'right';                 // default left; money columns are right
  cell: (row: T) => React.ReactNode;
}
interface ReportTableProps<T> {
  columns: ReportColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;   // when set: cursor-pointer + hover; TB uses it, GL does not
  footer?: React.ReactNode;        // a <TableRow>…</TableRow> for totals / closing balance
}
```

- Renders `TableHeader` from `columns`, a `TableBody` row per `rows` entry, and `footer` (if given) inside `TableFooter`.
- Right-aligned columns get `text-right tabular-nums`.
- Empty `rows` → an empty body (the page may also show a hint); no crash.
- A small **`MoneyCell`** helper (or inline) applies **zero-suppression**: render blank for a `"0.0000"`/`"0"` money string, else `<MoneyText>`. This is the standard ledger convention (a blank credit column when the amount is a debit).

### `TrialBalancePage` (new) — `src/features/reports/TrialBalancePage.tsx`

Props: `{ onOpenAccount: (accountId: string) => void }`.

- Owns `asOf` state (default `toApiDate(new Date())`); `ReportDateControls mode="asOf"`.
- `useReport('/ledger/trial-balance', { asOf }, trialBalanceSchema)`.
- `ReportContent` → `ReportTable<TrialBalanceRow>`:
  - columns: **Kode** (`code`), **Nama** (`name`), **Debit** (`debit`, right, zero-suppressed), **Kredit** (`credit`, right, zero-suppressed).
  - `onRowClick={(r) => onOpenAccount(r.accountId)}`.
  - `footer`: a **Total** row spanning the label columns with `totalDebit` / `totalCredit` right-aligned (bold), plus a balanced `Badge` (`Money.from(totalDebit).eq(Money.from(totalCredit))` → `default`/`destructive`, label `t.reports.balanced`/`unbalanced`).
- `PageHeader title={t.reports.trialBalance}`.

### `GeneralLedgerPage` (new) — `src/features/reports/GeneralLedgerPage.tsx`

Props: `{ initialAccountId?: string }`.

- State: `accountId` (seeded from `initialAccountId`), `from` (year-start), `to` (today).
- Controls: `AccountSelect` (existing shared component — already filters to `isPostable && isActive`, takes `value`/`onChange`/`aria-label`) + `ReportDateControls mode="range"`.
- `const enabled = !!accountId && isRangeValid(from, to)`.
- `useReport('/reports/general-ledger', { accountId, from, to }, generalLedgerSchema, enabled)`.
- When `!accountId`: render the hint `t.reports.selectAccount` ("Pilih akun untuk melihat buku besar") instead of `ReportContent` — no fetch.
- Otherwise `ReportContent` →:
  - an account header line: `code · name · normalBalance`.
  - a `ReportTable<GeneralLedgerLine>`:
    - columns: **Tanggal** (`date`, via `formatDateID`), **Ref** (`entryRef`, plain text), **Deskripsi** (`description`), **Debit** (right, zero-suppressed), **Kredit** (right, zero-suppressed), **Saldo** (`runningBalance`, right).
    - the **Saldo Awal** (`openingBalance`) row is rendered as the first body row (label in the description column, amount in Saldo); the **Saldo Akhir** (`closingBalance`) row is the `footer`.
- `PageHeader title={t.reports.generalLedger}`.

### `ReportsIndexPage` (modify)

Append two cards to the existing grid: **Neraca Saldo** → `/reports/trial-balance`, **Buku Besar** → `/reports/general-ledger`. (Icons consistent with the existing card style; no per-card icon required by 7a's card design — match what 7a renders.)

---

## Routes

Thin file-based route wrappers under `src/app/routes/_app/` (new files → `routeTree.gen.ts` regeneration, same as 7a's last task):

- **`reports.trial-balance.tsx`**:
  ```tsx
  const navigate = useNavigate();
  // component: <TrialBalancePage onOpenAccount={(accountId) =>
  //   navigate({ to: '/reports/general-ledger', search: { accountId } })} />
  ```
- **`reports.general-ledger.tsx`**:
  ```tsx
  export const Route = createFileRoute('/_app/reports/general-ledger')({
    validateSearch: (s: Record<string, unknown>): { accountId?: string } =>
      ({ accountId: typeof s.accountId === 'string' ? s.accountId : undefined }),
    component: GeneralLedgerRoute,
  });
  // GeneralLedgerRoute: const { accountId } = Route.useSearch();
  //                     return <GeneralLedgerPage initialAccountId={accountId} />;
  ```

`validateSearch` follows the existing pattern in `src/app/routes/_app/payments.new.tsx`. Build order matches 7a: route/build tasks come last (typed `Link`/`navigate` targets and `Route.useSearch` only type-check after the tree is regenerated; `tsc -b` runs before `vite build`).

---

## i18n

Extend the existing `reports` group in `src/lib/i18n/messages.id.ts` (keep `export type Messages = typeof id`). Add `nav` is unchanged (the single "Laporan" entry already covers all reports). New keys:

```
trialBalance: 'Neraca Saldo'
trialBalanceDesc: 'Saldo debit/kredit setiap akun per tanggal'
generalLedger: 'Buku Besar'
generalLedgerDesc: 'Rincian transaksi satu akun untuk satu periode'
account: 'Akun'
selectAccount: 'Pilih akun untuk melihat buku besar'
kode: 'Kode'
nama: 'Nama'
debit: 'Debit'
kredit: 'Kredit'
saldo: 'Saldo'
tanggal: 'Tanggal'
ref: 'Ref'
deskripsi: 'Deskripsi'
openingBalance: 'Saldo Awal'
closingBalance: 'Saldo Akhir'
totalDebit: 'Total Debit'
totalKredit: 'Total Kredit'
```

(`balanced`/`unbalanced` and the date-control labels are reused from 7a.)

---

## Data flow

1. **TB:** page mounts → `asOf` = today → `useReport('/ledger/trial-balance', { asOf }, …)` → `ReportContent` renders `ReportTable` rows + Total footer + balanced badge. Changing `asOf` refetches. Clicking a row → `onOpenAccount(accountId)` → route navigates to GL with `?accountId=`.
2. **GL (direct):** page mounts with no `accountId` → hint, no fetch. User picks an account + range → `enabled` flips true → fetch → header + opening row + lines + closing footer.
3. **GL (drilled):** arrives with `?accountId=` → `AccountSelect` preselected, range defaults (year-start…today) → fetches immediately.

## Error & edge handling

- Loading / error / disabled all via the reused `ReportContent` (error → `ErrorState` with `traceId`; undefined data → `Skeleton`). Unmapped API codes fall through to `toastApiError`'s raw-message path (unchanged).
- Empty TB `rows` or empty GL `lines` → empty table body, no crash; totals/closing still render.
- Invalid GL range (`from > to`) → `ReportDateControls` shows its invalid hint and `enabled` is false (no fetch, no stuck skeleton). Same for no account selected.

---

## Testing

TDD; pages render standalone with `QueryClientProvider` (no router — wiring is in the untested thin route files). MSW overrides the two report endpoints inline with full fixtures (no `handlers.ts` change); `AccountSelect` uses the existing `/ledger/accounts` handler.

- **`schema.test.ts`** (extend) — parse the reconciled TB + GL fixtures (full shapes, money strings).
- **`ReportTable.test.tsx`** — renders headers + a row per item + footer; `onRowClick` fires with the clicked row; a `"0.0000"` money cell renders blank (zero-suppression) while a non-zero renders `Rp …`.
- **`TrialBalancePage.test.tsx`** — inline `/ledger/trial-balance` override; asserts a row (Kode/Nama) renders, the Total footer amounts + the balanced badge show, `asOf` is sent (and a change refetches with the new value), and clicking a row calls the injected `onOpenAccount` with the row's `accountId`.
- **`GeneralLedgerPage.test.tsx`** — (a) no `initialAccountId`: the "Pilih akun" hint shows and **no** `/reports/general-ledger` request fires; (b) with `initialAccountId` + inline GL override: asserts the `accountId`/`from` query params are sent, and Saldo Awal, a line (Ref + Deskripsi), and Saldo Akhir all render.

Full suite expected ≈ **185 + ~11 new** (schema 2, ReportTable 3, TrialBalance ~3, GeneralLedger ~3). Final task runs `pnpm test --run`, `pnpm lint`, `pnpm build` green, with `routeTree.gen.ts` regenerated.

---

## Scope

**In:** the two reports, `ReportTable`, TB→GL drill-down, two routes + two landing cards, i18n, tests.

**Out (deferred):** GL line → journal-entry drill-through (payload carries no entry id), CSV/PDF export, print stylesheet, Trial Balance grouping/subtotals by account type (flat list per the reconciled shape), pagination on GL lines (bare array, single-company volumes), comparative/prior-period columns, date presets. **7c — AR/AP Aging** is the next slice after this.

---

## Reuse summary

| Need | Reuse (unchanged) |
|---|---|
| Fetch + parse | `useReport` (`['report', …]` key) |
| Date inputs | `ReportDateControls` (asOf / range) |
| Loading/error | `ReportContent` |
| Money render | `MoneyText` / `Money` (`from`/`eq`) |
| Account picker | `AccountSelect` (postable+active, `aria-label`) |
| Date format | `formatDateID`, `toApiDate`, `isRangeValid` |
| Search params | `validateSearch` (per `payments.new.tsx`) |
| Landing / routes / i18n | `ReportsIndexPage`, `reports.*` routes, `reports` i18n group |

New: `trialBalanceSchema` + `generalLedgerSchema` (in `schema.ts`), `ReportTable`, `TrialBalancePage`, `GeneralLedgerPage`, two route files.

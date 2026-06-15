# AR/AP Aging (Plan 7c) — Design

**Plan:** 7c — AR Aging (Umur Piutang) + AP Aging (Umur Utang). The **final** report slice (7a = the three financial statements, DONE; 7b = Trial Balance + General Ledger, DONE). Builds entirely on the 7a/7b reports infrastructure.

**Status:** approved design, pre-implementation.

**Prior art:** `docs/superpowers/specs/2026-06-14-report-statements-design.md` (7a, the report-runner pattern) and `docs/superpowers/specs/2026-06-15-trial-balance-general-ledger-design.md` (7b, `ReportTable` + the testable-page pattern).

---

## Purpose

Two read-only aging reports for the single-company Indonesian accounting client:

- **AR Aging** (`Umur Piutang`) — how overdue each customer's receivables are, bucketed by age.
- **AP Aging** (`Umur Utang`) — the same for vendor payables.

Both answer "who owes what, and how late." They share an identical response shape (only the endpoint and `kind` differ), so a single kind-parameterized page drives both.

All reports endpoints are read-only and any-auth (no `RoleGate`).

---

## Reconciled API shape

Money is 4-decimal-place strings (e.g. `"500000.0000"`). This shape was reconciled live during the 7a cycle (a focused AR-aging reconciliation pinned the partner-row shape). It will be **re-verified against `localhost:3000` before the schema is pinned** if `.env` access is available (a throwaway `/tmp` script, creds from gitignored `.env`; both endpoints are read-only — no `segregationOfDutiesEnabled` toggling). If `.env` access is restricted (as it was during the 7b cycle), the prior-reconciled shape below is used with the tolerant `z.record` bucket modelling. Any drift adjusts the schema before pinning.

**AR Aging** — `GET /reports/ar-aging?asOf=YYYY-MM-DD`; **AP Aging** — `GET /reports/ap-aging?asOf=YYYY-MM-DD` (identical shape):
```jsonc
{
  "kind": "AR",                              // or "AP" — the report's side
  "asOf": "2026-06-30",
  "partners": [
    {
      "partnerId": "…",
      "partnerName": "PT Pelanggan",
      "documents": [
        { "ref": "INV/2026/000012", "date": "2026-04-01", "dueDate": "2026-05-01",
          "total": "1000000.0000", "paidAsOf": "0.0000", "outstanding": "1000000.0000", "bucket": "31-60" }
      ],
      "buckets": { "Current": "0.0000", "1-30": "0.0000", "31-60": "1000000.0000", "61-90": "0.0000", ">90": "0.0000" }
    }
  ],
  "totalsByBucket": { "Current": "0.0000", "1-30": "0.0000", "31-60": "1000000.0000", "61-90": "0.0000", ">90": "0.0000" },
  "totalOutstanding": "1000000.0000"
}
```
(`partners` and per-partner `documents` are bare arrays. `buckets` and `totalsByBucket` are keyed objects with the five fixed bucket keys `Current` / `1-30` / `31-60` / `61-90` / `>90` — modelled as a tolerant `z.record(z.string(), moneyString)`. `dueDate`/`paidAsOf` are nullish. `date`/`dueDate` are ISO date/datetime strings.)

---

## Architecture

Everything lands in the existing `src/features/reports/` module and reuses the 7a/7b infrastructure unchanged:

- **`useReport(path, params, schema, enabled?)`** — the generic runner keyed `['report', path, params]`. The aging report uses it directly (no new hook); the path is chosen by `kind`.
- **`ReportDateControls mode="asOf"`** — the single as-of date.
- **`ReportContent`** — loading (`Skeleton`) / error (`ErrorState`) / render-prop wrapper.
- **`ReportTable<T>` + `MoneyCell`** (from 7b) — the flat-table renderer with zero-suppression. Reused **unchanged** for both the partner summary and the per-partner document detail.
- **`ReportsIndexPage`**, the `reports.*` routes group, and the `reports` i18n group — extended additively.

**Testable-page pattern (from 7b):** `AgingPage` is a pure component (takes `kind`); it renders standalone in tests with just `QueryClientProvider`. The two thin route files do the only wiring (pass the `kind` prop). The partner→document interaction is in-page `useState`, fully testable without a router.

No new shared component is needed — 7c is the cheapest slice, since `ReportTable` already covers both tables.

---

## Components

### Schema (extend `src/features/reports/schema.ts`)

```ts
export const agingDocumentSchema = z.object({
  ref: z.string(),
  date: z.string(),
  dueDate: z.string().nullish(),
  total: moneyString,
  paidAsOf: moneyString.nullish(),
  outstanding: moneyString,
  bucket: z.string(),
});
export type AgingDocument = z.infer<typeof agingDocumentSchema>;

const agingBucketsSchema = z.record(z.string(), moneyString);

export const agingPartnerSchema = z.object({
  partnerId: z.string(),
  partnerName: z.string(),
  documents: z.array(agingDocumentSchema).default([]),
  buckets: agingBucketsSchema,
});
export type AgingPartner = z.infer<typeof agingPartnerSchema>;

export const agingReportSchema = z.object({
  kind: z.string().nullish(),
  asOf: z.string().nullish(),
  partners: z.array(agingPartnerSchema),
  totalsByBucket: agingBucketsSchema,
  totalOutstanding: moneyString,
});
export type AgingReport = z.infer<typeof agingReportSchema>;
```

A module constant fixes the bucket order and rendering:
```ts
export const AGING_BUCKETS = ['Current', '1-30', '31-60', '61-90', '>90'] as const;
```
Bucket cells read `buckets[b] ?? '0'` (tolerant of a missing key). The `Current` header is labelled `Lancar`; the four day-range buckets render their key literally.

### `AgingPage` (new) — `src/features/reports/AgingPage.tsx`

Props: `{ kind: 'AR' | 'AP' }`.

- `path = kind === 'AR' ? '/reports/ar-aging' : '/reports/ap-aging'`.
- State: `asOf` (default today), `selected: AgingPartner | null`.
- `useReport(path, { asOf }, agingReportSchema)`.
- Title: `kind === 'AR' ? t.reports.arAging : t.reports.apAging`. Partner-column/detail label: `kind === 'AR' ? t.reports.pelanggan : t.reports.vendor`.
- `ReportDateControls mode="asOf"` drives `asOf`.
- `ReportContent` →:
  - **Summary `ReportTable<AgingPartner>`**:
    - columns: partner-label, then one per `AGING_BUCKETS` (`Lancar`/`1-30`/`31-60`/`61-90`/`>90`, right-aligned `MoneyCell`), then **Total** (right, `MoneyText` of the partner's bucket sum: `AGING_BUCKETS.reduce((m, b) => m.plus(Money.from(p.buckets[b] ?? '0')), Money.zero()).toApi()`).
    - `onRowClick={(p) => setSelected(p)}`.
    - `footer`: a Total row — the partner-label cell shows `t.reports.total`, each bucket cell shows `MoneyText` of `totalsByBucket[b] ?? '0'`, and the Total cell shows `totalOutstanding`.
  - **Detail** (only when `selected`): a heading with `selected.partnerName`, then a `ReportTable<AgingDocument>` of `selected.documents` — columns **Ref** (`ref`), **Tanggal** (`formatDateID(date.slice(0,10))`), **Jatuh Tempo** (`dueDate ? formatDateID(dueDate.slice(0,10)) : ''`), **Total** (`MoneyText`), **Dibayar** (`MoneyCell` of `paidAsOf ?? '0'`), **Outstanding** (`MoneyText`), **Bucket** (`bucket`).
- `PageHeader title={…}`.

### `ReportsIndexPage` (modify)

Append two cards: **Umur Piutang** → `/reports/ar-aging`, **Umur Utang** → `/reports/ap-aging`.

---

## Routes

Two thin file-based route wrappers under `src/app/routes/_app/` (new files → `routeTree.gen.ts` regeneration, same as 7a/7b's last task):

- **`reports.ar-aging.tsx`**: `createFileRoute('/_app/reports/ar-aging')`, `component: () => <AgingPage kind="AR" />`.
- **`reports.ap-aging.tsx`**: `createFileRoute('/_app/reports/ap-aging')`, `component: () => <AgingPage kind="AP" />`.

No search params (the `kind` is fixed per route). Build order matches 7a/7b: the route/build task comes last (the two new `Link`s in `ReportsIndexPage` only type-check after the tree is regenerated; `tsc -b` runs before `vite build`).

---

## i18n

Extend the existing `reports` group in `src/lib/i18n/messages.id.ts` (keep `export type Messages = typeof id`). The single "Laporan" nav entry already covers all reports. New keys:

```
arAging: 'Umur Piutang'
arAgingDesc: 'Saldo piutang pelanggan menurut umur'
apAging: 'Umur Utang'
apAgingDesc: 'Saldo utang vendor menurut umur'
pelanggan: 'Pelanggan'
vendor: 'Vendor'
lancar: 'Lancar'
jatuhTempo: 'Jatuh Tempo'
dibayar: 'Dibayar'
outstanding: 'Outstanding'
totalOutstanding: 'Total Outstanding'
```

(`total`, `tanggal`, `ref`, the date-control labels, and `balanced` are reused from 7a/7b. The day-range bucket headers `1-30`/`31-60`/`61-90`/`>90` render literally — not i18n keys.)

---

## Data flow

1. Page mounts (e.g. via the Umur Piutang card → `/reports/ar-aging` → `<AgingPage kind="AR" />`) → `asOf` = today → `useReport('/reports/ar-aging', { asOf }, …)`.
2. `ReportContent` renders the partner×bucket summary + the totals footer.
3. Clicking a partner row sets `selected` → the detail section renders that partner's documents below. Clicking another partner switches it.
4. Changing `asOf` refetches (and clears nothing — `selected` may point at a stale partner object, so on each successful fetch the page does not auto-clear `selected`; selecting again from the new data refreshes it — acceptable, and the detail always reflects the last clicked partner object).

## Error & edge handling

- Loading / error via the reused `ReportContent` (error → `ErrorState` with `traceId`; undefined data → `Skeleton`).
- Empty `partners` → empty summary body, totals footer still renders (zeros).
- No partner selected → no detail section.
- A partner with empty `documents` → an empty detail table (no crash).

---

## Testing

TDD; `AgingPage` renders standalone with `QueryClientProvider` (no router). MSW overrides the aging endpoints inline with full fixtures (no `handlers.ts` change).

- **`schema.test.ts`** (extend) — parse a full aging fixture (a partner with `buckets` + a `document`, `totalsByBucket`, `totalOutstanding`).
- **`AgingPage.test.tsx`**:
  - **kind="AR"**: inline `/reports/ar-aging` override; assert the title *Umur Piutang*, a partner row (name + a bucket amount) renders, the totals footer shows `totalOutstanding`, `asOf` is sent (default today), and clicking the partner row reveals its document detail (the doc `ref` appears).
  - **kind="AP"**: inline `/reports/ap-aging` override; assert it requests `/reports/ap-aging` and shows *Umur Utang* + the *Vendor* label.

Full suite expected ≈ **192 + ~3 new** (schema 1, AgingPage 2). The final task runs `pnpm test --run`, `pnpm lint`, `pnpm build` green, with `routeTree.gen.ts` regenerated.

---

## Scope

**In:** the kind-parameterized aging report (AR + AP), the partner×bucket summary, per-partner document detail on click, two routes + two landing cards, i18n, tests.

**Out (deferred / never):** true inline-accordion expansion (extending `ReportTable`), CSV/PDF export, a partner filter, custom bucket boundaries, drill from a document to its source invoice/bill, clickable partner → ledger. **This is the final report slice** — after it the `/reports` area is complete (six reports: balance sheet, income statement, cash flow, trial balance, general ledger, AR/AP aging). The roadmap then moves to periods + year-end close, audit log, and company settings.

---

## Reuse summary

| Need | Reuse (unchanged) |
|---|---|
| Fetch + parse | `useReport` (`['report', …]` key) |
| As-of input | `ReportDateControls mode="asOf"` |
| Loading/error | `ReportContent` |
| Tables | `ReportTable` + `MoneyCell` (summary AND document detail) |
| Money | `MoneyText` / `Money` (`from`/`plus`/`zero`/`toApi`) |
| Date format | `formatDateID`, `toApiDate` |
| Landing / routes / i18n | `ReportsIndexPage`, `reports.*` routes, `reports` i18n group |

New: the aging schemas + `AGING_BUCKETS` (in `schema.ts`), `AgingPage`, two route files. No new shared component.

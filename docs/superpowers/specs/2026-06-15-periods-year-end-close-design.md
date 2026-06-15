# Periods + Year-End Close (Plan 8) — Design

**Plan:** 8 — Fiscal periods (monthly open/close) + year-end close, on one "Tutup Buku" screen. The first new **mutation** surface since the journals slice (Plan 6); all the report slices (Plan 7a–c) were read-only.

**Status:** approved design, pre-implementation.

**Context:** The `/reports` area is complete (Plan 7). This slice adds the fiscal-calendar locking that the rest of the app already respects defensively — posting into a closed period/year returns `409 CLOSED_PERIOD`/`CLOSED_YEAR`, already mapped in `toastApiError`.

---

## Purpose

Give APPROVER/ADMIN users control over the accounting calendar:

- **Periods** — each fiscal year has monthly periods that can be **open** or **closed**. Closing a period locks it against new posting. Generate a year's periods, close a period, reopen a period.
- **Year-end close** — run the year-end close for a fiscal year (zeroes the cumulative P&L into Laba Ditahan `3-2000` and locks the year), see its status, and reopen a closed year.

One "Tutup Buku" screen, scoped to a selected fiscal year, drives both.

---

## API surface (from `docs/api/`)

Request DTOs are typed in openapi (`{ fiscalYear }` for generate + close-year); **all responses are untyped**, so the Period and year-end-status shapes below are **inferred and MUST be live-reconciled before the schemas are pinned** (see Reconciliation).

```
GET  /ledger/periods?fiscalYear=     any auth   list a year's monthly periods (bare array)
POST /ledger/periods/generate        APPROVER/ADMIN   { fiscalYear }  generate a year's periods
POST /ledger/periods/:id/close       APPROVER/ADMIN   close one monthly period
POST /ledger/periods/:id/reopen      ADMIN            reopen a monthly period

GET  /close/year-end/:fy             any auth   close status for a fiscal year (404 if never closed)
POST /close/year-end                 ADMIN      { fiscalYear }  run year-end close
POST /close/year-end/:fy/reopen      ADMIN      reopen a closed fiscal year
```

- Posting into a closed period → `409 CLOSED_PERIOD`; into a closed year → `409 CLOSED_YEAR`. After year-end close, the year is locked against new posting.
- Year-end close zeroes the cumulative P&L into Laba Ditahan (retained earnings). The closing journal entry posts server-side; it is viewable in the existing journals register (not built here).

### Inferred shapes (to reconcile)

**Period** (`GET /ledger/periods?fiscalYear=` → bare array):
```jsonc
{ "id": "…", "fiscalYear": 2026, "month": 1, "status": "OPEN", "startDate": "2026-01-01", "endDate": "2026-01-31", "closedAt": null }
```
`status` is modelled tolerantly: a `z.string().nullish()` plus a tolerant `isClosed: z.boolean().nullish()`, and the UI derives "closed" from whichever the API actually returns (`status === 'CLOSED'` || `isClosed === true`). The month label comes from `month` (1–12) or, if absent, from `startDate`.

**Year-end status** (`GET /close/year-end/:fy`; **404 ⇒ never closed**):
```jsonc
{ "fiscalYear": 2026, "status": "CLOSED", "closedAt": "2026-12-31T…", "closingEntryId": "…" }
```
All fields nullish/tolerant. The status query maps a 404 to `null` (= "Belum ditutup"), not an error.

---

## Architecture

New module **`src/features/periods/`** (bespoke — the mutations are custom POST actions, not a CRUD form, so `createResourceHooks` does not apply). One page, a small set of hooks, and a schema.

**Data layer:**
- `usePeriods(fiscalYear)` → `useQuery(['periods', fiscalYear])` → `apiFetch('/ledger/periods', { query: { fiscalYear }, schema: periodListSchema })`.
- `useYearEndStatus(fiscalYear)` → `useQuery(['year-end', fiscalYear])` whose queryFn calls `apiFetch('/close/year-end/' + fiscalYear, { schema: yearEndStatusSchema })` and **catches a 404 `ApiError`, returning `null`** (the only place 404 is a normal result). Other errors propagate.
- Mutations (each invalidates the queries it affects; idempotent POSTs carry an `Idempotency-Key` consistent with the app's post/void convention):
  - `useGeneratePeriods()` → POST `/ledger/periods/generate` `{ fiscalYear }` → invalidate `['periods', fy]`.
  - `useClosePeriod()` / `useReopenPeriod()` → reuse the `useDocumentAction({ basePath: '/ledger/periods', action: 'close' | 'reopen', key: 'periods' })` id+action pattern (mutate `{ id, idempotencyKey }`) → invalidate `['periods', fy]` and `['year-end', fy]`.
  - `useRunYearEnd()` → POST `/close/year-end` `{ fiscalYear }` → invalidate `['year-end', fy]` + `['periods', fy]`.
  - `useReopenYear()` → POST `/close/year-end/${fy}/reopen` → invalidate `['year-end', fy]` + `['periods', fy]`.

Query keys are added to `src/lib/query/keys.ts` (`queryKeys.periods.list(fy)`, `queryKeys.yearEnd.status(fy)`).

**Roles** (existing `RoleGate allow={[...]}`): generate + close period = `['APPROVER','ADMIN']`; reopen period, run year-end, reopen year = `['ADMIN']`. The page itself is any-auth (read). All errors (`409 CLOSED_*`, 403) surface through the existing `toastApiError`.

---

## Components

### Schema — `src/features/periods/schema.ts`

```ts
export const periodSchema = z.object({
  id: z.string(),
  fiscalYear: z.number(),
  month: z.number().nullish(),
  status: z.string().nullish(),
  isClosed: z.boolean().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  closedAt: z.string().nullish(),
});
export type Period = z.infer<typeof periodSchema>;
export const periodListSchema = z.array(periodSchema);

export const yearEndStatusSchema = z.object({
  fiscalYear: z.number().nullish(),
  status: z.string().nullish(),
  isClosed: z.boolean().nullish(),
  closedAt: z.string().nullish(),
  closingEntryId: z.string().nullish(),
});
export type YearEndStatus = z.infer<typeof yearEndStatusSchema>;
```

A helper `isPeriodClosed(p: Period): boolean` = `p.status === 'CLOSED' || p.isClosed === true`, and `isYearClosed(s: YearEndStatus | null)` = `!!s && (s.status === 'CLOSED' || s.isClosed === true)`. A `MONTHS_ID` const (Indonesian month names, `['Januari', …, 'Desember']`) provides the month label (`monthLabel(p)` = `MONTHS_ID[(p.month ?? monthFromStartDate) - 1]`).

### `PeriodsPage` — `src/features/periods/PeriodsPage.tsx`

- **Fiscal-year stepper**: state `fiscalYear` (default `new Date().getFullYear()`), prev/next buttons (`−`/`+`) around the displayed year. Drives both queries.
- **Periods table** (`usePeriods(fy)`):
  - Wrapped in a loading/error boundary (`Skeleton` / `ErrorState`).
  - Columns: **Bulan** (`monthLabel`), **Status** (`Badge` — *Tertutup* destructive / *Terbuka* default), **Aksi**:
    - open period → `RoleGate allow={['APPROVER','ADMIN']}` **Tutup** button → `ConfirmDialog` → `useClosePeriod`.
    - closed period → `RoleGate allow={['ADMIN']}` **Buka** button → `ConfirmDialog` → `useReopenPeriod`.
  - If the list is empty → an empty state with `RoleGate allow={['APPROVER','ADMIN']}` **Buat Periode** button → `ConfirmDialog`/direct → `useGeneratePeriods({ fiscalYear })`.
- **Year-end-close panel** (`useYearEndStatus(fy)`):
  - Status line: `null` → *Belum ditutup*; closed → *Ditutup pada {formatDateID(closedAt)}*.
  - not closed → `RoleGate allow={['ADMIN']}` **Tutup Buku Akhir Tahun** → `ConfirmDialog` (desc: memindahkan laba/rugi ke Laba Ditahan dan mengunci tahun fiskal) → `useRunYearEnd`.
  - closed → `RoleGate allow={['ADMIN']}` **Buka Kembali Tahun** → `ConfirmDialog` → `useReopenYear`.
  - soft hint (no hard gate): if not closed and any period is still open, show "Tutup semua periode sebelum tutup buku tahun" — the server remains the authority (a `409` surfaces via toast).
- `PageHeader title={t.periods.title}` (outside any loading boundary, always visible).

Each mutating action button shows a pending state (`ConfirmDialog`'s `pending` prop) and is disabled while in flight.

### Route & nav

- Route `src/app/routes/_app/periods.tsx` → `PeriodsPage` (any-auth; route-tree regen required for the new file).
- `AppShell` nav: `{ to: '/periods', label: t.nav.periods, icon: CalendarCheck }` (or `Lock`) placed after Reports.

---

## i18n

New `nav.periods: 'Tutup Buku'` and a `periods` group in `src/lib/i18n/messages.id.ts`:

```
title: 'Tutup Buku'
fiscalYear: 'Tahun Fiskal'
bulan: 'Bulan'
status: 'Status'
aksi: 'Aksi'
open: 'Terbuka'
closed: 'Tertutup'
close: 'Tutup'
reopen: 'Buka'
generate: 'Buat Periode'
noPeriods: 'Belum ada periode untuk tahun ini'
confirmClose: 'Tutup periode ini? Posting ke periode ini akan dikunci.'
confirmReopen: 'Buka kembali periode ini?'
confirmGenerate: 'Buat periode bulanan untuk tahun fiskal ini?'
yearEnd: 'Tutup Buku Akhir Tahun'
yearEndStatus: 'Status Tutup Buku'
notClosed: 'Belum ditutup'
closedOn: 'Ditutup pada'
runYearEnd: 'Tutup Buku Akhir Tahun'
reopenYear: 'Buka Kembali Tahun'
confirmYearEnd: 'Menjalankan tutup buku akhir tahun memindahkan laba/rugi ke Laba Ditahan dan mengunci tahun fiskal. Lanjutkan?'
confirmReopenYear: 'Buka kembali tahun fiskal yang sudah ditutup?'
closeAllFirst: 'Tutup semua periode sebelum tutup buku tahun'
```

(The Indonesian month names live in a `MONTHS_ID` const in the feature module, not i18n — they are fixed display data in an Indonesian-only app.)

---

## Data flow

1. Page mounts → `fiscalYear` = current year → `usePeriods(fy)` + `useYearEndStatus(fy)` fire.
2. The periods table renders rows with status badges + gated actions; the year-end panel renders status + gated run/reopen.
3. Stepping the year changes `fiscalYear` → both queries refetch under their new keys.
4. An action (close/reopen/generate/run/reopen-year) → `ConfirmDialog` → mutation → on success invalidates `['periods', fy]` (and `['year-end', fy]`) → the table/panel refresh.
5. A year with no periods → empty state → **Buat Periode** generates them → list refetches.

## Error & edge handling

- List loading/error → `Skeleton` / `ErrorState`.
- Year-end status `404` → `null` → "Belum ditutup" (normal, not an error).
- `409 CLOSED_PERIOD`/`CLOSED_YEAR`, 403 FORBIDDEN/SEGREGATION_OF_DUTIES → `toastApiError` (already mapped; unmapped codes fall through to the raw message).
- Action buttons disabled while their mutation is pending.

---

## Testing

TDD. **MSW:** add stateful handlers for the six endpoints to `src/test/handlers.ts` over a small in-memory period set (the page exercises several together — shared handlers beat inline overrides here). The year-end GET handler returns 404 for a never-closed year.

- **`schema.test.ts`** — parse a period fixture and a year-end-status fixture; assert `isPeriodClosed`/`isYearClosed` helpers.
- **Hooks tests** — `usePeriods` lists; `useYearEndStatus` returns `null` on 404 and the object on 200; `useClosePeriod`/`useGeneratePeriods`/`useRunYearEnd` fire the right method+path and invalidate (assert a refetch or the captured request).
- **`PeriodsPage.test.tsx`**:
  - renders the periods table with month labels + status badges; the year stepper updates the requested `fiscalYear`.
  - as ADMIN: **Tutup** on an open period → ConfirmDialog confirm → POST `/ledger/periods/:id/close` fired → row flips to Tertutup.
  - empty year → **Buat Periode** → POST `/ledger/periods/generate` with the fiscalYear.
  - year-end panel: a 404 year shows *Belum ditutup* + (ADMIN) **Tutup Buku Akhir Tahun** → confirm → POST `/close/year-end`; a closed year shows *Ditutup pada …* + **Buka Kembali Tahun**.
  - as VIEWER: no action buttons render (RoleGate).

Full suite expected ≈ **195 + ~10 new**. The final task runs `pnpm test --run`, `pnpm lint`, `pnpm build` green, with `routeTree.gen.ts` regenerated.

---

## Scope

**In:** the periods list + generate + close/reopen, the year-end status + run/reopen, the "Tutup Buku" screen (year stepper, periods table, year-end panel), the nav entry + route, i18n, role gating, tests.

**Out (deferred / YAGNI):** editing period start/end dates, non-calendar fiscal years (assume Jan–Dec monthly), a bulk "close all periods" action, a closing-entry preview/detail (the year-end entry posts server-side; view it in the journals register), prior-year comparison, and the company-settings screen (where the `segregationOfDutiesEnabled` toggle lives — its own later slice).

---

## Reuse summary

| Need | Reuse (unchanged) |
|---|---|
| Fetch + parse | `apiFetch` (`query`, `schema`), `useQuery` |
| Idempotent close/reopen | `useDocumentAction` (id+action+Idempotency-Key) |
| Role gating | `RoleGate allow={[...]}` |
| Confirm | `ConfirmDialog` (`pending`, `destructive`) |
| Status pill | `Badge` |
| Errors | `toastApiError` (409 CLOSED_*, 403 already mapped) |
| Date format | `formatDateID` |
| Query keys | `src/lib/query/keys.ts` (+`periods`, +`yearEnd`) |

New: `src/features/periods/*` (schema + hooks + `PeriodsPage` + `MONTHS_ID`), one route, a `periods` i18n group, an `AppShell` nav entry, and `src/test/handlers.ts` period/year-end handlers.

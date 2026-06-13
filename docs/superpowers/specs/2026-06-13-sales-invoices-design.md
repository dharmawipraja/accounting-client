# Plan 3 — Sales Invoices — Design

**Date:** 2026-06-13
**Status:** Approved (brainstorming) — ready for implementation planning
**Depends on:** Plans 1, 2a, 2b (merged to `main`). Reuses `apiFetch`/`ApiError`/idempotency,
`createResourceHooks`, `applyApiErrorToForm`, `RoleGate`/`RowActions`/`ConfirmDialog`/`FormDialog`,
`DataTable`, `AccountSelect`, `Money`, `useT`, the partners/tax-codes features, and MSW infra.

## 1. Goal

Build the **sales-invoice lifecycle**: a full-page draft editor (header + line-item table + live
`/tax/calculate` preview), a status-filtered list, and post/void with idempotency keys and the first
**segregation-of-duties** flow. This is the first document type with a draft → post → void lifecycle;
the reusable pieces it introduces (`useDocumentAction`, `PartnerSelect`, `TaxCodeMultiSelect`,
`useTaxPreview`, `toastApiError`) are reused by purchase bills, payments, and journals later.

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Editor surface | **Full-page route** (`/sales-invoices/new`, `/sales-invoices/:id/edit`) |
| Tax preview timing | **Debounced live** (~400ms) `POST /tax/calculate` |
| Approval queue | **Status filter on the list** (Draft = the queue) |
| Phasing | **3a** (editor + drafts + list) then **3b** (post/void/SoD/approval) |

## 3. Live reconciliation findings (verified against the API)

- **`POST /tax/calculate` response:**
  ```json
  { "subtotal": "1000000.0000",
    "taxes": [{ "taxCodeId","code","kind","base","amount","accountId" }],
    "settlementAmount": "1090000.0000",
    "journalLines": [{ "accountId","debit?"|"credit?" }] }
  ```
  For a 1,000,000 sale with PPN_OUTPUT 11% + PPH_PREPAID 2%: subtotal 1,000,000, PPN +110,000,
  PPh prepaid −20,000, **settlementAmount 1,090,000** = the AR / amount the customer owes.
- **SALE tax-kind rule:** `/tax/calculate` rejects `PPH_PAYABLE` for `nature: SALE`
  (`422 VALIDATION_FAILED`). For a SALE only **`PPN_OUTPUT` + `PPH_PREPAID`** are valid (the customer
  withholds PPh → prepaid from the seller's side). The line tax picker must filter to those.
- **`settlementAccountId`** is required by `/tax/calculate`; the tax amounts don't depend on it (it
  only drives the settlement journal leg). Resolve it to the **AR control account, code `1-1200`
  (Piutang Usaha)**, from the chart.
- **Sales-invoices is empty** (0 rows): the `SalesInvoice` response shape is reconciled by the first
  3a build task (create a draft → capture → delete). Account responses use `parentId`; tax `rate` is a
  fraction string; both already handled.

## 4. Architecture

### 4.1 Schema & hooks — `src/features/sales-invoices/`
- **Create payload** (DTO, known): `{ partnerId, date, dueDate?, description?, lines: [{ description,
  accountId, quantity, unitPrice, taxCodeIds }] }`; `quantity`/`unitPrice` are decimal strings.
- **Update payload:** `{ date?, dueDate?, description?, lines? }`.
- **`salesInvoiceSchema`** (item) reconciled at build; tolerant meanwhile. Expected fields:
  `id, invoiceNo, partnerId, date, dueDate?, description?, status, lines[], subtotal, taxTotal, total`
  (exact names/`status` enum confirmed against the live API in the reconciliation task).
- **CRUD:** `createResourceHooks<SalesInvoice, CreatePayload, UpdatePayload>({ key:'salesInvoices',
  basePath:'/sales-invoices', itemSchema })` → list/get/create/update/remove(draft).
- **Lifecycle actions:** a new reusable **`useDocumentAction({ key, basePath, action })`** in
  `src/lib/crud/` → a mutation taking `{ id, idempotencyKey }` that POSTs `{basePath}/:id/{action}`
  with the `Idempotency-Key` header and invalidates the resource list. `usePostInvoice` /
  `useVoidInvoice` wrap it (`action: 'post' | 'void'`).

### 4.2 Non-form error handling — `src/lib/api/toastApiError.ts`
`toastApiError(error: unknown, t: Messages): void` for confirm-dialog/action contexts:
- `403 SEGREGATION_OF_DUTIES` → `t.roles.segregationOfDuties` (distinct hand-off message).
- `403 FORBIDDEN` → `t.roles.forbidden`.
- `409 CLOSED_PERIOD` / `409 CLOSED_YEAR` → their messages (new `crud` keys).
- else → toast `message` + `traceId`.
Each post/void generates a `crypto.randomUUID()` **idempotency key** when its confirm dialog opens,
reused on retry.

### 4.3 Shared components — `src/components/common/`
- **`PartnerSelect`** — combobox over `partnersApi.useList()`; prop `filter?: 'customer' | 'vendor' |
  'all'` (sales → `'customer'`); active only; value = partner id; `aria-label` prop. Mirrors
  `AccountSelect`.
- **`TaxCodeMultiSelect`** — multi-select (popover + command + checkboxes) over `taxCodesApi.useList()`,
  filtered to an `allowedKinds: TaxKind[]` prop (SALE → `['PPN_OUTPUT','PPH_PREPAID']`); value =
  `string[]` of tax-code ids; selected shown as small badges; `aria-label`.

### 4.4 Tax preview — `src/features/sales-invoices/useTaxPreview.ts`
`useTaxPreview({ nature, settlementAccountId, lines })` where `lines: [{accountId, amount,
taxCodeIds}]`. Debounces inputs ~400ms, then `POST /tax/calculate` via React Query (keyed on the
debounced payload), parsing the response with a `taxCalcSchema`. Returns `{ data, isLoading, error }`.
No-ops (no query) when there are no complete lines (account + non-zero amount). Reused by purchase
bills (nature PURCHASE).

### 4.5 Line math
Each line `amount = Money(quantity).times(unitPrice).toApi()` (decimal, never float). The editor
computes per-line amounts + a local subtotal; the authoritative tax/total numbers come from
`/tax/calculate` (`subtotal`, `taxes[]`, `settlementAmount`).

### 4.6 Routing & i18n
- Routes under `_app`: `/sales-invoices` (list), `/sales-invoices/new`, `/sales-invoices/:id/edit`.
- i18n: a `salesInvoices` group (header + line-column labels, status names, totals labels, post/void
  copy); add `crud.closedPeriod`/`crud.closedYear`/`crud.post`/`crud.void` shared keys.

## 5. The draft editor (full-page)

Composed of focused units:
- **`InvoiceEditorPage`** — route component; loads the draft (edit) via `useItem(id)` or starts blank
  (new); renders `InvoiceForm`; navigates to the list on save/cancel.
- **`InvoiceForm`** — RHF + zod. Header: `PartnerSelect` (customers), `DateField` date + dueDate,
  description. Lines: `useFieldArray` rendering `InvoiceLineRow`s + "Tambah baris". Totals:
  `InvoiceTotals`. Save (POST new / PATCH draft) + Cancel.
- **`InvoiceLineRow`** — description, `AccountSelect` (revenue account), quantity (numeric input),
  unitPrice (`MoneyInput`), `TaxCodeMultiSelect` (SALE kinds), computed line amount (`MoneyText`,
  read-only), remove.
- **`InvoiceTotals`** — consumes `useTaxPreview` (debounced) over the current lines (amount = qty×price)
  and shows **Subtotal (DPP) → + PPN → − PPh Dipotong → Total** (from `settlementAmount`), with a
  "menghitung…" state and an inline error when `/tax/calculate` returns `422`.
- **Validation (zod):** partner + date required; ≥1 line; each line: account required, quantity > 0,
  unitPrice ≥ 0, taxCodeIds optional. Server `422`/`409`/`403` via `applyApiErrorToForm`.

## 6. The list — Faktur Penjualan

- **`SalesInvoicesPage`** — `DataTable`: No. Faktur (`invoiceNo`), Partner (joined from
  `partnersApi.useList()` by `partnerId` → name, unless the response carries the name — reconciled),
  Tanggal, Jatuh Tempo, Status badge (DRAFT/POSTED/VOID), Total (`MoneyText`), actions. Search + a
  **status filter** (All / Draft / Posted / Void), applied client-side.
- **Row actions (status + role aware):** DRAFT → Edit + Delete (ACCOUNTANT+), Post (APPROVER/ADMIN);
  POSTED → View, Void (APPROVER/ADMIN); VOID → View. "Faktur Baru" (ACCOUNTANT+) → `/sales-invoices/new`.
  The **Draft filter is the approval queue.**
- Post/Void use a `ConfirmActionDialog` (owns the idempotency key) → `usePostInvoice`/`useVoidInvoice`;
  errors via `toastApiError` (SoD distinct from forbidden).

## 7. Testing

- **`PartnerSelect` / `TaxCodeMultiSelect` (TDD):** filtering (customers only; allowed SALE kinds only),
  value contract (id / id[]), aria-label query (use the Radix/jsdom shims + `pointerEventsCheck: 0`).
- **`useTaxPreview` (TDD):** debounces; posts the correct `/tax/calculate` body; returns parsed totals;
  no query when lines incomplete; surfaces `422`.
- **`toastApiError` (TDD):** SoD vs forbidden vs closed-period vs generic.
- **`useDocumentAction` (TDD):** posts to `/:id/:action` with an `Idempotency-Key`; invalidates the list.
- **`InvoiceForm` integration (MSW):** add/remove lines; line amount = qty×price; totals reflect a
  mocked `/tax/calculate`; save sends the correct `lines` payload; partner/line validation.
- **`SalesInvoicesPage` integration (MSW):** list + status filter; role-gated actions per status
  (VIEWER none; ACCOUNTANT edit/delete draft, no post; APPROVER/ADMIN post/void); **post surfaces
  `403 SEGREGATION_OF_DUTIES` distinctly**; idempotency key sent on post.
- MSW: sales-invoices list/get/create/update/delete + post/void (incl. an SoD `403` fixture) and a
  `/tax/calculate` stub.

## 8. Definition of done

- Full sales-invoice lifecycle: ACCOUNTANT+ create/edit/delete drafts in the full-page editor with a
  live tax preview; APPROVER/ADMIN post (idempotent, SoD-guarded) and void; list filters by status.
- `useDocumentAction`, `PartnerSelect`, `TaxCodeMultiSelect`, `useTaxPreview`, `toastApiError` built,
  tested, and reusable.
- Money decimal end-to-end (line amounts, totals); schemas reconciled against the live API.
- Green test suite; `pnpm lint && pnpm build` clean.

## 9. Phasing

- **3a — Editor + drafts:** invoice-shape reconciliation, schema/hooks (CRUD), `PartnerSelect`,
  `TaxCodeMultiSelect`, `useTaxPreview`, the full-page editor (`InvoiceEditorPage`/`InvoiceForm`/
  `InvoiceLineRow`/`InvoiceTotals`), the list showing all invoices with status badges + role-gated
  New/Edit/Delete-draft, routes. Working: create/edit/delete/list draft invoices with live preview.
- **3b — Post/Void/Approval:** `useDocumentAction`, `usePostInvoice`/`useVoidInvoice`, `toastApiError`,
  the post/void confirm flow (idempotency + SoD), the status filter, role-gating per status. Working:
  full lifecycle.

## 10. Out of scope (later plans)

Purchase bills (mirror of this with nature PURCHASE — reuses `useTaxPreview`/`PartnerSelect`/
`TaxCodeMultiSelect`), payments + dashboard (Plan 4), journals register, reports, periods/year-end,
audit log, company settings.

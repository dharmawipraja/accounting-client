# Purchase Bills (Plan 5a) — Design Spec

**Status:** Approved
**Date:** 2026-06-14
**Plan:** 5a — Purchase Bills (the AP mirror of Sales Invoices)

## Goal

Add the accounts-payable side: a `/purchase-bills` feature with a draft editor, full CRUD, post/void lifecycle, and a status-filtered list — mirroring the sales-invoice stack and reusing all existing shared infrastructure.

## Context

Purchase bills are the buy-side mirror of sales invoices. The sales-invoice feature (`src/features/sales-invoices/`) is the template; the lifecycle infrastructure built in Plans 3–4 (`createResourceHooks`, `useDocumentAction`, `toastApiError`, `applyApiErrorToForm`, `RoleGate`, `ConfirmDialog`, `DataTable`, `PartnerSelect`, `AccountSelect`, `TaxCodeMultiSelect`, `MoneyText`) is reused as-is.

### Live-reconciled purchase-bill shape (API verified 2026-06-14, `/tmp/reconcile5a.mjs`)

A temp vendor + bill were created, posted, and voided. Shape (money = 4-decimal strings; tolerant schema pins only what the UI consumes):

```
POST /purchase-bills (201, DRAFT) / POST /purchase-bills/:id/post (200, POSTED):
{
  id, billNumber (null→1), billRef (null→"BILL/2026/000001"), fiscalYear (null→2026),
  partnerId, vendorInvoiceNo (nullable — the supplier's own invoice number),
  date, dueDate, description, status,
  subtotal, taxTotal, withholdingTotal, total, amountPaid, outstanding, paymentStatus,
  journalEntryId (null→uuid on post), postedBy, postedAt, createdBy, createdAt, updatedAt,
  lines: [{ id, purchaseBillId, lineNo, description, accountId, quantity, unitPrice, amount, taxCodeIds }]
}
```

Differences from `salesInvoiceSchema`: `billNumber`/`billRef` (not `invoiceNumber`/`invoiceRef`); ref prefix `BILL/` (not `INV/`); extra nullable `vendorInvoiceNo`; line carries `purchaseBillId`. Create payload is the **same shape** as sales invoices plus optional `vendorInvoiceNo`: `{ partnerId, date, dueDate?, vendorInvoiceNo?, description?, lines:[{description, accountId, quantity, unitPrice, taxCodeIds}] }`. Post assigns `billNumber`/`billRef`/`fiscalYear`/`journalEntryId`. SoD was restored to `true` after the run.

### Endpoints (`docs/api/frontend-guide.md`)

`GET /purchase-bills` (bare array), `GET /purchase-bills/:id`, `POST /purchase-bills` (ACCOUNTANT+), `PATCH /purchase-bills/:id` (ACCOUNTANT+), `POST /purchase-bills/:id/post` (APPROVER/ADMIN), `POST /purchase-bills/:id/void` (APPROVER/ADMIN), `DELETE /purchase-bills/:id` (ACCOUNTANT+). Settlement account = AP `2-1000` (Utang Usaha). Valid PURCHASE tax kinds = `PPN_INPUT` + `PPH_PAYABLE`.

## Architecture

**Reuse strategy (approved):** promote the genuinely-shared tax engine to a neutral module; build purchase-bills as its own feature; leave the working sales-invoice editor otherwise untouched. **Scope (approved):** the full lifecycle (editor + drafts CRUD + post/void + list) in this single plan — the lifecycle infrastructure already exists, so no 5a/5b split.

### Shared tax core — move out of `features/sales-invoices/` into `src/features/documents/`

- `taxCalcSchema.ts` → `src/features/documents/taxCalcSchema.ts` (moved verbatim).
- `useTaxPreview.ts` → `src/features/documents/useTaxPreview.ts` (moved verbatim; already takes `nature: 'SALE' | 'PURCHASE'`).
- `InvoiceTotals.tsx` → `src/features/documents/DocumentTotals.tsx`, generalized to accept `nature: 'SALE' | 'PURCHASE'` (in addition to the existing `settlementAccountId` + `lines`). Total labels read from a new `t.documents` i18n group.
- Tests `useTaxPreview.test.tsx` and `InvoiceTotals.test.tsx` move to `src/features/documents/` (the latter renamed `DocumentTotals.test.tsx`, updated to pass `nature`).
- `InvoiceForm.tsx` updates its import to `@/features/documents/DocumentTotals` and renders `<DocumentTotals nature="SALE" …>`. `InvoiceLineRow.tsx` updates its `useTaxPreview`/`taxCalcSchema` imports if any. Sales-invoice behavior is unchanged and guarded by its existing tests. The 5 now-superseded `salesInvoices` total keys (`subtotal`, `ppn`, `pphWithheld`, `total`, `calculating`) are removed only after confirming no remaining references (grep); otherwise left in place.

### New module `src/features/purchase-bills/`

```
schema.ts             // purchaseBillSchema, billFormSchema/billLineFormSchema, payload types
hooks.ts              // purchaseBillsApi = createResourceHooks; usePostBill/useVoidBill = useDocumentAction
BillLineRow.tsx       // mirror of InvoiceLineRow; PURCHASE_KINDS = ['PPN_INPUT','PPH_PAYABLE']
BillForm.tsx          // mirror of InvoiceForm; vendor partner, AP settlement, DocumentTotals nature=PURCHASE, vendorInvoiceNo
BillEditorPage.tsx    // mirror of InvoiceEditorPage; readOnly when status !== DRAFT
columns.tsx           // buildBillColumns; role-gated row actions
PurchaseBillsPage.tsx // status-filtered list + partner join + unified post/void/delete confirm
```

Modify: `lib/query/keys.ts` (+`purchaseBills: createResourceKeys('purchaseBills')`), `lib/i18n/messages.id.ts` (+`documents` and `purchaseBills` groups, +`nav.purchaseBills`), `components/common/AppShell.tsx` (+nav item), `src/test/handlers.ts` (bill fixtures + CRUD + post/void). Routes: `src/app/routes/_app/purchase-bills.tsx` (layout `<Outlet/>`), `.index.tsx`, `.new.tsx`, `.$id.edit.tsx`.

### Schema (`schema.ts`) — tolerant, money via `moneyString`

`purchaseBillLineSchema`: `{ id, purchaseBillId (nullish), lineNo, description, accountId, quantity, unitPrice, amount, taxCodeIds }`.
`purchaseBillSchema`: mirrors `salesInvoiceSchema` with `billNumber`/`billRef`/`fiscalYear`/`vendorInvoiceNo` (all nullish), `partnerId`, `date`, `dueDate?`, `description?`, `status`, the six money fields + `amountPaid`/`outstanding`/`paymentStatus`, `journalEntryId`/`postedBy`/`postedAt` (nullish), `lines`.
`billLineFormSchema` / `billFormSchema`: same as the invoice form schemas (`partnerId` min1 'selectPartner', `date` min1 'required', `dueDate`, `description`, `lines` min1 'atLeastOneLine'; each line: description min1, accountId min1 'selectAccount', quantity numeric >0, unitPrice numeric, taxCodeIds) plus an optional `vendorInvoiceNo: z.string()`.
`PurchaseBillCreatePayload` = `{ partnerId, date, dueDate?, vendorInvoiceNo?, description?, lines:[{description, accountId, quantity, unitPrice, taxCodeIds}] }`; `PurchaseBillUpdatePayload = Partial<…>`.

### Hooks & lifecycle (`hooks.ts`)

```ts
export const purchaseBillsApi = createResourceHooks<PurchaseBill, PurchaseBillCreatePayload, PurchaseBillUpdatePayload>({
  key: 'purchaseBills', basePath: '/purchase-bills', itemSchema: purchaseBillSchema,
});
export const usePostBill = () => useDocumentAction({ key: 'purchaseBills', basePath: '/purchase-bills', action: 'post' });
export const useVoidBill = () => useDocumentAction({ key: 'purchaseBills', basePath: '/purchase-bills', action: 'void' });
```

Create/update draft via `purchaseBillsApi`; post/void via `useDocumentAction` (Idempotency-Key + list invalidate). All money math (line amount = `Money(qty)×price`; totals from `/tax/calculate`) stays in decimal — no floats.

## Components & data flow

`BillForm` (mirror of `InvoiceForm`):
- Header: `PartnerSelect filter="vendor"`, `date`, `dueDate`, `vendorInvoiceNo` (optional text), `description`.
- `apAccountId = accounts.data?.find((a) => a.code === '2-1000')?.id`.
- `useFieldArray` lines of `BillLineRow`; "add line" appends an empty line.
- `previewLines` (lines with an `accountId`, amount = `Money(qty)×price`) feed `<DocumentTotals nature="PURCHASE" settlementAccountId={apAccountId} lines={previewLines} />`.
- Submit builds the create/update payload (drops empty `dueDate`/`description`/`vendorInvoiceNo`); success → `toast.success(t.crud.saved)` + `onSaved()`; API error → `applyApiErrorToForm`.
- `readOnly` (non-DRAFT): banner (`readOnlyPosted`/`readOnlyVoid` + `billRef`), all inputs disabled, no Save, no add-line/remove.

`BillLineRow` (mirror of `InvoiceLineRow`): description, `AccountSelect`, quantity, unitPrice, `TaxCodeMultiSelect allowedKinds={['PPN_INPUT','PPH_PAYABLE']}`, computed line amount, remove button; `readOnly` disables all.

`columns.tsx` → `buildBillColumns(t, partnerName, handlers)`: `billRef` ("No.", `?? '—'`), partner (joined name), date (`formatDateID`), status `Badge`, `vendorInvoiceNo` (`?? '—'`), `total` (`MoneyText`), and a right-aligned actions cell:
- DRAFT → `Ubah` (Link to edit) + `Hapus` (RoleGate ACCOUNTANT/APPROVER/ADMIN) + `Posting` (RoleGate APPROVER/ADMIN).
- POSTED → `Lihat` (Link) + `Batalkan` (RoleGate APPROVER/ADMIN).
- VOID → `Lihat`.

`PurchaseBillsPage.tsx` (mirror of `SalesInvoicesPage`): status-filter buttons (ALL/DRAFT/POSTED/VOID — exact-name to avoid the "Posting"/"Diposting" collision class), partner-name join from `partnersApi.useList()`, search by `billRef`/vendor name, "Buat" new button (ACCOUNTANT+), and a unified `ConfirmDialog` driving post/void/delete. Post/void send `crypto.randomUUID()` as the Idempotency-Key and on error call `toastApiError` (SoD-distinct); delete uses plain `toast.error`.

`BillEditorPage.tsx` (mirror of `InvoiceEditorPage`): no `id` → create; with `id` → `purchaseBillsApi.useItem`, loading → `Skeleton`, error → `ErrorState`, `readOnly = item.data.status !== 'DRAFT'`.

### Routes & nav

`purchase-bills.tsx` (layout rendering `<Outlet/>`), `.index.tsx` (renders `PurchaseBillsPage`), `.new.tsx` (`BillEditorPage`), `.$id.edit.tsx` (`BillEditorPage id={id}`). `AppShell` nav gains `{ to:'/purchase-bills', label: t.nav.purchaseBills, icon: ReceiptText }` placed after Sales Invoices.

## States, roles, errors

- **Roles:** ACCOUNTANT+ create/edit/delete drafts; APPROVER/ADMIN post/void. Enforced client-side via `RoleGate` (server enforces too; a 403 surfaces through `toastApiError`).
- **SoD:** posting a bill you created (when SoD enabled) returns 403 `SEGREGATION_OF_DUTIES` → `toastApiError` shows the distinct SoD message.
- **Loading/error:** list via `DataTable` (loading + empty states); editor item via `Skeleton` + `ErrorState`; tax totals show a "calculating…" state while `/tax/calculate` is in flight.
- **Money:** never floats — line amount and any client-side sums use `Money`; server returns authoritative totals.

## i18n

- `documents` group: `subtotal`, `ppn`, `pphWithheld`, `total`, `calculating` (used by `DocumentTotals`).
- `purchaseBills` group mirroring `salesInvoices`, vendor-flavored: `title`, `newBill`, `editBill`, `view`, `partner` ("Vendor"), `selectPartner` ("Pilih vendor"), `vendorInvoiceNo` ("No. Faktur Vendor"), `date`, `dueDate`, `description`, line fields (`lineDescription`, `account`, `quantity`, `unitPrice`, `taxes`, `lineAmount`, `addLine`), `number` ("No."), `total`, statuses (`statusDraft`/`statusPosted`/`statusVoid`), `status`, actions (`post`="Posting", `void`="Batalkan", `view`="Lihat"), confirm copy (`confirmPostTitle`/`Desc`, `confirmVoidTitle`/`Desc`), read-only banners (`readOnlyPosted`/`readOnlyVoid`), validation reuse (`atLeastOneLine`, `required`, `selectAccount`), `saveDraft`. Plus `nav.purchaseBills` = "Faktur Pembelian".

## Testing

- **`schema.test.ts`** — `purchaseBillSchema` parses the reconciled draft + posted fixtures (keeps `billRef`/`vendorInvoiceNo`/line `purchaseBillId`, strips extras); `billFormSchema` rejects empty lines (`atLeastOneLine`) and missing partner (`selectPartner`).
- **`BillForm.test.tsx`** — renders the vendor `PartnerSelect`; adding + filling a line fires `/tax/calculate` with `nature:'PURCHASE'` and `settlementAccountId` = the AP account; submitting builds the PURCHASE create payload including `vendorInvoiceNo`; missing partner/lines blocks submit.
- **`BillForm.readonly.test.tsx`** — a POSTED bill renders read-only (inputs disabled, no Save, banner shows `billRef`).
- **`PurchaseBillsPage.test.tsx`** — lists bills with the partner join; ACCOUNTANT sees no "Posting"; APPROVER posts a draft (asserts an Idempotency-Key header); a 403 `SEGREGATION_OF_DUTIES` on post shows the SoD message; APPROVER voids a POSTED bill.
- **Moved/updated:** `src/features/documents/DocumentTotals.test.tsx` (passes `nature`, asserts subtotal/ppn/pph/total rows), `src/features/documents/useTaxPreview.test.tsx` (unchanged behavior). Sales-invoice suites must stay green after the import move.

MSW (`src/test/handlers.ts`): `purchaseBillFixtures()` (DRAFT bill, `billRef:null`, `vendorInvoiceNo`, line with `purchaseBillId`), GET list/item, POST create (returns a full valid DRAFT object), PATCH, DELETE, and `:id/post` / `:id/void` (return full POSTED/VOID objects, post → `billRef:"BILL/2026/000001"`, `billNumber:1`, `fiscalYear:2026`). The `/tax/calculate` stub already exists and is `nature`-agnostic.

## Out of scope (YAGNI)

- DISBURSEMENT payments against bills (separate slice; reuses the payments stack).
- Bill-to-PO matching, partial receipts, recurring bills, attachments.
- Editing posted bills (lifecycle is post/void only).
- Full generalization of the invoice/bill editor into one component (rejected in favor of an own-feature copy + shared tax core).

## Done criteria

- `/purchase-bills` lists bills (status filter, partner join, search), gated "Buat" for ACCOUNTANT+.
- Draft editor creates/updates bills against vendors, with PPN_INPUT/PPH_PAYABLE tax codes, AP settlement, live `/tax/calculate` totals (`nature:'PURCHASE'`), and an optional `vendorInvoiceNo`.
- Post/void with Idempotency-Key + SoD-distinct error toasts; role-gated (APPROVER/ADMIN); posted/void bills open read-only.
- Shared tax core lives in `src/features/documents/` and is consumed by both sales invoices and purchase bills; sales-invoice tests stay green.
- All money via `Money`/`MoneyText` (no floats); responses validated by the tolerant `purchaseBillSchema`.
- New tests pass; lint clean; build green.

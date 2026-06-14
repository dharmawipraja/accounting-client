# Disbursement Payments (Plan 5b) — Design Spec

**Status:** Approved
**Date:** 2026-06-14
**Plan:** 5b — Disbursement Payments (generalize the payments feature to pay vendors against open bills)

## Goal

Let users pay vendors: extend the existing RECEIPT-only payments feature to also handle `direction: DISBURSEMENT` — allocating a cash payment across a vendor's open purchase bills — completing the accounts-payable cash cycle started by Purchase Bills (Plan 5a).

## Context

The payments feature (`src/features/payments/`, Plan 4a) was built for receipts only, but its schema already models both directions. This plan generalizes the editor, list, and payload to be direction-aware; it adds no new lifecycle or schema infrastructure.

### Live-reconciled disbursement shape (API verified 2026-06-14, `/tmp/reconcile-disb.mjs`)

A temp vendor + posted bill were paid via a DISBURSEMENT payment, then voided. Findings:

- The existing `paymentSchema` parses disbursements unchanged: `direction: z.enum(['RECEIPT','DISBURSEMENT'])`, and `paymentAllocationSchema` already has both `salesInvoiceId` and `purchaseBillId` (nullish).
- **Create payload:** `{ direction:'DISBURSEMENT', partnerId:<vendor>, date, cashAccountId, description?, allocations:[{ purchaseBillId, amount }] }`. The persisted allocation returns `salesInvoiceId:null, purchaseBillId:<bill>, amount`.
- **Post** assigns `number:1`, `ref:"PAY-DSB/2026/000001"` (prefix **`PAY-DSB/`** vs receipt's `PAY-RCV/`), `fiscalYear:2026`, `journalEntryId`, and drives the allocated bill to `paymentStatus:PAID`, `outstanding:0`. SoD restored to `true` after the run.

### What is RECEIPT-hardcoded today (the surfaces to generalize)

- `useOpenInvoices(partnerId)` — sales invoices only.
- `AllocationTable` — prop typed `invoices: SalesInvoice[]`, reads `inv.invoiceRef`.
- `PaymentForm` — `PartnerSelect filter="customer"`, `useOpenInvoices`, seeds `amounts` from `a.salesInvoiceId`, `buildAllocations` maps to `{salesInvoiceId, amount}`, payload `direction:'RECEIPT'`.
- `PaymentCreatePayload` — `direction:'RECEIPT'` with `allocations:{salesInvoiceId, amount}[]`.
- `payments.new.tsx` / `PaymentEditorPage` — always create RECEIPT.
- `columns` / `PaymentsPage` — no direction column/filter; single "Buat" button → `/payments/new`.

## Architecture

**Approach (approved):** generalize the existing payments feature by a `direction` parameter — one `/payments` list (direction column + filter), one editor that switches partner filter / open-documents source / allocation key. No parallel feature; the schema and lifecycle are reused as-is. **Create UX (approved):** two list buttons ("Terima" / "Bayar") → `/payments/new?direction=RECEIPT|DISBURSEMENT`; direction is fixed per payment (set at create, read from the loaded payment on edit) — never toggled mid-edit.

### Normalized open documents — `useOpenDocuments(direction, partnerId)`

Replaces `useOpenInvoices`. Returns a neutral shape both sources map onto:

```ts
export interface OpenDocument { id: string; ref: string | null; dueDate: string | null; outstanding: string }
```

- `direction === 'RECEIPT'` → `salesInvoicesApi.useList()`, filter `status==='POSTED' && Money.from(outstanding).gt(0) && (!partnerId || partnerId===inv.partnerId)`, map `{ id, ref: invoiceRef ?? null, dueDate, outstanding }`, sort by date.
- `direction === 'DISBURSEMENT'` → `purchaseBillsApi.useList()`, same filter, map `{ id, ref: billRef ?? null, dueDate, outstanding }`, sort by date.

Both `useList` hooks are called unconditionally (React hook rules); only the direction's result is selected and mapped (cheap, both queries are cached). The existing `useOpenInvoices` is removed (its sole consumer is `PaymentForm`).

### Generalized `AllocationTable`

Prop renamed `invoices: SalesInvoice[]` → `documents: OpenDocument[]`. Cells read `doc.ref ?? '—'`, `doc.dueDate`, `doc.outstanding`, `doc.id`. The amount input's `aria-label` uses `doc.ref ?? doc.id`. Header label uses the neutral `t.payments.documentRef`. Empty state uses `t.payments.noOpenDocuments`. "Lunasi" (pay-full), per-row over-allocation error, and the `partnerSelected` guard are unchanged.

### Direction-parameterized `PaymentForm`

Adds a `direction: 'RECEIPT' | 'DISBURSEMENT'` prop. Effective direction `= payment?.direction ?? direction` (edit derives from the loaded payment; create uses the prop). It switches:

- partner filter: `RECEIPT ? 'customer' : 'vendor'`;
- documents: `useOpenDocuments(direction, partnerId)`;
- `amounts` seed: from `a.salesInvoiceId` (RECEIPT) or `a.purchaseBillId` (DISBURSEMENT);
- `buildAllocations`: maps each `amount>0` entry to `{ salesInvoiceId: id, amount }` (RECEIPT) or `{ purchaseBillId: id, amount }` (DISBURSEMENT);
- payload `direction`.

Header schema (partnerId/date/cashAccountId/description), the ≤-outstanding + ≥1-allocation validation, the read-only banner (`payment.ref`), `PaymentTotals`, and error wiring are unchanged. The partner field label stays neutral (`t.payments.partner`); the customer/vendor filter already restricts the dropdown.

### Generalized payload (`schema.ts`)

```ts
export type PaymentAllocationInput = { salesInvoiceId?: string; purchaseBillId?: string; amount: string };
export type PaymentCreatePayload = {
  direction: 'RECEIPT' | 'DISBURSEMENT';
  partnerId: string;
  date: string;
  cashAccountId: string;
  description?: string;
  allocations: PaymentAllocationInput[];
};
export type PaymentUpdatePayload = Partial<PaymentCreatePayload>;
```

`paymentSchema` / `paymentAllocationSchema` are unchanged (already general). `useOpenDocuments` imports `purchaseBillsApi` + `PurchaseBill` from `@/features/purchase-bills`.

## Components & data flow

`/payments/new?direction=DISBURSEMENT` → `payments.new.tsx` validates the search param → `<PaymentEditorPage direction="DISBURSEMENT">` → `<PaymentForm mode="create" direction="DISBURSEMENT">` → vendor `PartnerSelect` + `useOpenDocuments('DISBURSEMENT', vendorId)` (open bills) → `AllocationTable` → submit posts the DISBURSEMENT payload → list invalidates. Posting (from the list) assigns `PAY-DSB/...` and drives the bill to PAID. Editing/viewing a payment derives its direction from `payment.direction`.

### List (`PaymentsPage` + `columns`)

- **`columns`:** add a `direction` column rendering a `Badge` with `t.payments.directionReceipt`/`directionDisbursement`; generalize the total column header to a neutral `t.payments.amount` ("Jumlah"). `buildPaymentColumns(t, partnerName, accountName, handlers)` signature unchanged; `paymentTotal` (Money-sum of allocations) unchanged.
- **`PaymentsPage`:** add a direction filter (`ALL`/`RECEIPT`/`DISBURSEMENT`) alongside the status filter; `rows` filters by status **and** direction **and** search (`ref`/partner name). Header actions hold two gated buttons: **Terima** → `/payments/new?direction=RECEIPT`, **Bayar** → `/payments/new?direction=DISBURSEMENT`. Post/void/delete confirm + idempotency + `toastApiError` are unchanged.

### Routes

- `payments.new.tsx`: `validateSearch: (s) => ({ direction: s.direction === 'DISBURSEMENT' ? 'DISBURSEMENT' : 'RECEIPT' })`; `const { direction } = Route.useSearch()`; render `<PaymentEditorPage direction={direction} />`.
- `PaymentEditorPage`: accepts `direction?: 'RECEIPT'|'DISBURSEMENT'` (default `'RECEIPT'`); create title `direction==='DISBURSEMENT' ? t.payments.newDisbursementTitle : t.payments.newReceiptTitle`; passes `direction` to `PaymentForm`. Edit branch unchanged (PaymentForm derives direction from the item).
- `payments.$id.edit.tsx`: unchanged.

## States, roles, errors

- **Roles:** unchanged — ACCOUNTANT+ create/edit/delete drafts; APPROVER/ADMIN post/void (via `RoleGate`); SoD 403 → `toastApiError` distinct message.
- **Loading/error:** list via `DataTable` (+ skeleton/`ErrorState`); editor item via `Skeleton` + `ErrorState`; open-documents table shows the empty state when the partner has no open documents.
- **Money:** unchanged — allocation amounts and the payment total are `Money` decimals; no floats.
- **Validation:** ≥1 allocation and each amount ≤ the document's `outstanding`.

## i18n (`payments` group additions)

`directionReceipt: 'Terima'`, `directionDisbursement: 'Bayar'`, `direction: 'Jenis'`, `directionAll: 'Semua'`, `newReceiptTitle: 'Terima Pembayaran'`, `newDisbursementTitle: 'Bayar Tagihan'`, `documentRef: 'Dokumen'`, `noOpenDocuments: 'Tidak ada dokumen terbuka'`, `amount: 'Jumlah'`. (The existing `invoiceRef`/`noOpenInvoices` keys may remain unused or be removed if no other reference exists.)

## Testing

- **`useOpenDocuments.test.tsx`** (generalizes `useOpenInvoices.test`): RECEIPT returns the open POSTED sales invoices (outstanding>0, partner-filtered) mapped to `{id, ref, dueDate, outstanding}`; DISBURSEMENT returns the open POSTED purchase bills similarly. (MSW provides both lists.)
- **`PaymentForm.test.tsx`**: keep the RECEIPT create test (Lunasi → `{direction:'RECEIPT', allocations:[{salesInvoiceId, amount}]}`); **add a DISBURSEMENT create test** — vendor partner + one open bill (override `GET /purchase-bills` with a POSTED bill, outstanding>0) → click "Lunasi" → save posts `{direction:'DISBURSEMENT', allocations:[{purchaseBillId, amount}]}`. (Payments use controlled `amounts` state + "Lunasi", not `form.watch`, so the document-editor jsdom preview gotcha does not apply.)
- **`PaymentsPage.test.tsx`**: a list mixing a receipt and a disbursement → the direction filter narrows to one; the direction badge renders; both create buttons (Terima/Bayar) are present for ACCOUNTANT+. The existing post/idempotency/SoD/void tests continue to pass (they use receipts).
- **MSW:** the payments CRUD + post/void handlers already exist. Disbursement tests override `GET /purchase-bills` to return a POSTED bill with outstanding>0 (the default fixture is a DRAFT). No new permanent handlers required.

## Out of scope (YAGNI)

- Multi-currency, partial-bill scheduling, payment batches/runs, bank reconciliation.
- A direction toggle inside the editor (direction is fixed per payment).
- Disbursements against anything other than purchase bills (e.g. expense claims).

## Done criteria

- `/payments` lists both receipts and disbursements with a direction badge + a direction filter; two gated create buttons (Terima/Bayar).
- The editor, parameterized by direction, pays a vendor by allocating across open POSTED bills (≤ outstanding, ≥1), posting `{direction:'DISBURSEMENT', allocations:[{purchaseBillId, amount}]}`.
- Post/void reuse `useDocumentAction` (idempotency + SoD-distinct toasts); posted/void payments open read-only with the `PAY-DSB/...` ref.
- `useOpenDocuments` serves both directions from the right source; all money via `Money`/`MoneyText` (no floats); `paymentSchema` unchanged.
- New + existing tests pass; lint clean; build green.

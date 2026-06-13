# Plan 4a — Payments (Receipt) — Design

**Date:** 2026-06-13
**Status:** Approved (brainstorming) — ready for implementation planning
**Depends on:** Plans 1–3 (merged to `main`). Reuses `createResourceHooks`, `useDocumentAction`,
`toastApiError`, `applyApiErrorToForm`, `PartnerSelect`, `AccountSelect`, `MoneyInput`/`MoneyText`,
`ConfirmDialog`, `RoleGate`, `DataTable`, the read-only-editor pattern, and the `salesInvoices` feature
(for open invoices). Plan 4 splits into **4a (Payments, this doc)** and **4b (Dashboard, next)**.

## 1. Goal

Build customer **receipts**: a full-page editor that allocates a received amount across a partner's
open (POSTED, outstanding>0) sales invoices, plus the draft→post→void lifecycle (reusing the invoice
machinery). Completes the AR cycle (invoice → receive payment). DISBURSEMENT (against purchase bills)
is out of scope — there are no purchase bills yet; it reuses this stack later.

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Allocation UX | **Manual per-invoice amount + "Lunasi" (pay-full) shortcut**, each validated ≤ outstanding |
| Editor surface | **Full-page route** (`/payments/new`, `/payments/:id/edit`), read-only for non-drafts |
| Open-invoice sourcing | **Client-side derivation** from `salesInvoicesApi.useList()` (POSTED + outstanding>0 + partner) |
| Lifecycle | **Reuse `useDocumentAction`/`toastApiError`** (post/void, idempotency, SoD) |
| Scope | **RECEIPT only** |

## 3. API surface

- **CreatePaymentDto:** `{ direction: 'RECEIPT' | 'DISBURSEMENT', partnerId, date, cashAccountId,
  description?, allocations: AllocationDto[] }`. **AllocationDto:** `{ salesInvoiceId?, purchaseBillId?,
  amount }`. For a receipt, allocations carry `salesInvoiceId`. The payment total = **sum of
  allocations** (no separate amount field). "A payment must allocate its full amount against open
  documents."
- Endpoints: `GET /payments` (bare array), `GET /payments/:id`, `POST /payments` (ACCOUNTANT+),
  `POST /payments/:id/post` (APPROVER/ADMIN), `POST /payments/:id/void` (APPROVER/ADMIN),
  `DELETE /payments/:id` (ACCOUNTANT+ draft).
- **Payment response shape is reconciled at build** (payments is empty now): the first task creates a
  posted invoice + a receipt (via the SoD-toggle setup used in 3b) to capture the real `Payment` shape
  (status enum DRAFT/POSTED/VOID, `paymentNumber`/ref, total field, `allocations` shape,
  `journalEntryId`, postedBy/At), then cleans up and restores `segregationOfDutiesEnabled=true`.

## 4. Architecture

### 4.1 Schema & hooks — `src/features/payments/`
- `paymentSchema` (item, reconciled at build; tolerant) + create/edit form/payload types.
- `paymentsApi = createResourceHooks<Payment, PaymentCreatePayload, PaymentUpdatePayload>({ key:'payments', basePath:'/payments', itemSchema })`.
- `usePostPayment = useDocumentAction({ key:'payments', basePath:'/payments', action:'post' })`;
  `useVoidPayment = useDocumentAction({ ..., action:'void' })`.
- Query keys: `queryKeys.payments`.

### 4.2 Open invoices — `src/features/payments/useOpenInvoices.ts`
`useOpenInvoices(partnerId?: string): SalesInvoice[]` — from `salesInvoicesApi.useList()`, returns
invoices where `status === 'POSTED'` && `Money.from(outstanding).gt(Money.zero())` &&
(`!partnerId || partnerId === inv.partnerId`), sorted by `date`. Decimal compare — never float.

### 4.3 Lifecycle & idempotency (reused, no new infra)
Identical to sales invoices: the list owns post/void/delete confirm state with a per-action
`crypto.randomUUID()` idempotency key; `usePostPayment`/`useVoidPayment`; `toastApiError` routes
`403 SEGREGATION_OF_DUTIES` distinctly. Posted/void payments render read-only in the editor.

### 4.4 Routing & i18n
- `_app/payments.tsx` (layout `<Outlet/>`), `payments.index.tsx` (list), `payments.new.tsx`,
  `payments.$id.edit.tsx` — same flat-routing structure as sales-invoices.
- A `payments` i18n group (title, newPayment, cashAccount, allocation columns, "Lunasi"/payFull,
  totalReceived, noOpenInvoices, overAllocated, atLeastOneAllocation, status/post/void/view copy,
  read-only banners, posted/voided toasts).

## 5. The receipt editor (full-page)

- **`PaymentEditorPage`** — loads the draft via `paymentsApi.useItem(id)` (edit) or blank (new);
  renders `PaymentForm`; navigates to `/payments` on save/cancel; passes `readOnly` for non-DRAFT.
- **`PaymentForm`** — RHF + zod for the **header**: `PartnerSelect` (filter `customer`), `DateField`
  date, `AccountSelect` cashAccountId, description. **Allocations** are controlled local state
  `Record<invoiceId, string>` (amounts), since the rows come from the async `useOpenInvoices(partnerId)`.
- **`AllocationTable`** — rows from `useOpenInvoices(partnerId)`: invoiceRef, due date, outstanding
  (`MoneyText`), an amount `MoneyInput`, and a **"Lunasi"** button (sets the amount to the full
  outstanding). Empty state (`noOpenInvoices`) when the partner has none.
- **`PaymentTotals`** — **Total Diterima** = `Money`-sum of entered allocation amounts.
- **Validation (submit):** partner + date + cashAccount required (zod); **≥1 allocation with amount > 0**
  (`atLeastOneAllocation`); **each amount ≤ that invoice's outstanding** (decimal compare; inline
  `overAllocated` per row). Server errors via `applyApiErrorToForm`.
- **Save** → `paymentsApi.useCreate`/`useUpdate` with `{ direction:'RECEIPT', partnerId, date,
  cashAccountId, description: description||undefined, allocations: rows.filter(amount>0).map(({invoiceId,amount}) => ({ salesInvoiceId: invoiceId, amount })) }`.
- **Read-only mode** (`readOnly`): disabled header fields + amount inputs, no "Lunasi"/Save, a banner
  (posted/void), totals still shown.

## 6. The list — Pembayaran

- **`PaymentsPage`** — `DataTable`: No./Ref (`paymentNumber`/ref ?? '—'), Partner (joined from
  `partnersApi`), Tanggal, Akun Kas (joined from `accountsApi` by `cashAccountId`), Total
  (`MoneyText`), Status badge, actions. Search + status filter (All/Draft/Posted/Void), client-side.
- **Row actions:** DRAFT → Ubah + Hapus (ACCOUNTANT+) + Posting (APPROVER/ADMIN); POSTED → Lihat +
  Batalkan (APPROVER/ADMIN); VOID → Lihat. Confirm + idempotency + `toastApiError`. "Pembayaran Baru"
  (ACCOUNTANT+) → `/payments/new`.

## 7. Testing

- **`useOpenInvoices` (TDD):** filters to POSTED + outstanding>0 + matching partner; excludes
  DRAFT/VOID/zero-outstanding/other-partner.
- **`PaymentForm` integration (MSW):** pick partner → open invoices listed; "Lunasi" fills the
  outstanding; total sums; **over-allocation blocks submit (inline error)**; **no allocation blocks
  submit**; successful save posts `{ direction:'RECEIPT', allocations:[{salesInvoiceId, amount}] }`.
- **`PaymentsPage` integration (MSW):** list + status filter; role-gating (ACCOUNTANT no Posting;
  APPROVER/ADMIN Post/Void); post sends an idempotency key; `403 SEGREGATION_OF_DUTIES` distinct;
  void on posted.
- **Read-only:** a POSTED payment opens read-only (disabled, banner, no Save).
- MSW: payments CRUD + post/void handlers; sales-invoices fixtures incl. a POSTED open invoice
  (outstanding>0) for allocation.
- **Build-time reconciliation** of the `Payment` response schema + status enum (SoD-toggle + posted
  invoice + receipt), then cleanup + restore SoD.

## 8. Definition of done

- ACCOUNTANT+ create/edit/delete draft receipts: pick a customer, allocate across open invoices
  (manual amounts + "Lunasi", each ≤ outstanding, total = sum), save.
- APPROVER/ADMIN post (idempotent, SoD-guarded) and void; `403 SEGREGATION_OF_DUTIES` distinct;
  posted/void open read-only.
- The list filters by status; partner + cash-account names joined; money decimal end-to-end.
- `Payment` schema reconciled live; green tests; `pnpm lint && pnpm build` clean.

## 9. Out of scope (later)

Purchase bills + DISBURSEMENT payments (reuse this stack with `direction:'DISBURSEMENT'`); Dashboard
(Plan 4b); the six report screens; journals register; periods/year-end; audit; company settings.

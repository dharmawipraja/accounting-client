# Plan 3b — Sales Invoice Post / Void / Approval — Design

**Date:** 2026-06-13
**Status:** Approved (brainstorming) — ready for implementation planning
**Depends on:** Plan 3a (editor + drafts), merged to `main`. Reuses `salesInvoicesApi`,
`createResourceHooks`, `ConfirmDialog`, `RoleGate`, `DataTable`, `apiFetch` (idempotency support),
`applyApiErrorToForm`, the `InvoiceForm` editor, MSW infra.
**Parent spec:** `docs/superpowers/specs/2026-06-13-sales-invoices-design.md`.

## 1. Goal

Complete the sales-invoice lifecycle: APPROVER/ADMIN **post** a draft (idempotent, segregation-of-duties
guarded) and **void** a posted invoice from the list, with confirm dialogs; posted/void invoices open
**read-only** in the editor. Introduces the reusable `useDocumentAction` (post/void/reverse with an
`Idempotency-Key`) and `toastApiError` (SoD-aware) that purchase bills, payments, and journals reuse.

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| View posted/void detail | **Reuse the editor in read-only mode** (no new page) |
| Idempotency | Per-action `crypto.randomUUID()` held in the page's confirm state, reused on retry |
| Confirm UX | Reuse `ConfirmDialog` (no new component); page owns post/void confirm state |

## 3. Live reconciliation findings (verified — SoD toggled off then restored to true)

- **`POST /sales-invoices/:id/post`** → 200, returns the **full invoice** with:
  - `status: "POSTED"`, `invoiceNumber: 1` (**a number**, assigned on post; `null` for drafts),
    `invoiceRef: "INV/2026/000001"` (human-readable), `fiscalYear`, `journalEntryId`, `postedBy`,
    `postedAt`. Idempotency-Key header accepted.
- **`POST /sales-invoices/:id/void`** → 200, returns the full invoice with `status: "VOID"`
  (`journalEntryId` retained — the reversal).
- **SoD is ENABLED** and there is a single user, so the creator self-posting always returns
  `403 SEGREGATION_OF_DUTIES`. Successful posting requires a different APPROVER/ADMIN.
- **2026 periods are all OPEN** (no closed-period blocker for posting).

### 3a schema corrections (load-bearing — a posted invoice currently fails to parse)
The 3a `salesInvoiceSchema` declared `invoiceNumber: z.string().nullish()`; it only ever saw `null`
(drafts), but posted invoices return a **number**. Fix in 3b:
- `invoiceNumber: z.number().nullish()`
- add `invoiceRef: z.string().nullish()` (the list's "No. Faktur" column displays `invoiceRef`)
- add `postedBy: z.string().nullish()`, `postedAt: z.string().nullish()`, `journalEntryId: z.string().nullish()`

## 4. Architecture

### 4.1 `useDocumentAction` — `src/lib/crud/useDocumentAction.ts`
```ts
useDocumentAction<TResult = unknown>({ key, basePath, action }: { key: string; basePath: string; action: string }):
  UseMutationResult<TResult, ApiError, { id: string; idempotencyKey: string }>
// mutationFn: apiFetch(`${basePath}/${id}/${action}`, { method: 'POST', idempotencyKey })
// onSuccess: queryClient.invalidateQueries({ queryKey: [key] })
```
`src/features/sales-invoices/hooks.ts` adds:
```ts
usePostInvoice() = useDocumentAction({ key: 'salesInvoices', basePath: '/sales-invoices', action: 'post' });
useVoidInvoice() = useDocumentAction({ key: 'salesInvoices', basePath: '/sales-invoices', action: 'void' });
```
(`apiFetch` already sets the `Idempotency-Key` header from `opts.idempotencyKey` — Plan 1.)

### 4.2 `toastApiError` — `src/lib/api/toastApiError.ts`
```ts
toastApiError(error: unknown, t: Messages): void
```
- non-`ApiError` → `toast.error(t.common.error)`.
- `403` + code `SEGREGATION_OF_DUTIES` → `toast.error(t.roles.segregationOfDuties)`.
- `403` → `toast.error(t.roles.forbidden)`.
- `409` + code `CLOSED_PERIOD` → `t.crud.closedPeriod`; `CLOSED_YEAR` → `t.crud.closedYear`.
- else → `toast.error(error.message || t.common.error, { description: traceId ? `${t.common.reference}: ${traceId}` : undefined })`.

### 4.3 Idempotency in the page
`SalesInvoicesPage` holds `action: { kind: 'post' | 'void'; invoice: SalesInvoice; idempotencyKey: string } | null`.
Opening a post/void confirm generates the key once (`crypto.randomUUID()`); confirm calls
`usePostInvoice/useVoidInvoice.mutate({ id, idempotencyKey })`; the same key is reused if the dialog
stays open and the user retries after a transient error.

## 5. Status- & role-aware row actions (list)

`columns.tsx` actions cell (extends 3a's Edit + Delete), driven by `status` + role + callbacks the page
provides (`onEdit` is a Link; `onDelete`/`onPost`/`onVoid`/`onView` are callbacks):

| Status | Action | Role | Result |
|---|---|---|---|
| DRAFT | Ubah (edit) | ACCOUNTANT+ | Link → `/sales-invoices/:id/edit` |
| DRAFT | Hapus (delete) | ACCOUNTANT+ | ConfirmDialog → `useRemove` (3a) |
| DRAFT | Posting (post) | APPROVER/ADMIN | ConfirmDialog (idempotency) → `usePostInvoice` |
| POSTED | Lihat (view) | any | Link → `/sales-invoices/:id/edit` (read-only) |
| POSTED | Batalkan (void) | APPROVER/ADMIN | ConfirmDialog (idempotency) → `useVoidInvoice` |
| VOID | Lihat (view) | any | Link → read-only editor |

Errors via `toastApiError` (so `403 SEGREGATION_OF_DUTIES` reads distinctly from a plain forbidden).
The Draft status filter (3a) is the approval queue.

## 6. Read-only view (reuse editor)

- `InvoiceForm` gains `readOnly?: boolean`: disables all inputs/selects, hides Add-line / Remove-line /
  Save, and shows a banner (`t.salesInvoices.readOnlyPosted` or `readOnlyVoid`). The `InvoiceTotals`
  panel still renders (informational).
- `InvoiceEditorPage` (edit mode) passes `readOnly={invoice.status !== 'DRAFT'}`. The list "Lihat"
  action navigates to the same edit route, which renders read-only for non-drafts.
- The banner surfaces `invoiceRef` and posted-by/at. (Journal drill-down is out of scope.)

## 7. i18n

- `salesInvoices`: `post` ("Posting"), `void` ("Batalkan"), `view` ("Lihat"),
  `confirmPostTitle`/`confirmPostDesc`, `confirmVoidTitle`/`confirmVoidDesc`, `posted` (toast),
  `voided` (toast), `readOnlyPosted`/`readOnlyVoid` banners.
- `crud`: `closedPeriod`, `closedYear`.
- (`roles.segregationOfDuties`, `roles.forbidden` already exist from Plan 1.)

## 8. MSW

Extend the sales-invoice handlers: `POST /sales-invoices/:id/post` and `/:id/void` return a full
invoice (`status` POSTED/VOID, `invoiceNumber` number, `invoiceRef` string). Provide a way for a test
to force the post handler to return `403 SEGREGATION_OF_DUTIES` (e.g. a per-test `server.use` override).

## 9. Testing

- **`useDocumentAction` (TDD):** POSTs to `/:id/:action` with an `Idempotency-Key` header; invalidates
  the resource list on success.
- **`toastApiError` (TDD):** SoD vs forbidden vs closed-period vs generic+traceId branches.
- **List integration (MSW):**
  - APPROVER/ADMIN see **Posting** on DRAFT rows; ACCOUNTANT does **not** (only Edit/Delete).
  - Post confirm fires `usePostInvoice` with an idempotency key (assert the header sent); success
    invalidates the list.
  - **Post returning `403 SEGREGATION_OF_DUTIES` surfaces the distinct SoD message.**
  - POSTED row shows **Batalkan** (APPROVER/ADMIN) + **Lihat**; void confirm fires `useVoidInvoice`.
- **Editor read-only (MSW):** loading a POSTED invoice renders disabled inputs + the read-only banner +
  no Save button.
- Schema test updated: a POSTED invoice (`invoiceNumber: 1`, `invoiceRef: "INV/2026/000001"`) parses.

## 10. Definition of done

- APPROVER/ADMIN post (idempotent) and void invoices from the list with confirm dialogs;
  `403 SEGREGATION_OF_DUTIES` distinct; ACCOUNTANT cannot post/void.
- Posted/void invoices open read-only in the editor (disabled inputs, banner, no Save).
- `invoiceNumber`→number + `invoiceRef` schema fix in; the list "No. Faktur" shows `invoiceRef`.
- `useDocumentAction` + `toastApiError` built, tested, reusable.
- Green test suite; `pnpm lint && pnpm build` clean. **Plan 3 complete.**

## 11. Out of scope (later plans)

Journal drill-down from a posted invoice; purchase bills (nature PURCHASE, reusing the editor stack);
payments + dashboard (Plan 4); reports; periods/year-end management; audit log; company settings editor.

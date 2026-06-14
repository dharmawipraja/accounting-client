# Journals + Approval Queue (Plan 6) — Design Spec

**Status:** Approved
**Date:** 2026-06-14
**Plan:** 6 — Journals (manual journal entries, the paginated register, post/reverse lifecycle, and the DRAFT approval queue)

## Goal

Add the general-journal surface: a paginated journal register of all ledger entries, a balanced manual-entry editor, the post/reverse/delete-draft lifecycle, and a DRAFT approval queue (the register filtered to `status=DRAFT`, where APPROVER/ADMIN post drafts).

## Context

This is the first feature consuming `GET /ledger/journal-entries` — the **only paginated endpoint** (`{ data, total, limit, offset }`). The lifecycle infrastructure (`useDocumentAction`, `toastApiError`, `applyApiErrorToForm`, `RoleGate`, `ConfirmDialog`, `DataTable`, `AccountSelect`, `MoneyInput`/`MoneyText`, `Money`) is reused; the genuinely new pieces are a paginated list hook, a balanced debit/credit editor, and the list-vs-detail schema split.

### Live-reconciled shapes (API verified 2026-06-14, `/tmp/reconcile-je.mjs` + `-je2.mjs`)

A manual entry was created, posted, and reversed; a `GET /:id` and a list page were read; the stray draft was deleted; SoD restored.

- **Lifecycle:** `POST /ledger/journal-entries` create DRAFT (ACCOUNTANT+); `POST /:id/post` (APPROVER/ADMIN); `POST /:id/reverse` (APPROVER/ADMIN); `DELETE /:id` delete DRAFT (ACCOUNTANT+). **No `PATCH`** — drafts are not editable (fix = delete + recreate). Post/reverse accept an optional `Idempotency-Key`.
- **Balance is enforced at POST, not create:** an unbalanced entry is accepted as a DRAFT (`201`); posting an unbalanced draft returns `422 UNBALANCED_ENTRY`. (The editor therefore enforces balance client-side so it never creates an unpostable draft.)
- **Create/post/reverse responses OMIT `lines`.** Only `GET /:id` includes them.
- **Detail shape** (`GET /:id`): `{ id, entryNumber (null→13), entryRef (null→"JE/2026/000013"), fiscalYear (null→2026), date, periodId (null→assigned on post), description, sourceType, sourceId, status, reversalOfId, reversedById, createdBy, postedBy, postedAt, …, lines: [{ id, journalEntryId, lineNo, accountId, debit, credit, description }] }`. `debit`/`credit` are money strings, sometimes integer-form (`"100000"`, `"0"`).
- **List item** (paginated `data[]`) is a DIFFERENT, lightweight projection: `{ id, entryRef, entryNumber, fiscalYear, date, description, status, sourceType, sourceId, totalDebit, lineCount }` — **no `lines`**, but carries `totalDebit` + `lineCount`.
- **Post** assigns `entryNumber`/`entryRef` (`JE/2026/NNNNNN`) + `fiscalYear` + `periodId` + `status:POSTED` + `postedBy`/`postedAt`.
- **Reverse** creates a NEW POSTED entry (`sourceType:"REVERSAL"`, `reversalOfId`→original) and sets the original's `reversedById`→the reversal. Statuses observed: `DRAFT`, `POSTED` (no separate REVERSED status). `sourceType` values: `MANUAL`, `REVERSAL`, and auto (`SALE`/`PURCHASE`/`PAYMENT`) for document-generated entries.
- **Envelope:** `GET /ledger/journal-entries?status=&sourceType=&from=&to=&limit=&offset=` → `{ data, total, limit, offset }`.

## Architecture

**Approval queue (approved):** a single `/journals` register with a status filter; `status=DRAFT` IS the approval queue (DRAFT rows expose Post/Hapus, POSTED rows expose Lihat/Balikkan). **Reverse scope (approved):** only `POSTED` entries with `sourceType==='MANUAL'` show a Reverse action (auto-generated entries are reversed via their source document's Void, to avoid AR/AP subledger desync; the server still guards double-reverse). **Scope:** the full feature in one plan; the lifecycle infra already exists, only the paginated list + balanced editor are new.

### New module `src/features/journals/`

```
schema.ts             // line/detail/list-item/page schemas, form schemas, create payload
balance.ts            // pure Money totals + isBalanced (testable)
hooks.ts              // useJournalEntries (paginated), useJournalEntry (detail), create/delete, post/reverse
JournalLineRow.tsx    // account + debit/credit (mutually exclusive) + description + remove
JournalTotals.tsx     // running total debit / total credit / difference + balanced indicator
JournalEntryForm.tsx  // create-only balanced editor; Save gated on balance
JournalEntryEditorPage.tsx // /journals/new (create) | /journals/$id (read-only detail)
columns.tsx           // register columns + status/source/role-gated row actions
JournalsPage.tsx      // paginated register + filters + pagination + post/reverse/delete confirm
```

New shared: `src/components/common/Pagination.tsx` (the one paginated-list control). Modify: `src/lib/query/keys.ts` (+`journalEntries` keys), `src/lib/i18n/messages.id.ts` (+`journals` group, +`nav.journals`), `src/components/common/AppShell.tsx` (+nav item), `src/test/handlers.ts` (replace the stub journal-entries handler with a real paginated one + detail/create/delete/post/reverse). Routes: `journals.tsx` (layout `<Outlet/>`), `.index.tsx`, `.new.tsx`, `.$id.tsx`.

### Schemas (`schema.ts`) — tolerant; money via `moneyString`

`moneyString` already accepts integer-form strings (`/^-?\d+(\.\d{1,4})?$/` matches `"100000"`/`"0"`).

- `journalLineSchema`: `{ id: z.string(), journalEntryId: z.string().nullish(), lineNo: z.number(), accountId: z.string(), debit: moneyString, credit: moneyString, description: z.string().nullish() }`.
- `journalEntrySchema` (detail): `{ id, entryNumber: number nullish, entryRef: string nullish, fiscalYear: number nullish, date, periodId: string nullish, description, sourceType, sourceId: string nullish, status, reversalOfId: string nullish, reversedById: string nullish, postedBy: nullish, postedAt: nullish, lines: journalLineSchema.array() }`.
- `journalEntryListItemSchema`: `{ id, entryRef: nullish, entryNumber: nullish, fiscalYear: nullish, date, description, status, sourceType, sourceId: nullish, totalDebit: moneyString, lineCount: z.number() }`.
- `journalEntriesPageSchema`: `z.object({ data: journalEntryListItemSchema.array(), total: z.number(), limit: z.number(), offset: z.number() })`.
- `journalLineFormSchema`: `{ accountId: z.string().min(1,'selectAccount'), debit: z.string(), credit: z.string(), description: z.string() }`.
- `journalEntryFormSchema`: `{ date: z.string().min(1,'required'), description: z.string().min(1,'required'), lines: journalLineFormSchema.array().min(2,'atLeastTwoLines') }`.
- `JournalEntryCreatePayload = { date: string; description: string; lines: { accountId: string; debit?: string; credit?: string; description?: string }[] }`.

### Balance helper (`balance.ts`)

Pure functions over the form lines (`{ accountId, debit, credit }`), money-safe:
- `sumSide(lines, side: 'debit'|'credit'): Money` — sums the chosen side (`Money.from(v||'0')`).
- `balanceOf(lines): { totalDebit: Money; totalCredit: Money; difference: Money }` (difference = debit − credit).
- `isBalanced(lines): boolean` — `totalDebit.eq(totalCredit) && totalDebit.gt(Money.zero())`.

### Hooks (`hooks.ts`)

Hand-built (createResourceHooks assumes a bare-array list + a single item schema; journal-entries is paginated with a distinct list shape):

```ts
export function useJournalEntries(params): UseQueryResult<JournalEntriesPage, ApiError>  // GET list, schema page
export function useJournalEntry(id: string): UseQueryResult<JournalEntry, ApiError>       // GET /:id, schema detail, enabled !!id
export function useCreateJournalEntry(): mutation(JournalEntryCreatePayload → JournalEntry)
export function useDeleteJournalEntry(): mutation(id → unknown)
export const usePostJournalEntry   = () => useDocumentAction({ key:'journalEntries', basePath:'/ledger/journal-entries', action:'post' });
export const useReverseJournalEntry= () => useDocumentAction({ key:'journalEntries', basePath:'/ledger/journal-entries', action:'reverse' });
```

`params = { status?: string; sourceType?: string; from?: string; to?: string; limit: number; offset: number }`; query strips `undefined`. Create/delete invalidate `queryKeys.journalEntries.all`. `queryKeys.journalEntries = { all:['journalEntries'], list:(params)=>['journalEntries','list',params], item:(id)=>['journalEntries','item',id] }`.

## Components & data flow

**`JournalEntryForm`** (create-only): RHF + `journalEntryFormSchema`; `useFieldArray` lines (default two empty `{accountId:'',debit:'',credit:'',description:''}`); "Tambah baris" appends; each `JournalLineRow` renders `AccountSelect` + two `MoneyInput`s where entering a **debit** clears that line's **credit** and vice-versa (mutually exclusive) + a description input + remove. `JournalTotals` shows `balanceOf(watchedLines)` (total debit, total credit, difference) and a balanced/unbalanced flag. **Save is disabled unless `isBalanced(lines)` and the form is valid** (≥2 lines, date + description present). Submit builds the payload from the **non-empty lines only** (those with a debit or credit > 0), each contributing `{ accountId, description?, ...(Money.from(debit||'0').gt(Money.zero()) ? { debit } : { credit }) }`, and calls `useCreateJournalEntry`; success → `toast.success` + `onSaved()`; API errors → `applyApiErrorToForm`. (`isBalanced` already guarantees ≥1 debit line and ≥1 credit line with equal, positive totals, so the filtered payload always has ≥2 lines.)

**`JournalEntryEditorPage`**: `/journals/new` → `<JournalEntryForm onSaved={goRegister}>`; `/journals/$id` → `useJournalEntry(id)`, loading→`Skeleton`, error→`ErrorState`, else a **read-only detail**: header (entryRef/date/description/status/sourceType) + a lines table (account name, debit, credit, description) — no edit controls.

**`columns`** → `buildJournalColumns(t, accountName, handlers)`: `entryRef` (`?? '—'`), date (`formatDateID`), description, `sourceType` (`Badge` via a label map), status (`Badge`), `totalDebit` (`MoneyText`), `lineCount`, and a right-aligned actions cell:
- DRAFT → `Lihat` (Link to `/journals/$id`) + `Hapus` (RoleGate ACCOUNTANT/APPROVER/ADMIN) + `Posting` (RoleGate APPROVER/ADMIN).
- POSTED → `Lihat` + (`sourceType==='MANUAL'` ? `Balikkan` (RoleGate APPROVER/ADMIN) : nothing).

**`JournalsPage`**: state `{ status, sourceType, offset }` (limit constant = 20); `useJournalEntries({ status: status==='ALL'?undefined:status, sourceType: sourceType==='ALL'?undefined:sourceType, limit, offset })`. Status filter (ALL/DRAFT/POSTED — DRAFT = the approval queue), sourceType filter (ALL/MANUAL). `<Pagination offset limit total={page.total} onChange={setOffset}>`. "Buat Jurnal" (RoleGate ACCOUNTANT+) → `/journals/new`. A unified `ConfirmDialog` drives post/reverse/delete with `crypto.randomUUID()` Idempotency-Key; post/reverse `onError` → `toastApiError` (SoD- and UNBALANCED_ENTRY-distinct), delete → plain `toast.error`. Changing any filter resets `offset` to 0.

**`Pagination`** (`components/common/Pagination.tsx`): props `{ offset, limit, total, onChange }`. Renders "Menampilkan {offset+1}–{min(offset+limit,total)} dari {total}" + Prev/Next buttons (`disabled` at bounds; `onChange(offset±limit)`).

## States, roles, errors

- **Roles:** ACCOUNTANT+ create/delete drafts; APPROVER/ADMIN post/reverse. Enforced client-side via `RoleGate` (server enforces too).
- **Unbalanced:** the editor blocks Save until balanced; if a post still returns `422 UNBALANCED_ENTRY`, `toastApiError` surfaces it. SoD 403 likewise.
- **Loading/error:** register via `DataTable` (+ skeleton/`ErrorState`); detail via `Skeleton` + `ErrorState`.
- **Money:** never floats — debit/credit sums and totals via `Money`; server returns authoritative totals.

## i18n (`journals` group) + nav

Titles (`title` "Jurnal", `newEntry` "Jurnal Baru", `view`), columns (`entryRef` "No.", `date`, `description`, `sourceType` "Sumber", `status`, `totalDebit` "Total Debit", `lineCount` "Baris"), line fields (`account`, `debit` "Debit", `credit` "Kredit", `lineDescription`, `addLine`, `removeLine`, `selectAccount`), totals (`totalDebitLabel`, `totalCreditLabel`, `difference` "Selisih", `balanced`/`unbalanced`), validation (`atLeastTwoLines`, `unbalancedEntry`, `required`), statuses (`statusAll`/`statusDraft`/`statusPosted`), sourceType labels (`sourceAll`, `sourceManual` "Manual", `sourceReversal` "Pembalik", `sourceSale` "Penjualan", `sourcePurchase` "Pembelian", `sourcePayment` "Pembayaran"), actions (`post` "Posting", `reverse` "Balikkan", `view` "Lihat"), confirm copy (`confirmPostTitle`/`Desc`, `confirmReverseTitle`/`Desc`), `saveEntry` "Simpan", pagination (`paginationShowing`, `prev`, `next`). Plus `nav.journals` = "Jurnal". `AppShell` nav gains `{ to:'/journals', label: t.nav.journals, icon: NotebookText }` after Accounts.

## Testing

- **`schema.test.ts`** — `journalEntryListItemSchema` parses a list item (totalDebit/lineCount, no lines); `journalEntrySchema` parses the detail (with lines); `journalEntriesPageSchema` parses the envelope; `journalEntryFormSchema` rejects <2 lines and missing date/description.
- **`balance.test.ts`** — `balanceOf`/`isBalanced`: balanced (100k debit / 100k credit → true), unbalanced (100k / 50k → false), all-zero (false).
- **`JournalEntryForm.test.tsx`** — fill two lines (one debit 100000, one credit 100000) across two accounts → Save enabled → posts `{date, description, lines:[{accountId, debit:'100000'},{accountId, credit:'100000'}]}`; an unbalanced state (debit only) keeps Save disabled; a single line keeps Save disabled.
- **`JournalsPage.test.tsx`** — renders a paginated page (envelope `{data,total,limit,offset}`); the DRAFT filter shows `Posting` for APPROVER and not for ACCOUNTANT; `Pagination` "Next" requests the next `offset` (assert the request query); APPROVER posts a draft (asserts an Idempotency-Key header); APPROVER reverses a MANUAL POSTED entry; a `422 UNBALANCED_ENTRY` on post surfaces via `toastApiError`.
- **MSW:** replace the stub `GET /ledger/journal-entries` with a real handler that honors `status`/`limit`/`offset` and returns `{ data: listItems, total, limit, offset }`; add `GET /:id` (detail with lines), `POST` (create draft, returns detail without lines), `DELETE /:id`, `POST /:id/post` (status POSTED + entryRef), `POST /:id/reverse` (returns the REVERSAL entry). `journalEntryListFixture()` + `journalEntryDetailFixture()`.

## Out of scope (YAGNI)

- Editing posted entries or drafts (no `PATCH`; fix = delete + recreate).
- Reversing auto-generated (SALE/PURCHASE/PAYMENT) entries from the journals UI (use the source document's Void).
- `?post=true` create-and-post in one call (create then post separately).
- General-ledger / trial-balance report screens (separate slice).
- Making the dashboard "Jurnal Draft" card link to `/journals` (a possible small follow-up; the destination now exists in nav).
- Server-side search, column sorting, CSV export.

## Done criteria

- `/journals` lists all entries paginated (Prev/Next + count), with status (incl. DRAFT = approval queue) and sourceType filters; gated "Buat Jurnal" for ACCOUNTANT+; nav entry present.
- The balanced editor creates manual draft entries (≥2 lines, debits = credits > 0, per-line debit-XOR-credit), posting `{date, description, lines:[…]}`; Save is disabled until balanced.
- Post/reverse/delete from the register reuse `useDocumentAction`/mutations with Idempotency-Key + SoD/UNBALANCED-distinct toasts; reverse only on MANUAL posted entries; role-gated.
- `useJournalEntries` consumes the paginated envelope; `useJournalEntry` serves the detail with lines; list and detail use their distinct schemas; all money via `Money`/`MoneyText`.
- New + existing tests pass; lint clean; build green.

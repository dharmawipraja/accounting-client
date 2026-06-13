# Plan 2 — Chart of Accounts + Partners + Tax Codes — Design

**Date:** 2026-06-13
**Status:** Approved (brainstorming) — ready for implementation planning
**Depends on:** Plan 1 (Foundation & Auth Shell), merged to `main`. Reuses `apiFetch`/`ApiError`,
`useSession`/`RoleGate`, `DataTable`, `FormDialog`-style shadcn `Form`, `useT`/i18n, Zod schemas,
React Query, MSW test infra.
**Spec context:** `docs/superpowers/specs/2026-06-12-indonesian-accounting-client-design.md`.

## 1. Goal

Fill the three master-data routes (`/accounts`, `/partners`, `/tax-codes`) with the **role-gated CRUD
pattern**: list (bare array) → create/edit dialog → ADMIN soft-delete. These three domains are ~80%
identical, so we extract the identical part (data/cache/error logic) into a small shared layer and
hand-write the parts that differ (account tree + dependent fields; tax rate + account picker; partner
customer/vendor flags). This also establishes the **reusable mutation-error handling** the foundation
spec promised (§5.5), which later plans reuse.

## 2. Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| CRUD strategy | **Share data layer, bespoke UI** | Data/cache/error logic is identical across the three; the UIs diverge enough that a generic form engine would fight the differences |
| COA presentation | **Flat table grouped by type** | Seeded COA is shallow; accountants scan by code; simpler than tree state |
| Account form | **Subtype-driven, auto-derive** | User picks subtype → form sets type + defaults normalBalance (editable for contra-accounts); prevents `422 INVALID_ACCOUNT` |
| Soft-delete UX | **Deactivate primary, Delete secondary** | Row "Nonaktifkan" is the main ADMIN action; hard "Hapus" in overflow with stronger confirm |

## 3. API surface (from `openapi.json` + the frontend guide)

All three share the same verb pattern; `basePath` differs.

| Domain | basePath | list | create (ACCOUNTANT+) | update (ACCOUNTANT+) | deactivate (ADMIN) | delete (ADMIN) |
|---|---|---|---|---|---|---|
| Accounts | `/ledger/accounts` | GET (bare array) | POST | PATCH `/:id` | POST `/:id/deactivate` | DELETE `/:id` |
| Partners | `/partners` | GET (bare array) | POST | PATCH `/:id` | POST `/:id/deactivate` | DELETE `/:id` |
| Tax codes | `/tax/codes` | GET (bare array) | POST | PATCH `/:id` | POST `/:id/deactivate` | DELETE `/:id` |

Request DTOs (the create/edit field asymmetry is load-bearing):

- **CreateAccountDto:** `code*`, `name*`, `type*` (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE),
  `subtype*` (EQUITY, REVENUE, CURRENT_ASSET, NON_CURRENT_ASSET, FIXED_ASSET,
  ACCUMULATED_DEPRECIATION, CURRENT_LIABILITY, NON_CURRENT_LIABILITY, COGS, OPERATING_EXPENSE,
  OTHER_INCOME, OTHER_EXPENSE, TAX_PAYABLE, TAX_RECEIVABLE), `normalBalance*` (DEBIT/CREDIT),
  `cashFlowCategory` (OPERATING/INVESTING/FINANCING/NONE), `isPostable`, `parentCode`.
  **UpdateAccountDto:** `name`, `cashFlowCategory`, `isActive` only.
- **CreateBusinessPartnerDto:** `code*`, `name*`, `npwp`, `email`, `phone`, `address`,
  `isCustomer`, `isVendor`. **UpdateBusinessPartnerDto:** same minus `code`, plus `isActive`.
- **CreateTaxCodeDto:** `code*`, `name*`, `kind*` (PPN_OUTPUT/PPN_INPUT/PPH_PAYABLE/PPH_PREPAID),
  `rate*` (string), `taxAccountId*` (uuid). **UpdateTaxCodeDto:** `name`, `rate`, `isActive` only.

**Responses are untyped in OpenAPI** → item Zod schemas are hand-authored and reconciled against the
live API (see §4.6).

## 4. Architecture

### 4.1 Shared data layer — `src/lib/crud/createResourceHooks.ts`

```ts
createResourceHooks<TItem, TCreate, TUpdate>({
  key: string;          // query-key root, e.g. 'accounts'
  basePath: string;     // e.g. '/ledger/accounts'
  itemSchema: ZodType<TItem>;
}): {
  useList():       UseQueryResult<TItem[]>;        // GET basePath, parsed itemSchema.array()
  useItem(id):     UseQueryResult<TItem>;          // GET basePath/:id
  useCreate():     UseMutationResult<TItem, ApiError, TCreate>;        // POST basePath
  useUpdate():     UseMutationResult<TItem, ApiError, {id; data: TUpdate}>; // PATCH basePath/:id
  useDeactivate(): UseMutationResult<unknown, ApiError, {id}>;         // POST basePath/:id/deactivate
  useRemove():     UseMutationResult<unknown, ApiError, {id}>;         // DELETE basePath/:id
}
```

Every mutation invalidates the resource's list key (and item key) on success. Query-key factories are
added to `src/lib/query/keys.ts`: `queryKeys.accounts`, `.partners`, `.taxCodes` (each with `.all`,
`.list()`, `.item(id)`).

### 4.2 Reusable mutation-error handling — `src/lib/api/form-errors.ts`

`applyApiErrorToForm(error: unknown, form: UseFormReturn, t): void`:

- `ApiError.details.errors[]` (class-validator messages) → best-effort RHF field errors (match the
  leading field token in each message to a form field name); unmatched messages become a `root` error.
- `409 CONFLICT` → `form.setError('code', …)` ("Kode sudah dipakai").
- `403 FORBIDDEN` → toast (defensive; UI already role-gates).
- `422 VALIDATION_FAILED` / `INVALID_ACCOUNT` → `root` error / toast with the server message.
- anything else (incl. network) → toast with `message` + `traceId` ("Ref: …").

This is the spec's §5.5 error mapper. **`SEGREGATION_OF_DUTIES` is NOT handled here** — these CRUD
endpoints have no post/approve flow; SoD lands in Plan 3 (documents).

### 4.3 Light shared UI — `src/components/common/`

Per the "bespoke UI" decision, only small bricks are shared (no config-driven form engine):

- **`FormDialog`** — Dialog scaffold (title, body slot, Cancel/Submit, pending state). Each feature
  supplies its own fields and submit handler.
- **`ConfirmDialog`** — wraps a new shadcn `alert-dialog`; owns destructive-action copy + pending state.
- **`RowActions`** — RoleGate-aware row menu: "Ubah" (ACCOUNTANT+); "Nonaktifkan" primary + "Hapus"
  in overflow (ADMIN). Calls the relevant mutations through callbacks.
- **`AccountSelect`** — searchable account picker (drives the Tax Code `taxAccountId`; reused by
  journal/invoice lines in later plans). Built as a **combobox** (shadcn `popover` + `command`) over
  `accounts.useList()`, filtering to postable, active accounts and showing `code — name`.

New shadcn primitives added: `alert-dialog`, `checkbox`, `switch`, `popover`, `command`.

### 4.4 Per-feature structure

```
src/features/<accounts|partners|tax-codes>/
  schema.ts          # Zod item schema + create/edit form schemas (zod)
  hooks.ts           # createResourceHooks(...) + any feature-specific hook
  columns.tsx        # DataTable column defs
  <X>FormDialog.tsx  # create/edit form (RHF + zod resolver) inside FormDialog
  <X>Page.tsx        # list + toolbar (search, "Baru") + dialogs + RowActions
```
Existing placeholder routes (`src/app/routes/_app/accounts.tsx`, `partners.tsx`, `tax-codes.tsx`)
render `<XPage/>`.

### 4.5 i18n

Extend `src/lib/i18n/messages.id.ts`:
- `crud` — shared toasts/confirms ("Tersimpan", "Dinonaktifkan", "Dihapus", "Hapus permanen?",
  "Kode sudah dipakai", "Baru", "Ubah", "Nonaktifkan", "Hapus", "Cari…").
- `accounts`, `partners`, `taxCodes` — labels + enum display names (type/subtype/normalBalance/
  cashFlowCategory; partner Pelanggan/Pemasok; tax kind PPN Keluaran/Masukan, PPh Terutang/Dibayar
  di Muka).

### 4.6 Response schemas — reconcile against the live API

`VITE_API_BASE_URL` is already set in `.env` to a reachable live API. First implementation task:
`GET` each list against it, capture the real item shape, and write/adjust the Zod item schemas
accordingly (e.g. `parentCode` vs `parentId`, timestamps, nested `taxAccount`). Schemas stay strict
on the fields we use; unknown extra fields are tolerated. No money fields here except the account
balance endpoint, which is out of scope (§5.1).

## 5. Features

### 5.1 Chart of Accounts (`features/accounts`)

- **List:** flat `DataTable` ordered by `code`, sectioned by type — Aset / Liabilitas / Ekuitas /
  Pendapatan / Beban. Columns: Code, Name, Subtype, Normal balance (Debit/Kredit badge), Postable?,
  Status. Header / non-postable rows (`N-0000`, `isPostable=false`) styled muted. Search by code/name.
- **Create form (subtype-driven):** user picks **Subtype** → `account-meta.ts` derives `type` and
  defaults `normalBalance` (editable for contra-accounts, e.g. ACCUMULATED_DEPRECIATION = ASSET/CREDIT).
  Plus code, name, cashFlowCategory (default NONE), isPostable (default true), parentCode (optional
  select of header accounts).
- **Edit form:** only `name`, `cashFlowCategory`, `isActive` (per UpdateAccountDto); code/type/
  subtype/normalBalance read-only.
- **Roles:** create/edit ACCOUNTANT+; deactivate + delete ADMIN.
- **Balances deferred:** `/:id/balance` and whole-chart balances belong to the trial-balance report
  (later plan); kept out of the list to avoid N+1 calls.
- **`account-meta.ts`:** static map `subtype → { type, defaultNormalBalance }` for all 14 subtypes,
  plus display labels. Single source of truth for the form's auto-derive and the list's badges.

### 5.2 Partners (`features/partners`)

- **List:** `DataTable` — Code, Name, NPWP, type badges (Pelanggan/Pemasok), Status. Search by code/name.
- **Form:** code (create-only), name, npwp, email, phone, address, isCustomer, isVendor, isActive(edit).
  Client validation: **at least one of Customer/Vendor** checked; email format; NPWP optional with a
  light format check (15–16 digits, separators tolerated).
- **Roles:** create/edit ACCOUNTANT+; deactivate + delete ADMIN.

### 5.3 Tax Codes (`features/tax-codes`)

- **List:** `DataTable` — Code, Name, Kind badge (PPN Keluaran/Masukan, PPh Terutang/Dibayar di Muka),
  **Rate as %**, Tax account (name), Status. Search by code/name.
- **Form:** code, name, kind, **rate**, taxAccountId (`AccountSelect`). Create-only: code/kind/
  taxAccountId; edit allows name/rate/isActive.
- **Rate handling (confirmed):** `rate` is a `Decimal(9,6)` **fraction** string — e.g. `"0.110000"`
  for 11% PPN — alongside `code`, `name`, `kind`. The form shows a **percent** input (user types `11`),
  stores the fraction at 6 dp (`"0.110000"`), and displays `11%`. A small `rate.ts` helper does
  percent⇄fraction on strings at 6 dp (decimal.js, no float); round-trip sanity-checked against
  `POST /tax/calculate`.
- **Roles:** create/edit ACCOUNTANT+; deactivate + delete ADMIN.

### 5.4 Inactive visibility

Show active records by default. Add an "include inactive" filter **only if** the live `GET` returns
inactive rows (determined during §4.6 reconciliation). If the API drops them on deactivate, the filter
is omitted and that is noted in the feature.

## 6. Testing

- **Unit:** `createResourceHooks` (list parse; create/update/deactivate/remove → list invalidation,
  via MSW); `applyApiErrorToForm` (field mapping, 409→`code` field, 403→toast, generic→toast+traceId);
  `account-meta` subtype→{type,defaultNormalBalance} for all 14 subtypes; tax `rate` percent⇄fraction
  on strings (incl. edge cases like `11` → `"0.11"`, `0` → `"0"`).
- **Integration per feature (MSW):** list renders + COA grouping; create flow (open dialog → fill →
  submit → invalidate → success toast); **role-gating** (VIEWER: no row/toolbar actions; ACCOUNTANT:
  create/edit but no deactivate/delete; ADMIN: all); **409 duplicate code** → inline `code` field
  error; account subtype auto-derive (pick CURRENT_ASSET → type ASSET, normalBalance DEBIT; pick
  ACCUMULATED_DEPRECIATION → ASSET/CREDIT default); partner "at least one of customer/vendor" blocks
  submit; tax `AccountSelect` lists accounts.
- MSW handlers extended (`src/test/handlers.ts`) with accounts/partners/tax-codes list + CRUD fixtures
  (success, 409 duplicate, 403 forbidden).

## 7. Definition of done

- `/accounts`, `/partners`, `/tax-codes` live with role-gated create/edit + ADMIN deactivate/delete.
- `createResourceHooks` + `applyApiErrorToForm` implemented, tested, and used by all three features.
- Zod item schemas reconciled against the live API (`VITE_API_BASE_URL` in `.env`); tax `rate` stored
  as a `Decimal(9,6)` fraction string via the percent⇄fraction helper.
- COA grouped table + subtype-driven form; partner customer/vendor validation; tax rate as percent.
- Defensive `403 FORBIDDEN` handled on every mutation; UI role-gated throughout.
- Green test suite (units + per-feature integration); `pnpm lint && pnpm build` clean.

## 8. Out of scope (later plans)

Account balances / trial balance (report plan); journals + approval queue; sales invoices; purchase
bills; payments; SoD enforcement (Plan 3 documents); company settings; audit log; the six report
screens. `AccountSelect` built here is reused by those plans.

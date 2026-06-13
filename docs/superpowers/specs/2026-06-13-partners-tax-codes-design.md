# Plan 2b — Partners + Tax Codes — Design

**Date:** 2026-06-13
**Status:** Approved (brainstorming) — ready for implementation planning
**Parent spec:** `docs/superpowers/specs/2026-06-13-accounts-partners-tax-codes-design.md` (Plan 2; §4.3 AccountSelect, §4.6 reconciliation, §5.2 Partners, §5.3 Tax Codes).
**Depends on:** Plan 2a (shared CRUD layer + Chart of Accounts), merged to `main`. Reuses
`createResourceHooks` (`src/lib/crud`), `applyApiErrorToForm` (`src/lib/api/form-errors.ts`),
`FormDialog`/`ConfirmDialog`/`RowActions`/`StatusBadge`, `DataTable`, `RoleGate`, the i18n `crud`
group, and the accounts feature as the template (`src/features/accounts`).

## 1. Goal

Fill the `/partners` and `/tax-codes` routes with the role-gated CRUD pattern from Plan 2a, and build
the two reusable pieces they need: `AccountSelect` (a searchable account combobox) and a string-only
tax `rate` helper. The Zod item schemas were **reconciled live against the running API during design**
(see §2), so this build inherits the verified shapes.

## 2. Live reconciliation findings (verified against the API at `VITE_API_BASE_URL`)

Logged in with the seeded admin and `GET`-ed each list. Real shapes:

- **Account** (`GET /ledger/accounts`, bare array, 28 rows incl. non-postable headers like `1-0000`):
  `{ id, code, name, type, subtype, cashFlowCategory, normalBalance, parentId, isPostable, isActive,
  currency, createdAt, updatedAt, deletedAt, deletedBy }`.
  - **The item field is `parentId` (uuid | null), NOT `parentCode`.** Plan 2a's `accountSchema`
    declared `parentCode` (which silently never populated). **Correct it to `parentId` in 2b**
    (the *create payload* keeps `parentCode` — that is the `CreateAccountDto` field).
  - The list includes header (`isPostable: false`) and all active accounts.
- **TaxCode** (`GET /tax/codes`, bare array, 6 rows):
  `{ id, code, name, kind, rate, taxAccountId, isActive, createdAt, updatedAt, deletedAt, deletedBy }`.
  - `rate` is a **decimal fraction string** — e.g. `"0.02"` for PPh 23 @ 2%. (The API normalizes the
    scale; sending `"0.11"` is accepted.)
  - **There is no nested `taxAccount` object — only `taxAccountId`.** The Tax Codes list must join the
    accounts list to display the account name.
- **Partner** (`GET /partners`, bare array): **empty seed (0 rows)** — shape could not be sampled.
  Inferred from `CreateBusinessPartnerDto` + the common envelope both other resources share; verified
  on the first created partner. Tolerant schema (unknown keys stripped) de-risks any mismatch.

## 3. Reconciled Zod schemas

- **`accountSchema` (correction in `src/features/accounts/schema.ts`):** item field `parentCode` →
  `parentId: z.string().nullish()`. `accountCreateSchema` keeps `parentCode` (create DTO). Update the
  matching MSW account fixture to use `parentId`. No UI change (accounts don't display parent).
- **`partnerSchema`:** `{ id, code, name, npwp?, email?, phone?, address?, isCustomer: boolean,
  isVendor: boolean, isActive: boolean }` (nullish on the optional strings; extra keys stripped).
- **`taxCodeSchema`:** `{ id, code, name, kind, rate: string, taxAccountId: string, isActive: boolean }`
  with `kind` ∈ `PPN_OUTPUT | PPN_INPUT | PPH_PAYABLE | PPH_PREPAID`.

## 4. Shared additions

### 4.1 `AccountSelect` — `src/components/common/AccountSelect.tsx`
Searchable **combobox** (shadcn `popover` + `command`) over `accountsApi.useList()`:
- Filters to **`isPostable && isActive`** (excludes header rows and inactive accounts).
- Each option shows `code — name`; the selected value is the account **`id`**.
- Props: `{ value?: string; onChange: (id: string) => void; disabled?: boolean; placeholder?: string }`.
- Reused later by journal/invoice lines, so it stays generic (no tax-specific filtering).

### 4.2 Tax `rate` helper — `src/features/tax-codes/rate.ts`
String-only, decimal.js-backed (no floats):
- `percentToFraction(percent: string): string` — `"11" → "0.11"`, `"2.5" → "0.025"`, `"0" → "0"`.
- `fractionToPercent(fraction: string): string` — `"0.02" → "2"`, `"0.110000" → "11"`.
- `formatRatePercent(fraction: string): string` — `"0.02" → "2%"` (trims trailing zeros).

## 5. Features

Each mirrors the accounts feature layout:
`src/features/<partners|tax-codes>/{schema.ts, hooks.ts, columns.tsx, <X>FormDialog.tsx, <X>Page.tsx}`,
with the existing placeholder route rendering the page. Query keys: `queryKeys.partners`, `.taxCodes`
(via `createResourceKeys`).

### 5.1 Partners (`features/partners`, basePath `/partners`)
- **List:** `DataTable` — Code, Name, NPWP, type badges (Pelanggan/Pemasok from `isCustomer`/`isVendor`),
  Status. Search by code/name. Empty seed → `EmptyState` until the first partner exists.
- **Form (`PartnerFormDialog`):** code (create-only), name, npwp, email, phone, address, isCustomer,
  isVendor, isActive (edit). Validation (zod): **at least one of isCustomer/isVendor** (`.refine`),
  email format when present, NPWP optional with a lenient 15–16-digit check (strip dots/dashes first).
- **Roles:** create/edit ACCOUNTANT+; deactivate + delete ADMIN. Errors via `applyApiErrorToForm`.

### 5.2 Tax Codes (`features/tax-codes`, basePath `/tax/codes`)
- **List:** `DataTable` — Code, Name, Kind badge (PPN Keluaran/Masukan, PPh Terutang/Dibayar di Muka),
  **Rate as %** (`formatRatePercent`), **Tax account** (the page also calls `accountsApi.useList()` and
  resolves `taxAccountId` → `code — name`; shows the id or a dash if not found), Status. Search.
- **Form (`TaxCodeFormDialog`):** code, name, kind, **rate** (percent input; `percentToFraction` on
  submit, `fractionToPercent` to seed the edit form), taxAccountId (`AccountSelect`). Create-only:
  code/kind/taxAccountId; edit: name/rate/isActive.
- **Roles:** same as partners.

## 6. i18n & MSW

- Extend `src/lib/i18n/messages.id.ts` with `partners` (labels, Pelanggan/Pemasok, validation strings)
  and `taxCodes` (labels, rate, taxAccount, the four kind display names) groups. Reuse `crud`.
- Extend `src/test/handlers.ts`: partners list/CRUD fixtures (incl. 409 duplicate) and tax-codes
  list/CRUD fixtures (rate as a fraction string; `taxAccountId` pointing at a seeded account id so the
  join renders). Update the existing account fixture from `parentCode` to `parentId`.

## 7. Testing

- **`AccountSelect` (TDD):** renders only postable+active accounts (excludes `1-0000` header and
  inactive), filters by typed text, selecting an option calls `onChange` with the account `id`.
- **`rate.ts` (TDD):** the conversions in §4.2 incl. edge cases (`'2.5'`, `'0'`, `'0.110000'`); string
  in/out, no float drift.
- **Partners integration (MSW):** list + empty state; create flow (open → fill → submit → invalidate →
  toast); **≥1 customer/vendor** blocks submit with an inline error; role-gating (VIEWER none /
  ACCOUNTANT create-edit / ADMIN all); 409 duplicate code → inline `code` error.
- **Tax Codes integration (MSW):** list renders rate-as-% and the **joined account name**; create flow
  picks an account via `AccountSelect` and submits the fraction (`percentToFraction`); role-gating.
- Radix `Select`/`Popover`/`Command` tests use the jsdom shims already in `src/test/setup.ts` +
  `userEvent.setup({ pointerEventsCheck: 0 })`, querying options via `findByRole('option', …)`.

## 8. Definition of done

- `/partners` and `/tax-codes` live with role-gated create/edit + ADMIN deactivate/delete.
- `AccountSelect` (postable+active filter) and `rate.ts` (string-only fraction⇄percent) built and tested.
- Schemas reconciled: `accountSchema` uses `parentId`; `taxCodeSchema` joins accounts for the name;
  rate handled as a fraction string end-to-end.
- Partner customer/vendor validation; tax rate-as-percent input.
- Green test suite; `pnpm lint && pnpm build` clean.

## 9. Out of scope (later plans)

Reports / balances / trial balance, journals + approval queue, sales invoices, purchase bills, payments,
SoD enforcement (Plan 3), company settings, audit log.

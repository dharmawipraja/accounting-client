# Enum / label single-source seam — design

**Date:** 2026-06-30
**Source:** Architecture review (post six-card arc), card 3 of that review — "the account enum/label single-source seam and the wider i18n enum-value leaks." Deferred out of the master-data deepening (cards 1+2) as a separate, non-bundled concern.
**Decided via:** brainstorming (converged; scope and two user-visible reconciliations settled below).

## Summary

Three coupled instances of the same smell — *one concept defined or labeled in many places, free to drift*:

1. **Account enum values are defined twice in our code.** `src/features/accounts/schema.ts` declares the zod enums (`accountTypeSchema`, `normalBalanceSchema`, `cashFlowCategorySchema`, `accountSubtypeSchema`); `src/features/accounts/account-meta.ts` re-declares the same unions by hand (`AccountType`, `NormalBalance`, `AccountSubtype`, `CashFlowCategory`). Nothing keeps the two in sync. (`src/types/api.d.ts` is OpenAPI-generated — the API contract, not our seam — and is left untouched.)
2. **Subtype labels exist twice and already disagree.** Hardcoded Indonesian lives in `SUBTYPE_META[].label` (`account-meta.ts`, bypassing `useT()`) and again in `t.reports.subtype` (`messages.id.ts`). Five members have mismatched wording (table below).
3. **Enum→label logic is ad-hoc and leaks raw enums to the UI.** `cashFlowCategory` and `normalBalance` render as raw enum strings in the account form / general-ledger header; journal `sourceType` maps `SALE`/`PURCHASE` while the live API emits `SALES_INVOICE`/`PURCHASE_BILL` (unmapped values fall through to the raw string); document `status` label logic is copy-pasted across four feature files.

Establish **one enum-label seam**: enum *values* defined once (zod, with `z.infer` types), all *labels* in `messages.id.ts`, reached through a small set of pure, **exhaustive** value→label helpers. Then apply the seam to the clear cross-cutting leaks in scope.

## Scope

**In:** account enums (`type`, `subtype`, `normalBalance`, `cashFlowCategory`); the shared enum-label helper pattern; and these cross-cutting applications — document `status` (4× duplication), journal `sourceType` (API-mismatch fix), and the `cashFlowCategory`/`normalBalance` account-UI leaks.

**Out:** aging-bucket strings (`reports`), audit HTTP-method labels, and role labels — they share the smell but are deferred (not bundled, per the chosen scope).

## Module A — single source for account enum values

In `src/features/accounts/schema.ts`, export inferred types alongside the existing zod enums:

```ts
export type AccountType = z.infer<typeof accountTypeSchema>;
export type NormalBalance = z.infer<typeof normalBalanceSchema>;
export type CashFlowCategory = z.infer<typeof cashFlowCategorySchema>;
export type AccountSubtype = z.infer<typeof accountSubtypeSchema>;
```

`account-meta.ts` **deletes** its four hand-written union aliases and imports these from `./schema`. The zod enums become the single source of account enum values; the inferred types are the single source of the TS unions.

`SUBTYPE_META` is retained — but **only as derivation metadata** (`subtype → { type, defaultNormalBalance }`), which is domain logic, not presentation. Its `label` field is **removed** (labels move to i18n, Module B). `ACCOUNT_TYPE_ORDER`, `SUBTYPE_OPTIONS`, the `subtype → type/normalBalance` derivation effect in `AccountCreateFields`, and `account-meta.test.ts` continue to work against the now-imported types.

## Module B — one label home + exhaustive helpers

**Labels live in `messages.id.ts` only.** Add a canonical account-enum block and remove the duplicate:

- `accounts.subtype.*` — one entry per `AccountSubtype` member (canonical wording per the reconciliation table below).
- `accounts.cashFlow.*` — `OPERATING` / `INVESTING` / `FINANCING` / `NONE` (no keys exist today; this fixes the leak).
- Reuse the existing `accounts.typeAset…typeBeban` and `accounts.debit`/`accounts.credit`.
- **Remove `reports.subtype`** (and its report-only `CURRENT_EARNINGS` extra — see note); the balance sheet uses the shared helper.

**Helpers** — pure functions taking `t: Messages`, each backed by a `Record<EnumValue, …>` so a newly added enum member is a **compile-time error** (satisfies the workspace exhaustive-switch rule without a runtime fallthrough). Homes follow the existing feature layout:

- In `account-meta.ts`: `accountTypeLabel(t, type)`, `subtypeLabel(t, subtype)`, `cashFlowCategoryLabel(t, cat)`, `normalBalanceLabel(t, nb)`.
- In `src/features/documents/`: `documentStatusLabel(t, status)` — over `DRAFT | POSTED | VOID | REVERSED`.
- In `src/features/journals/`: `journalSourceLabel(t, sourceType)` — over the full API enum.

Consumers replace their inline maps/ternaries/`statusLabel()` functions with these helpers:
- `AccountsPage` `TYPE_LABEL` → `accountTypeLabel`; `columns.tsx` subtype cell + `SUBTYPE_OPTIONS` rendering → `subtypeLabel`; `normalBalance` cell → `normalBalanceLabel`.
- `AccountFormDialog` cash-flow select (create + edit) → `cashFlowCategoryLabel`; GL header → `normalBalanceLabel`.
- `BalanceSheetPage` `subtypeLabel.ts` → the shared `subtypeLabel` (the old `src/features/reports/subtypeLabel.ts` is deleted).

## Module C — cross-cutting leak fixes (deliberate user-visible changes)

These are the **intentional** behavior changes, flagged like prior cards:

1. **`cashFlowCategory` / `normalBalance` no longer leak.** The account create/edit cash-flow selects and the GL `normalBalance` header now render labels via the helpers instead of raw enum strings (`NONE`, `DEBIT`, …).

2. **Subtype labels reconciled to one canonical set.** The account chart and the balance sheet now read the *same* `accounts.subtype.*` block, so the five historical mismatches resolve to one wording. Settled canonical values:

   | Subtype | `SUBTYPE_META.label` (old) | `t.reports.subtype` (old) | **Canonical** |
   |---|---|---|---|
   | `CURRENT_LIABILITY` | Liabilitas Jangka Pendek | Utang Lancar | **Liabilitas Jangka Pendek** |
   | `NON_CURRENT_LIABILITY` | Liabilitas Jangka Panjang | Utang Jangka Panjang | **Liabilitas Jangka Panjang** |
   | `TAX_RECEIVABLE` | Pajak Dibayar di Muka | Pajak Dibayar Dimuka | **Pajak Dibayar di Muka** |
   | `OTHER_INCOME` | Pendapatan Lain-lain | Pendapatan Lain | **Pendapatan Lain-lain** |
   | `OTHER_EXPENSE` | Beban Lain-lain | Beban Lain | **Beban Lain-lain** |

   (Rationale: the `SUBTYPE_META` wording is the more precise accounting term; it is what the chart-of-accounts table shows today, so the chart is unchanged and only the balance-sheet section headers shift to match.)

3. **Document status: 4× → 1 helper.** The duplicated `statusLabel()` in `sales-invoices/columns.tsx`, `purchase-bills/columns.tsx`, `payments/columns.tsx`, and the inline journal status, all collapse to `documentStatusLabel` over a shared `documents.statusDraft/statusPosted/statusVoid/statusReversed` block. The per-feature `statusDraft/statusPosted/statusVoid` keys (identical strings) are removed; filter option arrays reference the helper. **Displayed strings are unchanged** (pure de-duplication). Journals keep `Draft/Posted/Reversed`; the others keep `Draft/Posted/Void`.

4. **Journal `sourceType` API mismatch fixed.** `journalSourceLabel` covers the real API enum — `MANUAL | OPENING | REVERSAL | SALES_INVOICE | PURCHASE_BILL | PAYMENT | CLOSING` — replacing the partial `SALE`/`PURCHASE` map that fell through to raw strings on live data. MSW fixtures (`handlers.ts`) move from `SALE` → `SALES_INVOICE` so tests exercise the real values. New i18n keys added for `OPENING`/`CLOSING` (`journals.sourceOpening`, `journals.sourceClosing`); existing source keys reused/renamed to match (`sourceSale` → applies to `SALES_INVOICE`, `sourcePurchase` → `PURCHASE_BILL`).

## How it composes

`schema.ts` (values) → `account-meta.ts` (types + derivation + account label helpers) → feature columns/pages/dialogs (consume helpers). `messages.id.ts` is the only label store. The document/journal helpers live with their features and are imported by the relevant columns/pages. No new top-level lib module is introduced — helpers co-locate with the data they describe.

## Migration (the churn)

- **A:** add `z.infer` exports to `schema.ts`; delete duplicate unions in `account-meta.ts`; drop `SUBTYPE_META.label`.
- **B:** add `accounts.subtype.*` + `accounts.cashFlow.*` to `messages.id.ts`; remove `reports.subtype`; add the helpers; rewire `AccountsPage`, accounts `columns.tsx`, `AccountFormDialog`, `BalanceSheetPage`; delete `reports/subtypeLabel.ts`.
- **C:** add `documents.status*`; `documentStatusLabel` + `journalSourceLabel`; rewire the four document `columns.tsx`/pages and journals; remove per-feature status keys; update MSW journal fixtures.
- **Unchanged:** routes / nav labels / form-field names / aria-labels; `api.d.ts`; money; the master-data and Document modules from prior cards.

## Testing

- **New helper tests:** `accountTypeLabel`/`subtypeLabel`/`cashFlowCategoryLabel`/`normalBalanceLabel` (every member → expected label), `documentStatusLabel` (all four states), `journalSourceLabel` (all seven API values, incl. `SALES_INVOICE`/`PURCHASE_BILL`/`OPENING`/`CLOSING`).
- **Regression net:** existing suites stay green **except** (a) any assertion on the reconciled subtype text (the 5 rows above) and (b) journal fixtures/labels moving `SALE` → `SALES_INVOICE`. Update those assertions to the canonical values; no other behavioral assertions change. `account-meta.test.ts` updated for the dropped `label` field.
- **Gate:** `pnpm run build` (real `tsc -b && vite build`) + `pnpm test --run` + `pnpm run lint` (0 errors / 8 pre-existing warnings). `pnpm run build` is the real typecheck.

## Global constraints (carried into the plan)

- Behavior-preserving **except** the settled changes in Module C (cashFlow/normalBalance no longer leak; 5 subtype labels reconciled; journal source now labels real API values). No other user-facing change; routes / nav labels / form-field names / aria-labels unchanged.
- i18n via `useT()` — all copy through `t.*`, no hardcoded user-facing strings (this card *removes* the last hardcoded ones in `SUBTYPE_META`), no em-dashes.
- Exhaustiveness via `Record<EnumValue, …>` maps (compile-time completeness), per the workspace exhaustive-switch rule. Pre-existing React-Compiler/RHF/TanStack-Table lint warnings (8) are expected — do not "fix" them.

## Out of scope

- Aging-bucket, audit HTTP-method, and role label consolidation (same smell, deferred).
- `src/types/api.d.ts` (generated; the API contract).
- Any change to the master-data or Document deepening modules, routes, or nav.

## Note on `CURRENT_EARNINGS`

`t.reports.subtype.CURRENT_EARNINGS` ("Laba (Rugi) Berjalan") is a **report-only** subtype not present in `accountSubtypeSchema`. If the balance-sheet report can emit it, the shared `subtypeLabel` must still resolve it. Resolution: the balance sheet computes this label from a small report-local map (it is not an account-schema value), or `accounts.subtype` gains a `CURRENT_EARNINGS` entry consumed only by the report. The plan picks one (preferred: keep it report-local, since it is not a real account subtype) so the account `subtypeLabel` stays exhaustive over `AccountSubtype` only.

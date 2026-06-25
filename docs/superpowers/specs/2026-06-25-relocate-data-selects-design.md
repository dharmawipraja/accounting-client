# Relocate data-bound selects to the feature layer — design

**Date:** 2026-06-25
**Source:** Architecture-review card 4 (flip the data-select dependency direction). Sibling of cards 1–3.
**Decided via:** brainstorming (converged directly — contained; approach chosen: relocate).

## Summary

`AccountSelect`, `PartnerSelect`, and `TaxCodeMultiSelect` live in `src/components/common/` (the leaf UI layer) yet import their data hooks from `src/features/` (`accountsApi`/`partnersApi`/`taxCodesApi.useList`). That is an inverted dependency — `common/ → features/` — a cycle, since features already depend on `common/`. The only upward import in each is the `useList()` call; everything else is generic combobox UI.

**Fix (chosen approach): relocate.** Move each data-bound select into the feature that owns its data (`features/accounts/`, `features/partners/`, `features/tax-codes/`), co-located with its hooks. The selects stay data-aware (ergonomic for the 8 call sites — no fetch/map boilerplate). The bad edge (`common → features`) disappears; consumers importing them become `feature → feature`, which is already pervasive and accepted in this codebase (e.g. `PaymentForm`/`DocumentEditor`/`TaxCodesPage` already import other features' hooks). Also fix the cross-feature i18n leak in `TaxCodeMultiSelect`.

This is a structural move + one tiny i18n fix — **no behavior change** except the tax-code empty-state label now correctly reflects the document's nature.

## Moves (via `git mv`, history-preserving)

| From | To |
|---|---|
| `src/components/common/AccountSelect.tsx` (+ `AccountSelect.test.tsx`) | `src/features/accounts/AccountSelect.tsx` (+ test) |
| `src/components/common/PartnerSelect.tsx` (+ `PartnerSelect.test.tsx`) | `src/features/partners/PartnerSelect.tsx` (+ test) |
| `src/components/common/TaxCodeMultiSelect.tsx` (+ `TaxCodeMultiSelect.test.tsx`) | `src/features/tax-codes/TaxCodeMultiSelect.tsx` (+ test) |

Inside each moved select, the one upward import changes to relative:
- `AccountSelect`: `import { accountsApi } from '@/features/accounts/hooks'` → `from './hooks'`
- `PartnerSelect`: `import { partnersApi } from '@/features/partners/hooks'` → `from './hooks'`
- `TaxCodeMultiSelect`: `import { taxCodesApi } from '@/features/tax-codes/hooks'` → `from './hooks'`

All other imports (`@/components/ui/*`, `@/lib/utils`, `@/lib/i18n/useT`, lucide) are absolute and unchanged. Each test imports its select via the relative `./XSelect`, which stays valid after the co-move; the tests' other imports (`@/test/handlers`, `@/test/server`, `@/stores/session`) are absolute. **The three tests move with zero content edits.**

**No new cycle:** the relocated selects import only their own feature's `./hooks` + `ui`/`lib` primitives. No select imports another feature. Consumers importing them are `feature → feature` (already the norm).

## i18n leak fix (`TaxCodeMultiSelect`)

Today the empty-state trigger label is hardcoded `t.salesInvoices.taxes` (wrong for purchase bills, and a cross-feature reference). Fix:
- Add `placeholder?: string` to `TaxCodeMultiSelectProps`.
- The empty-state span renders `{placeholder ?? t.common.search}` instead of `t.salesInvoices.taxes`.
- The component keeps `useT()` only for the command chrome (`t.common.search` for `CommandInput`, `t.common.noData` for `CommandEmpty`) — lib-layer, not a feature leak.
- Its sole consumer, `DocumentLineRow` (`features/documents/`), passes `placeholder={labels.taxes}` — so the empty label now reflects the document's nature (sales `t.salesInvoices.taxes` / purchase `t.purchaseBills.taxes`).

The `TaxCodeMultiSelect.test.tsx` does not assert the empty-state text (it locates the combobox by `aria-label`/role), so this change keeps it green with no test edit.

## Consumer import updates (8 sites)

- `@/components/common/AccountSelect` → `@/features/accounts/AccountSelect` in: `features/payments/PaymentForm.tsx`, `features/journals/JournalLineRow.tsx`, `features/tax-codes/TaxCodeFormDialog.tsx`, `features/reports/GeneralLedgerPage.tsx`, `features/documents/DocumentLineRow.tsx`.
- `@/components/common/PartnerSelect` → `@/features/partners/PartnerSelect` in: `features/payments/PaymentForm.tsx`, `features/documents/DocumentEditor.tsx`.
- `@/components/common/TaxCodeMultiSelect` → `@/features/tax-codes/TaxCodeMultiSelect` in: `features/documents/DocumentLineRow.tsx` (and add `placeholder={labels.taxes}` to that usage).

(`features/tax-codes/TaxCodeFormDialog.tsx` imports `AccountSelect` from `features/accounts/` — fine; `features/tax-codes/TaxCodeMultiSelect.tsx` lives in the same feature as nothing it imports circularly.)

## Testing

- The 3 relocated select tests stay green, unchanged (behavior identical; relative import still resolves; MSW endpoint overrides unchanged).
- `TaxCodeMultiSelect.test.tsx`: unchanged (doesn't assert the empty-state label).
- The consumer tests (e.g. `TaxCodeFormDialog.test.tsx`, the document/payment/journal page tests) stay green — they exercise the selects through the rendered surface; only the source import paths moved.
- **Full gate:** `pnpm run build` (real `tsc -b` — confirms no dangling `@/components/common/{AccountSelect,PartnerSelect,TaxCodeMultiSelect}` import) + `pnpm test --run` + `pnpm run lint` (0 errors / the 8 pre-existing warnings).
- **Dependency category:** in-process; pure structural move + one i18n fix.

## Global constraints (carried into the plan)

- i18n via `useT()`; no hardcoded user-facing strings; no em-dashes. The selects keep only `t.common.*` chrome; the tax empty-label comes from the caller's `placeholder`.
- `pnpm run build` is the real typecheck (not `tsc --noEmit`).
- No behavior change except the tax-code empty-state label source (the leak fix).

## Out of scope

- Making the selects pure / options-as-props (a different, higher-churn approach we explicitly did not choose) and extracting a shared pure `Combobox` primitive (a possible future card).
- Any change to the selects' filtering/sorting/display logic, or to `accountsApi`/`partnersApi`/`taxCodesApi`.

# Relocate Data-Bound Selects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `AccountSelect`/`PartnerSelect`/`TaxCodeMultiSelect` out of `components/common/` into their owning feature dirs (killing the `common/ → features/` import cycle), and fix the `TaxCodeMultiSelect` cross-feature i18n leak via a `placeholder` prop.

**Architecture:** Pure structural relocation — each data-bound select moves to the feature that owns its data (co-located with its `hooks.ts`), its one upward import becomes relative `./hooks`, and the ~8 consumer import paths update to the new locations (`feature → feature`, already the norm). No behavior change except the tax-code empty-state label now comes from the caller.

**Tech Stack:** TypeScript (strict), React 19, TanStack Query, shadcn/cmdk (Popover+Command), Vitest + RTL/MSW. In-process.

## Global Constraints

- **Pure structural move + one i18n fix — no behavior change.** The existing select tests + all consumer tests are the regression net and stay green. The only behavioral delta: `TaxCodeMultiSelect`'s empty-state label now comes from a `placeholder` prop (sales/purchase namespace via the caller) instead of the hardcoded `t.salesInvoices.taxes`.
- **i18n:** via `useT()`; no hardcoded user-facing strings; no em-dashes. The relocated selects keep only `t.common.*` chrome.
- **Typecheck reality:** `pnpm run build` (`tsc -b && vite build`) is the real typecheck and confirms no dangling `@/components/common/{AccountSelect,PartnerSelect,TaxCodeMultiSelect}` import. (`tsc --noEmit` does NOT typecheck tests here.)
- **Lint:** stays at 0 errors / the 8 pre-existing React-Compiler/react-hook-form/TanStack-Table warnings.
- **Commands:** Build `pnpm run build` · Tests `pnpm test --run` · one file `pnpm test --run <path>` · Lint `pnpm run lint`.

## File Structure

This is one cohesive relocation; doing it as a single task keeps the build green (the file moves and their consumers' import updates must land together). The deliverable: the three selects relocated, all consumers updated, the leak fixed, the full gate green.

- **Move** (git mv, history-preserving): `components/common/AccountSelect.tsx`+test → `features/accounts/`; `components/common/PartnerSelect.tsx`+test → `features/partners/`; `components/common/TaxCodeMultiSelect.tsx`+test → `features/tax-codes/`.
- **Edit (moved selects):** the one `@/features/X/hooks` import → relative `./hooks`. (`TaxCodeMultiSelect` also gets the placeholder fix.)
- **Edit (consumers, 8 import sites):** swap the module specifier to the new path; `DocumentLineRow` also passes `placeholder={labels.taxes}`.
- **Unchanged:** the selects' filtering/sorting/display logic, the hooks, all other absolute imports, every test's body.

---

### Task 1: Relocate the three selects + fix the i18n leak

**Files:**
- Move: `src/components/common/AccountSelect.tsx` + `AccountSelect.test.tsx` → `src/features/accounts/`
- Move: `src/components/common/PartnerSelect.tsx` + `PartnerSelect.test.tsx` → `src/features/partners/`
- Move: `src/components/common/TaxCodeMultiSelect.tsx` + `TaxCodeMultiSelect.test.tsx` → `src/features/tax-codes/`
- Modify (moved selects): the `./hooks` import in each; `TaxCodeMultiSelect` placeholder prop.
- Modify (consumers): `features/payments/PaymentForm.tsx`, `features/tax-codes/TaxCodeFormDialog.tsx`, `features/journals/JournalLineRow.tsx`, `features/documents/DocumentLineRow.tsx`, `features/reports/GeneralLedgerPage.tsx`, `features/documents/DocumentEditor.tsx`.

**Interfaces:**
- Consumes: existing `accountsApi`/`partnersApi`/`taxCodesApi` (now imported relatively within each feature).
- Produces: `@/features/accounts/AccountSelect`, `@/features/partners/PartnerSelect`, `@/features/tax-codes/TaxCodeMultiSelect` (same component APIs; `TaxCodeMultiSelect` gains optional `placeholder?: string`).

> This is a pure relocation — there is no new failing test to write. The safety net is the existing test suite + `pnpm run build` staying green and a grep proving no `@/components/common/{select}` import remains.

- [ ] **Step 1: Move the six files with `git mv` (preserves history)**

```bash
cd /Users/wipraja/Documents/Demo/accounting-client
git mv src/components/common/AccountSelect.tsx       src/features/accounts/AccountSelect.tsx
git mv src/components/common/AccountSelect.test.tsx   src/features/accounts/AccountSelect.test.tsx
git mv src/components/common/PartnerSelect.tsx        src/features/partners/PartnerSelect.tsx
git mv src/components/common/PartnerSelect.test.tsx    src/features/partners/PartnerSelect.test.tsx
git mv src/components/common/TaxCodeMultiSelect.tsx    src/features/tax-codes/TaxCodeMultiSelect.tsx
git mv src/components/common/TaxCodeMultiSelect.test.tsx src/features/tax-codes/TaxCodeMultiSelect.test.tsx
```

(The tests import their select via the relative `./XSelect` and otherwise use absolute `@/test/*`/`@/stores/*` imports, so they need no content change.)

- [ ] **Step 2: Make each moved select's data-hook import relative**

In `src/features/accounts/AccountSelect.tsx`, change:
```ts
import { accountsApi } from '@/features/accounts/hooks';
```
to:
```ts
import { accountsApi } from './hooks';
```

In `src/features/partners/PartnerSelect.tsx`, change:
```ts
import { partnersApi } from '@/features/partners/hooks';
```
to:
```ts
import { partnersApi } from './hooks';
```

In `src/features/tax-codes/TaxCodeMultiSelect.tsx`, change:
```ts
import { taxCodesApi } from '@/features/tax-codes/hooks';
```
to:
```ts
import { taxCodesApi } from './hooks';
```

- [ ] **Step 3: Fix the `TaxCodeMultiSelect` i18n leak (add a `placeholder` prop)**

In `src/features/tax-codes/TaxCodeMultiSelect.tsx`, add `placeholder?: string` to the props interface:
```ts
interface TaxCodeMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  allowedKinds: string[];
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}
```
Destructure it in the signature:
```ts
export function TaxCodeMultiSelect({ value, onChange, allowedKinds, disabled, placeholder, 'aria-label': ariaLabel }: TaxCodeMultiSelectProps) {
```
And replace the empty-state label (currently `{t.salesInvoices.taxes}`) — the line:
```tsx
              ? <span className="text-muted-foreground">{t.salesInvoices.taxes}</span>
```
with:
```tsx
              ? <span className="text-muted-foreground">{placeholder ?? t.common.search}</span>
```
(The component still uses `t.common.search` for `CommandInput` and `t.common.noData` for `CommandEmpty` — those stay. The `t.salesInvoices` reference is now gone.)

- [ ] **Step 4: Update the 8 consumer import paths**

Change the import module specifier in each file (the imported symbol is unchanged):

- `src/features/payments/PaymentForm.tsx` line 9: `'@/components/common/PartnerSelect'` → `'@/features/partners/PartnerSelect'`
- `src/features/payments/PaymentForm.tsx` line 10: `'@/components/common/AccountSelect'` → `'@/features/accounts/AccountSelect'`
- `src/features/tax-codes/TaxCodeFormDialog.tsx` line 11: `'@/components/common/AccountSelect'` → `'@/features/accounts/AccountSelect'`
- `src/features/journals/JournalLineRow.tsx` line 5: `'@/components/common/AccountSelect'` → `'@/features/accounts/AccountSelect'`
- `src/features/documents/DocumentLineRow.tsx` line 6: `'@/components/common/AccountSelect'` → `'@/features/accounts/AccountSelect'`
- `src/features/documents/DocumentLineRow.tsx` line 8: `'@/components/common/TaxCodeMultiSelect'` → `'@/features/tax-codes/TaxCodeMultiSelect'`
- `src/features/reports/GeneralLedgerPage.tsx` line 6: `'@/components/common/AccountSelect'` → `'@/features/accounts/AccountSelect'`
- `src/features/documents/DocumentEditor.tsx` line 12: `'@/components/common/PartnerSelect'` → `'@/features/partners/PartnerSelect'`

- [ ] **Step 5: Pass the placeholder at the `TaxCodeMultiSelect` call site**

In `src/features/documents/DocumentLineRow.tsx`, the `<TaxCodeMultiSelect …/>` usage — add `placeholder={labels.taxes}`:
```tsx
        <TaxCodeMultiSelect value={line.taxCodeIds} onChange={(ids) => form.setValue(p('taxCodeIds'), ids as never)} allowedKinds={allowedTaxKinds} aria-label={labels.taxes} placeholder={labels.taxes} disabled={readOnly} />
```
(`labels.taxes` resolves to `t.salesInvoices.taxes` for SALE configs and `t.purchaseBills.taxes` for PURCHASE — fixing the leak with the correct per-nature label.)

- [ ] **Step 6: Verify no dangling import remains**

Run: `grep -rn "@/components/common/\(AccountSelect\|PartnerSelect\|TaxCodeMultiSelect\)" src`
Expected: no matches (every reference now points at the feature paths).

- [ ] **Step 7: Run the relocated select tests + the key consumer tests**

Run: `pnpm test --run src/features/accounts/AccountSelect.test.tsx src/features/partners/PartnerSelect.test.tsx src/features/tax-codes/TaxCodeMultiSelect.test.tsx src/features/tax-codes/TaxCodeFormDialog.test.tsx`
Expected: PASS, unchanged. The three relocated select tests pass as-is (behavior identical; relative import resolves). `TaxCodeFormDialog` (a consumer of `AccountSelect`) passes via the new import path.

- [ ] **Step 8: Full verification gate**

Run all:
```bash
pnpm run build
pnpm test --run
pnpm run lint
```
Expected: build succeeds (the real `tsc -b` — confirms no dangling import + the relative `./hooks` imports type-check); full suite passes (all the document/payment/journal/report/tax-code tests that render these selects); lint = 0 errors / 8 pre-existing warnings.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(selects): relocate AccountSelect/PartnerSelect/TaxCodeMultiSelect to feature layer

Move the three data-bound selects out of components/common into their owning
feature dirs (accounts/partners/tax-codes), removing the common->features import
cycle; their data-hook import becomes relative. Fix the TaxCodeMultiSelect
cross-feature i18n leak via a placeholder prop (DocumentLineRow passes
labels.taxes). Pure structural move; consumer imports updated; no behavior change."
```

---

## Self-Review

**1. Spec coverage:**
- Relocate the 3 selects (+ tests) to feature dirs; internal hook import → relative → Steps 1–2. ✓
- Fix the `TaxCodeMultiSelect` i18n leak via `placeholder` prop; `DocumentLineRow` passes `labels.taxes` → Steps 3, 5. ✓
- Update the 8 consumer import paths → Step 4 (enumerated with line numbers). ✓
- No new cycle; `feature → feature` is the norm → relocation targets are each select's own feature; verified by Step 6 grep + Step 8 build. ✓
- Tests co-move unchanged; full gate green → Steps 7–8. ✓
- No behavior change except the tax empty-label source → Step 3/5. ✓

**2. Placeholder scan:** No TBD/TODO/vague steps. Exact `git mv` commands, exact import-specifier edits with file+line, the exact `TaxCodeMultiSelect` props/empty-state edit, the exact `DocumentLineRow` call-site edit, and a grep + full-gate verification.

**3. Type consistency:** The relocated selects keep their exact prop APIs (`AccountSelectProps`, `PartnerSelectProps` unchanged; `TaxCodeMultiSelectProps` gains optional `placeholder?: string`, backward-compatible). Consumers pass the same props; only `DocumentLineRow` adds the optional `placeholder`. The relative `./hooks` import resolves to the same `accountsApi`/`partnersApi`/`taxCodesApi` objects.

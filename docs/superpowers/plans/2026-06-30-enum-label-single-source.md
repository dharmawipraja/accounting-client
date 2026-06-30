# Enum / label single-source seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one enum-label seam — account enum *values* defined once (zod + `z.infer`), all *labels* in `messages.id.ts` reached through small exhaustive value→label helpers — then apply it to the account UI, the duplicated document-status logic, and the journal `sourceType` API mismatch.

**Architecture:** `accounts/schema.ts` is the single source of account enum values (zod enums); its `z.infer` types replace the hand-written unions in `account-meta.ts`. `account-meta.ts` keeps `SUBTYPE_META` as pure derivation (`subtype → {type, defaultNormalBalance}`, no `label`) and gains pure label helpers (`accountTypeLabel`/`subtypeLabel`/`cashFlowCategoryLabel`/`normalBalanceLabel`) backed by new `accounts.subtypeLabels` + `accounts.cashFlowLabels` i18n records. A shared `documentStatusLabel` (over `documents.status`) replaces four copy-pasted `statusLabel()` functions and `JournalStatusChip`'s inline labels; a `journalSourceLabel` covers the real API enum (`SALES_INVOICE`/`PURCHASE_BILL`/`OPENING`/`CLOSING`), replacing the partial `SALE`/`PURCHASE` map.

**Tech Stack:** React 19 + React Compiler, TypeScript strict, zod, TanStack Query/Table, Vitest + RTL + MSW. Package manager pnpm.

## Global Constraints

- **Behavior-preserving EXCEPT three settled changes** (from the spec): (1) `cashFlowCategory`/`normalBalance` no longer render raw enum strings; (2) five subtype labels reconciled to one canonical set (balance-sheet section headers shift to the chart-of-accounts wording); (3) journal `sourceType` now labels the real API values, and journal fixtures move `SALE`→`SALES_INVOICE`. No routes / nav labels / form-field names / aria-labels change.
- **i18n:** all copy via `useT()`; this card removes the last hardcoded Indonesian (`SUBTYPE_META[].label`); no em-dashes.
- **Exhaustiveness:** label helpers use `Record<EnumValue, …>` so a missing enum member is a compile error. No runtime fallthrough in the account/document helpers; the report-only balance-sheet path keeps a tolerant fallback (it consumes arbitrary server strings).
- **Typecheck reality:** `pnpm run build` (`tsc -b && vite build`) is the real typecheck (NOT `tsc --noEmit`). Run before each commit.
- **Lint:** stays at 0 errors / the 8 pre-existing React-Compiler/react-hook-form/TanStack-Table warnings.
- **Commands:** Build `pnpm run build` · Tests `pnpm test --run` · one file `pnpm test --run <path>` · Lint `pnpm run lint`.

## File Structure

- **Modify** `src/features/accounts/schema.ts` — add `z.infer` enum type exports (Task 1).
- **Modify** `src/features/accounts/account-meta.ts` — import types from schema, drop duplicate unions + `SUBTYPE_META.label`, add `SUBTYPE_VALUES` + 4 label helpers (Task 1).
- **Modify** `src/lib/i18n/messages.id.ts` — `accounts.subtypeLabels` + `accounts.cashFlowLabels` (Task 1); `documents.status`, remove per-feature/journal status keys, `reports.currentEarnings`, remove `reports.subtype`, journal `sourceOpening`/`sourceClosing` (Tasks 2–4).
- **Modify** `account-meta.test.ts` (Task 1); create `documents/statusLabel.ts` (+ test) and `journals/sourceLabel.ts` (+ test) (Tasks 3–4).
- **Modify** account UI + reports (Task 2), the three document columns + pages + `statusChips.tsx` (Task 3), `journals/columns.tsx` + fixtures (Task 4).
- **Delete** `src/features/reports/subtypeLabel.ts` + `subtypeLabel.test.ts` (Task 2).
- **Unchanged:** `src/types/api.d.ts`; the `nature: 'SALE'|'PURCHASE'` document-tax concept (NOT journal source); routes/nav; master-data and Document deepening modules.

---

### Task 1: Single source for account enums + label helpers

**Files:**
- Modify: `src/features/accounts/schema.ts`, `src/features/accounts/account-meta.ts`, `src/lib/i18n/messages.id.ts`
- Test: `src/features/accounts/account-meta.test.ts`

**Interfaces produced:** `AccountType`/`NormalBalance`/`CashFlowCategory`/`AccountSubtype` (from `schema.ts`); `SUBTYPE_VALUES: AccountSubtype[]`; `accountTypeLabel(t, type)`, `subtypeLabel(t, subtype)`, `cashFlowCategoryLabel(t, cat)`, `normalBalanceLabel(t, nb)`.

- [ ] **Step 1: Add the i18n label records**

In `src/lib/i18n/messages.id.ts`, inside the `accounts:` object, after `typeBeban: 'Beban',` (currently the last key before the closing `},`), add:

```ts
    subtypeLabels: {
      CURRENT_ASSET: 'Aset Lancar',
      NON_CURRENT_ASSET: 'Aset Tidak Lancar',
      FIXED_ASSET: 'Aset Tetap',
      ACCUMULATED_DEPRECIATION: 'Akumulasi Penyusutan',
      TAX_RECEIVABLE: 'Pajak Dibayar di Muka',
      CURRENT_LIABILITY: 'Liabilitas Jangka Pendek',
      NON_CURRENT_LIABILITY: 'Liabilitas Jangka Panjang',
      TAX_PAYABLE: 'Utang Pajak',
      EQUITY: 'Ekuitas',
      REVENUE: 'Pendapatan',
      OTHER_INCOME: 'Pendapatan Lain-lain',
      COGS: 'Harga Pokok Penjualan',
      OPERATING_EXPENSE: 'Beban Operasional',
      OTHER_EXPENSE: 'Beban Lain-lain',
    },
    cashFlowLabels: {
      OPERATING: 'Operasi',
      INVESTING: 'Investasi',
      FINANCING: 'Pendanaan',
      NONE: 'Tidak Ada',
    },
```

(These are the canonical subtype labels — the chart-of-accounts wording. `cashFlowLabels` are new; previously the enum rendered raw.)

- [ ] **Step 2: Export inferred enum types from the schema**

In `src/features/accounts/schema.ts`, immediately after the four `z.enum` declarations (after line 10, the `accountSubtypeSchema` close), add:

```ts
export type AccountType = z.infer<typeof accountTypeSchema>;
export type NormalBalance = z.infer<typeof normalBalanceSchema>;
export type CashFlowCategory = z.infer<typeof cashFlowCategorySchema>;
export type AccountSubtype = z.infer<typeof accountSubtypeSchema>;
```

- [ ] **Step 3: Rewrite `account-meta.ts` (drop duplicate unions + `label`, add helpers)**

Replace the entire contents of `src/features/accounts/account-meta.ts` with:

```ts
import type { Messages } from '@/lib/i18n/messages.id';
import type { AccountType, NormalBalance, CashFlowCategory, AccountSubtype } from './schema';

export type { AccountType, NormalBalance, CashFlowCategory, AccountSubtype } from './schema';

export const ACCOUNT_TYPE_ORDER: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

/** Derivation only — subtype drives the account's type and default normal balance.
 *  Labels live in i18n (`accounts.subtypeLabels`), reached via `subtypeLabel`. */
export const SUBTYPE_META: Record<AccountSubtype, { type: AccountType; defaultNormalBalance: NormalBalance }> = {
  CURRENT_ASSET:            { type: 'ASSET',     defaultNormalBalance: 'DEBIT' },
  NON_CURRENT_ASSET:        { type: 'ASSET',     defaultNormalBalance: 'DEBIT' },
  FIXED_ASSET:              { type: 'ASSET',     defaultNormalBalance: 'DEBIT' },
  ACCUMULATED_DEPRECIATION: { type: 'ASSET',     defaultNormalBalance: 'CREDIT' },
  TAX_RECEIVABLE:           { type: 'ASSET',     defaultNormalBalance: 'DEBIT' },
  CURRENT_LIABILITY:        { type: 'LIABILITY', defaultNormalBalance: 'CREDIT' },
  NON_CURRENT_LIABILITY:    { type: 'LIABILITY', defaultNormalBalance: 'CREDIT' },
  TAX_PAYABLE:              { type: 'LIABILITY', defaultNormalBalance: 'CREDIT' },
  EQUITY:                   { type: 'EQUITY',    defaultNormalBalance: 'CREDIT' },
  REVENUE:                  { type: 'REVENUE',   defaultNormalBalance: 'CREDIT' },
  OTHER_INCOME:             { type: 'REVENUE',   defaultNormalBalance: 'CREDIT' },
  COGS:                     { type: 'EXPENSE',   defaultNormalBalance: 'DEBIT' },
  OPERATING_EXPENSE:        { type: 'EXPENSE',   defaultNormalBalance: 'DEBIT' },
  OTHER_EXPENSE:            { type: 'EXPENSE',   defaultNormalBalance: 'DEBIT' },
};

/** Subtype select order (preserves the historical SUBTYPE_META key order). */
export const SUBTYPE_VALUES = Object.keys(SUBTYPE_META) as AccountSubtype[];

const TYPE_LABEL_KEY: Record<AccountType, 'typeAset' | 'typeLiabilitas' | 'typeEkuitas' | 'typePendapatan' | 'typeBeban'> = {
  ASSET: 'typeAset', LIABILITY: 'typeLiabilitas', EQUITY: 'typeEkuitas', REVENUE: 'typePendapatan', EXPENSE: 'typeBeban',
};

export function accountTypeLabel(t: Messages, type: AccountType): string {
  return t.accounts[TYPE_LABEL_KEY[type]];
}
export function subtypeLabel(t: Messages, subtype: AccountSubtype): string {
  return t.accounts.subtypeLabels[subtype];
}
export function cashFlowCategoryLabel(t: Messages, cat: CashFlowCategory): string {
  return t.accounts.cashFlowLabels[cat];
}
export function normalBalanceLabel(t: Messages, nb: NormalBalance): string {
  return nb === 'DEBIT' ? t.accounts.debit : t.accounts.credit;
}
```

- [ ] **Step 4: Rewrite the `account-meta` test**

Replace the entire contents of `src/features/accounts/account-meta.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import {
  SUBTYPE_META, SUBTYPE_VALUES, ACCOUNT_TYPE_ORDER,
  accountTypeLabel, subtypeLabel, cashFlowCategoryLabel, normalBalanceLabel,
  type AccountSubtype,
} from './account-meta';

describe('SUBTYPE_META', () => {
  it('derives type + default normal balance for standard subtypes', () => {
    expect(SUBTYPE_META.CURRENT_ASSET).toEqual({ type: 'ASSET', defaultNormalBalance: 'DEBIT' });
    expect(SUBTYPE_META.CURRENT_LIABILITY).toEqual({ type: 'LIABILITY', defaultNormalBalance: 'CREDIT' });
    expect(SUBTYPE_META.REVENUE).toEqual({ type: 'REVENUE', defaultNormalBalance: 'CREDIT' });
    expect(SUBTYPE_META.COGS).toEqual({ type: 'EXPENSE', defaultNormalBalance: 'DEBIT' });
    expect(SUBTYPE_META.EQUITY).toEqual({ type: 'EQUITY', defaultNormalBalance: 'CREDIT' });
  });

  it('marks contra-asset accumulated depreciation as ASSET/CREDIT', () => {
    expect(SUBTYPE_META.ACCUMULATED_DEPRECIATION).toEqual({ type: 'ASSET', defaultNormalBalance: 'CREDIT' });
  });

  it('covers all 14 subtypes with a non-empty i18n label', () => {
    expect(SUBTYPE_VALUES).toHaveLength(14);
    for (const k of SUBTYPE_VALUES) expect(subtypeLabel(id, k).length).toBeGreaterThan(0);
  });

  it('orders types Aset→Liabilitas→Ekuitas→Pendapatan→Beban', () => {
    expect(ACCOUNT_TYPE_ORDER).toEqual(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']);
  });
});

describe('account label helpers', () => {
  it('accountTypeLabel maps every type to Indonesian', () => {
    expect(accountTypeLabel(id, 'ASSET')).toBe('Aset');
    expect(accountTypeLabel(id, 'LIABILITY')).toBe('Liabilitas');
    expect(accountTypeLabel(id, 'EXPENSE')).toBe('Beban');
  });
  it('subtypeLabel uses the canonical chart-of-accounts wording', () => {
    expect(subtypeLabel(id, 'CURRENT_ASSET')).toBe('Aset Lancar');
    expect(subtypeLabel(id, 'TAX_PAYABLE')).toBe('Utang Pajak');
    expect(subtypeLabel(id, 'CURRENT_LIABILITY')).toBe('Liabilitas Jangka Pendek');
    expect(subtypeLabel(id, 'TAX_RECEIVABLE')).toBe('Pajak Dibayar di Muka');
  });
  it('cashFlowCategoryLabel maps every category', () => {
    expect(cashFlowCategoryLabel(id, 'NONE')).toBe('Tidak Ada');
    expect(cashFlowCategoryLabel(id, 'OPERATING')).toBe('Operasi');
    expect(cashFlowCategoryLabel(id, 'INVESTING')).toBe('Investasi');
    expect(cashFlowCategoryLabel(id, 'FINANCING')).toBe('Pendanaan');
  });
  it('normalBalanceLabel maps DEBIT/CREDIT', () => {
    expect(normalBalanceLabel(id, 'DEBIT')).toBe('Debit');
    expect(normalBalanceLabel(id, 'CREDIT')).toBe('Kredit');
  });
});

// Type-level guard: SUBTYPE_VALUES is exactly AccountSubtype[]
const _typecheck: AccountSubtype[] = SUBTYPE_VALUES;
void _typecheck;
```

- [ ] **Step 5: Run the test + build**

Run: `pnpm test --run src/features/accounts/account-meta.test.ts`
Expected: PASS.
Run: `pnpm run build`
Expected: succeeds. (Other account files still import `SUBTYPE_META`/`SUBTYPE_OPTIONS`; `SUBTYPE_OPTIONS` was removed, so `AccountFormDialog.tsx` will fail the build here — that is expected and fixed in Task 2. If you want a green build at this commit, do Step 3 of Task 2 now; otherwise commit Tasks 1+2 together. Recommended: proceed to Task 2 before committing, then commit once.)

- [ ] **Step 6: (Defer commit to end of Task 2 — these two tasks share the `SUBTYPE_OPTIONS`→`SUBTYPE_VALUES` cutover.)**

---

### Task 2: Rewire account UI + reports; fix the cashFlow/normalBalance leaks

**Files:**
- Modify: `src/features/accounts/columns.tsx`, `src/features/accounts/AccountsPage.tsx`, `src/features/accounts/AccountFormDialog.tsx`, `src/features/reports/GeneralLedgerPage.tsx`, `src/features/reports/BalanceSheetPage.tsx`, `src/lib/i18n/messages.id.ts`
- Delete: `src/features/reports/subtypeLabel.ts`, `src/features/reports/subtypeLabel.test.ts`

- [ ] **Step 1: Accounts columns → helpers**

In `src/features/accounts/columns.tsx`: change the import on line 6 from `import { SUBTYPE_META } from './account-meta';` to:

```ts
import { subtypeLabel, normalBalanceLabel } from './account-meta';
```

Replace the subtype cell (line 20) and the normalBalance cell body (lines 24–27):

```tsx
    col.accessor('subtype', {
      header: t.accounts.subtype,
      cell: (c) => subtypeLabel(t, c.getValue()),
    }),
    col.accessor('normalBalance', {
      header: t.accounts.normalBalance,
      cell: (c) => <Badge variant="outline">{normalBalanceLabel(t, c.getValue())}</Badge>,
    }),
```

- [ ] **Step 2: AccountsPage → `accountTypeLabel`**

In `src/features/accounts/AccountsPage.tsx`: remove the `TYPE_LABEL` const (lines 12–15) and the now-unused `useT`-keyed type. Change the import on line 4 to:

```ts
import { ACCOUNT_TYPE_ORDER, accountTypeLabel } from './account-meta';
```

Replace the section header (line 35) `{t.accounts[TYPE_LABEL[g.type]]}` with `{accountTypeLabel(t, g.type)}`. (`useT` is still used via `const t = useT()`.)

- [ ] **Step 3: AccountFormDialog → `SUBTYPE_VALUES` + label helpers**

In `src/features/accounts/AccountFormDialog.tsx`:

Change the import on line 11 to:

```ts
import { SUBTYPE_META, SUBTYPE_VALUES, subtypeLabel, cashFlowCategoryLabel, type AccountSubtype } from './account-meta';
```

Replace the subtype select body (lines 96–100) to render labels from i18n:

```tsx
          <SelectContent>
            {SUBTYPE_VALUES.map((v) => (
              <SelectItem key={v} value={v}>{subtypeLabel(t, v)}</SelectItem>
            ))}
          </SelectContent>
```

Replace BOTH cash-flow select bodies (create: line 124; edit: line 155) — the raw `{c}` becomes a label:

```tsx
              {CASH_FLOW_OPTIONS.map((c) => <SelectItem key={c} value={c}>{cashFlowCategoryLabel(t, c)}</SelectItem>)}
```

`CASH_FLOW_OPTIONS` (line 18) stays as-is — its members (`'NONE' | 'OPERATING' | 'INVESTING' | 'FINANCING'`) are assignable to `CashFlowCategory`, so `cashFlowCategoryLabel(t, c)` typechecks. The `SUBTYPE_META` import is still used by `AccountCreateFields`' derivation effect.

- [ ] **Step 4: General ledger header → `normalBalanceLabel`**

In `src/features/reports/GeneralLedgerPage.tsx`: add to imports (after line 6):

```ts
import { normalBalanceLabel, type NormalBalance } from '@/features/accounts/account-meta';
```

Replace line 49 `{gl.account.code} · {gl.account.name} · {gl.account.normalBalance}` with:

```tsx
              <div className="text-sm font-medium">{gl.account.code} · {gl.account.name} · {normalBalanceLabel(t, gl.account.normalBalance as NormalBalance)}</div>
```

(`gl.account.normalBalance` is a schema `string`; the cast targets the helper's typed parameter.)

- [ ] **Step 5: Balance sheet → shared labels + report-local CURRENT_EARNINGS**

In `src/lib/i18n/messages.id.ts`, inside the `reports:` object, **remove** the entire `subtype: { … }` block (the ~16 lines `subtype: { CURRENT_ASSET … OTHER_EXPENSE: 'Beban Lain', },`) and in its place add:

```ts
    currentEarnings: 'Laba (Rugi) Berjalan',
```

In `src/features/reports/BalanceSheetPage.tsx`: replace the import on line 13 `import { subtypeLabel } from './subtypeLabel';` with:

```ts
import type { AccountSubtype } from '@/features/accounts/account-meta';
```

Add a report-local label resolver above `buildRows` (the report consumes arbitrary server subtype strings, so it stays tolerant and handles the report-only `CURRENT_EARNINGS`):

```ts
function bsSubtypeLabel(t: Messages, subtype: string): string {
  if (subtype === 'CURRENT_EARNINGS') return t.reports.currentEarnings;
  return (t.accounts.subtypeLabels as Record<string, string>)[subtype] ?? subtype;
}
```

Replace line 22 `rows.push({ label: subtypeLabel(t, g.subtype), level: 1 });` with `rows.push({ label: bsSubtypeLabel(t, g.subtype), level: 1 });`. (`AccountSubtype` import is for documentation/intent; if unused after edits, drop it to satisfy lint.)

Delete `src/features/reports/subtypeLabel.ts` and `src/features/reports/subtypeLabel.test.ts`.

- [ ] **Step 6: Build + run the affected suites**

Run: `pnpm run build`
Expected: succeeds (the `SUBTYPE_OPTIONS`/`subtypeLabel` cutover is complete).
Run: `pnpm test --run src/features/accounts src/features/reports`
Expected: PASS. `BalanceSheetPage.test.tsx` still renders (CURRENT_EARNINGS resolves via `reports.currentEarnings`); `AccountsPage.test.tsx`/`AccountFormDialog.test.tsx` unchanged (accounts UI already used the canonical wording). The deleted `subtypeLabel.test.ts` is gone.

- [ ] **Step 7: Lint + commit Tasks 1+2**

Run: `pnpm run lint` → 0 errors / 8 warnings.

```bash
git add src/features/accounts/schema.ts src/features/accounts/account-meta.ts src/features/accounts/account-meta.test.ts src/features/accounts/columns.tsx src/features/accounts/AccountsPage.tsx src/features/accounts/AccountFormDialog.tsx src/features/reports/GeneralLedgerPage.tsx src/features/reports/BalanceSheetPage.tsx src/lib/i18n/messages.id.ts
git rm src/features/reports/subtypeLabel.ts src/features/reports/subtypeLabel.test.ts
git commit -m "refactor(accounts): single-source enum values + i18n label helpers

Account enum unions now derive from the zod schema (z.infer); account-meta
drops the duplicate unions and the hardcoded SUBTYPE_META labels. New
accountTypeLabel/subtypeLabel/cashFlowCategoryLabel/normalBalanceLabel read
from messages.id.ts. Fixes the cashFlowCategory/normalBalance raw-enum leaks
and unifies the dual subtype-label sources to one canonical set (balance-sheet
section headers adopt the chart-of-accounts wording)."
```

---

### Task 3: Shared document-status label

**Files:**
- Create: `src/features/documents/statusLabel.ts`, `src/features/documents/statusLabel.test.ts`
- Modify: `src/lib/i18n/messages.id.ts`, `src/features/sales-invoices/columns.tsx`, `src/features/purchase-bills/columns.tsx`, `src/features/payments/columns.tsx`, `src/features/sales-invoices/SalesInvoicesPage.tsx`, `src/features/purchase-bills/PurchaseBillsPage.tsx`, `src/features/payments/PaymentsPage.tsx`, `src/features/journals/JournalsPage.tsx`, `src/components/common/statusChips.tsx`, `src/components/common/statusChips.test.tsx`

- [ ] **Step 1: Write the failing helper test**

Create `src/features/documents/statusLabel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { documentStatusLabel } from './statusLabel';

describe('documentStatusLabel', () => {
  it('maps every document status to Indonesian', () => {
    expect(documentStatusLabel(id, 'DRAFT')).toBe('Draf');
    expect(documentStatusLabel(id, 'POSTED')).toBe('Diposting');
    expect(documentStatusLabel(id, 'VOID')).toBe('Dibatalkan');
    expect(documentStatusLabel(id, 'REVERSED')).toBe('Dibalik');
  });
});
```

- [ ] **Step 2: Run it — confirm it fails**

Run: `pnpm test --run src/features/documents/statusLabel.test.ts`
Expected: FAIL — cannot resolve `./statusLabel` (and `documents.status` not yet added).

- [ ] **Step 3: Add the i18n record + helper**

In `src/lib/i18n/messages.id.ts`, inside the `documents:` object, after `unpaid: 'Belum dibayar',`, add:

```ts
    status: {
      DRAFT: 'Draf',
      POSTED: 'Diposting',
      VOID: 'Dibatalkan',
      REVERSED: 'Dibalik',
    },
```

Create `src/features/documents/statusLabel.ts`:

```ts
import type { Messages } from '@/lib/i18n/messages.id';

export type DocumentStatus = 'DRAFT' | 'POSTED' | 'VOID' | 'REVERSED';

/** One label for every document/journal status. Callers pass the raw status
 *  string from the API (typed `string` in the schemas); cast at the call site. */
export function documentStatusLabel(t: Messages, status: DocumentStatus): string {
  return t.documents.status[status];
}
```

Run: `pnpm test --run src/features/documents/statusLabel.test.ts` → PASS.

- [ ] **Step 4: Replace the three `statusLabel()` column functions**

In each of `src/features/sales-invoices/columns.tsx`, `src/features/purchase-bills/columns.tsx`, `src/features/payments/columns.tsx`:

1. Delete the local `statusLabel(t, …)` function (lines 13–17 / 13–17 / 14–18 respectively).
2. Add to imports: `import { documentStatusLabel, type DocumentStatus } from '@/features/documents/statusLabel';`
3. Replace the status cell's `label={statusLabel(t, c.getValue())}` with `label={documentStatusLabel(t, c.getValue() as DocumentStatus)}`. (Sales-invoices status cell is lines 28–31; purchase-bills line 29; payments line 38.)

- [ ] **Step 5: Repoint the three document pages' status filters**

In `src/features/sales-invoices/SalesInvoicesPage.tsx` (lines 37–39), `src/features/purchase-bills/PurchaseBillsPage.tsx` (lines 37–39), `src/features/payments/PaymentsPage.tsx` (lines 44–46): add `import { documentStatusLabel } from '@/features/documents/statusLabel';` and change the three option labels from `t.<feature>.statusDraft/statusPosted/statusVoid` to:

```tsx
        { value: 'DRAFT', label: documentStatusLabel(t, 'DRAFT') },
        { value: 'POSTED', label: documentStatusLabel(t, 'POSTED') },
        { value: 'VOID', label: documentStatusLabel(t, 'VOID') },
```

(Leave the `statusAll: 'Semua'` ALL-sentinel option as-is.)

- [ ] **Step 6: Journals status — chip + filter**

In `src/components/common/statusChips.tsx`: add `import { documentStatusLabel } from '@/features/documents/statusLabel';` and rewrite `JournalStatusChip` (lines 21–25) to source labels from the shared record:

```tsx
export function JournalStatusChip({ status, t }: { status: string; t: Messages }) {
  if (status === 'POSTED') return <StatusChip tone="success" icon={CheckCircle2} label={documentStatusLabel(t, 'POSTED')} />;
  if (status === 'REVERSED') return <StatusChip tone="neutral" icon={RotateCcw} label={documentStatusLabel(t, 'REVERSED')} />;
  return <StatusChip tone="neutral" icon={PencilLine} label={documentStatusLabel(t, 'DRAFT')} />;
}
```

In `src/features/journals/JournalsPage.tsx` (lines 39–40): add `import { documentStatusLabel } from '@/features/documents/statusLabel';` and change:

```tsx
        { value: 'DRAFT', label: documentStatusLabel(t, 'DRAFT') },
        { value: 'POSTED', label: documentStatusLabel(t, 'POSTED') },
```

- [ ] **Step 7: Remove the now-dead per-feature status keys**

In `src/lib/i18n/messages.id.ts`, delete these keys (they are now sourced from `documents.status`):
- `salesInvoices`: `statusDraft`, `statusPosted`, `statusVoid`
- `purchaseBills`: `statusDraft`, `statusPosted`, `statusVoid`
- `payments`: `statusDraft`, `statusPosted`, `statusVoid`
- `journals`: `statusDraft`, `statusPosted`, `statusReversed`

Keep every `statusAll: 'Semua'`. Do NOT touch `status: 'Status'` (the column header) in each namespace.

- [ ] **Step 8: Update `statusChips.test.tsx`**

In `src/components/common/statusChips.test.tsx` line 24, change the assertion from `id.journals.statusReversed` to the shared record:

```tsx
  expect(screen.getByText(id.documents.status.REVERSED)).toBeInTheDocument();
```

- [ ] **Step 9: Build + tests + lint + commit**

Run: `pnpm run build` → succeeds (no remaining references to the removed keys; verify with `git grep -n "statusDraft\|statusPosted\|statusVoid\|statusReversed" src` showing only `statusAll`/header `status`).
Run: `pnpm test --run src/features/sales-invoices src/features/purchase-bills src/features/payments src/features/journals src/components/common src/features/documents` → PASS.
Run: `pnpm run lint` → 0 errors / 8 warnings.

```bash
git add src/features/documents/statusLabel.ts src/features/documents/statusLabel.test.ts src/lib/i18n/messages.id.ts src/features/sales-invoices/columns.tsx src/features/purchase-bills/columns.tsx src/features/payments/columns.tsx src/features/sales-invoices/SalesInvoicesPage.tsx src/features/purchase-bills/PurchaseBillsPage.tsx src/features/payments/PaymentsPage.tsx src/features/journals/JournalsPage.tsx src/components/common/statusChips.tsx src/components/common/statusChips.test.tsx
git commit -m "refactor(documents): one documentStatusLabel over documents.status

Collapses four copy-pasted statusLabel() functions and JournalStatusChip's
inline labels to a single helper backed by a shared documents.status record.
Per-feature statusDraft/Posted/Void(/Reversed) keys removed; filters and chips
read the shared labels. Displayed strings unchanged."
```

---

### Task 4: Journal `sourceType` — real API enum + fixtures

**Files:**
- Create: `src/features/journals/sourceLabel.ts`, `src/features/journals/sourceLabel.test.ts`
- Modify: `src/features/journals/columns.tsx`, `src/lib/i18n/messages.id.ts`, `src/test/handlers.ts`, `src/features/journals/schema.test.ts`

- [ ] **Step 1: Write the failing helper test**

Create `src/features/journals/sourceLabel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { journalSourceLabel } from './sourceLabel';

describe('journalSourceLabel', () => {
  it('labels every real API source type', () => {
    expect(journalSourceLabel(id, 'MANUAL')).toBe('Manual');
    expect(journalSourceLabel(id, 'OPENING')).toBe('Saldo Awal');
    expect(journalSourceLabel(id, 'REVERSAL')).toBe('Pembalik');
    expect(journalSourceLabel(id, 'SALES_INVOICE')).toBe('Penjualan');
    expect(journalSourceLabel(id, 'PURCHASE_BILL')).toBe('Pembelian');
    expect(journalSourceLabel(id, 'PAYMENT')).toBe('Pembayaran');
    expect(journalSourceLabel(id, 'CLOSING')).toBe('Tutup Buku');
  });
  it('falls back to the raw value for unknown sources', () => {
    expect(journalSourceLabel(id, 'WHATEVER')).toBe('WHATEVER');
  });
});
```

- [ ] **Step 2: Run it — confirm it fails**

Run: `pnpm test --run src/features/journals/sourceLabel.test.ts`
Expected: FAIL — cannot resolve `./sourceLabel`.

- [ ] **Step 3: Add i18n keys + the helper**

In `src/lib/i18n/messages.id.ts`, inside the `journals:` object, alongside the existing `sourceManual`/`sourceReversal`/`sourceSale`/`sourcePurchase`/`sourcePayment`, add:

```ts
    sourceOpening: 'Saldo Awal',
    sourceClosing: 'Tutup Buku',
```

Create `src/features/journals/sourceLabel.ts`:

```ts
import type { Messages } from '@/lib/i18n/messages.id';

export type JournalSourceType =
  | 'MANUAL' | 'OPENING' | 'REVERSAL' | 'SALES_INVOICE' | 'PURCHASE_BILL' | 'PAYMENT' | 'CLOSING';

const SOURCE_LABEL_KEY: Record<JournalSourceType, keyof Messages['journals']> = {
  MANUAL: 'sourceManual',
  OPENING: 'sourceOpening',
  REVERSAL: 'sourceReversal',
  SALES_INVOICE: 'sourceSale',
  PURCHASE_BILL: 'sourcePurchase',
  PAYMENT: 'sourcePayment',
  CLOSING: 'sourceClosing',
};

/** Label a journal source. Accepts the raw API string; unknown values pass
 *  through unchanged (reports/older data tolerance). The map is exhaustive over
 *  the documented API enum. */
export function journalSourceLabel(t: Messages, source: string): string {
  const key = SOURCE_LABEL_KEY[source as JournalSourceType];
  return key ? (t.journals[key] as string) : source;
}
```

Run: `pnpm test --run src/features/journals/sourceLabel.test.ts` → PASS.

- [ ] **Step 4: Use the helper in journal columns**

In `src/features/journals/columns.tsx`: delete the local `sourceLabel(t, s)` function (lines 14–21), add `import { journalSourceLabel } from './sourceLabel';`, and change the `sourceType` cell (line 31) from `sourceLabel(t, c.getValue())` to `journalSourceLabel(t, c.getValue())`. (`Messages` import may become unused — drop it if so to satisfy lint.)

- [ ] **Step 5: Move the fixtures to the real API enum**

In `src/test/handlers.ts` line 65, change the `jep1` fixture's `sourceType: 'SALE'` to `sourceType: 'SALES_INVOICE'`.

In `src/features/journals/schema.test.ts` line 8, change `sourceType: 'SALE'` to `sourceType: 'SALES_INVOICE'` (parse test; asserts `totalDebit`/`lineCount`, so value is cosmetic but should reflect real data).

- [ ] **Step 6: Build + tests + lint + commit**

Run: `pnpm run build` → succeeds.
Run: `pnpm test --run src/features/journals src/test` → PASS. (`JournalsPage.test.tsx` asserts the fixture *description* "Penjualan diposting", not the source label, so the `SALE`→`SALES_INVOICE` change is safe.)
Run: `pnpm run lint` → 0 errors / 8 warnings.

```bash
git add src/features/journals/sourceLabel.ts src/features/journals/sourceLabel.test.ts src/features/journals/columns.tsx src/features/journals/schema.test.ts src/lib/i18n/messages.id.ts src/test/handlers.ts
git commit -m "fix(journals): label real API sourceType values via journalSourceLabel

Replaces the partial SALE/PURCHASE map (which fell through to raw strings on
live data) with an exhaustive map over the API enum
(MANUAL/OPENING/REVERSAL/SALES_INVOICE/PURCHASE_BILL/PAYMENT/CLOSING). Fixtures
move SALE -> SALES_INVOICE to exercise real values."
```

---

### Task 5: Full gate

- [ ] **Step 1: Run the complete gate**

```bash
pnpm run build
pnpm test --run
pnpm run lint
```

Expected: build clean (real `tsc -b`); full suite green; lint 0 errors / 8 pre-existing warnings.

- [ ] **Step 2: Final sanity grep**

Run: `git grep -n "reports.subtype\|SUBTYPE_OPTIONS\|\.label ??" src`
Expected: no matches (the removed `reports.subtype` map, the removed `SUBTYPE_OPTIONS`, and the old `SUBTYPE_META[...].label ?? ` fallback are all gone).

---

## Self-Review

**1. Spec coverage:**
- Single source for account enum values (zod + `z.infer`, drop duplicate unions) → Task 1 Steps 2–3. ✓
- `SUBTYPE_META.label` removed; labels in i18n; one canonical subtype set → Task 1 Steps 1, 3 + Task 2 Step 5. ✓
- Exhaustive value→label helpers (account type/subtype/cashFlow/normalBalance) → Task 1 Step 3. ✓
- cashFlowCategory + normalBalance leaks fixed (form selects, GL header) → Task 2 Steps 3–4. ✓
- Dual subtype-label sources unified; `reports.subtype` removed; CURRENT_EARNINGS kept report-local → Task 2 Step 5. ✓
- Document-status 4× duplication → one `documentStatusLabel` over `documents.status`; per-feature keys removed → Task 3. ✓
- Journal `sourceType` API mismatch fixed (full enum, fixtures `SALE`→`SALES_INVOICE`) → Task 4. ✓
- Out of scope (aging buckets, audit methods, roles, `api.d.ts`) → untouched. ✓
- Build/test/lint gate → Task 5. ✓

**2. Placeholder scan:** No TBD/TODO. Every code step shows complete code or an exact edit with line anchors. The one judgment call (commit Tasks 1+2 together, since `SUBTYPE_OPTIONS`→`SUBTYPE_VALUES` spans both) is called out explicitly in Task 1 Step 5–6.

**3. Type consistency:** `subtypeLabel`/`accountTypeLabel`/`cashFlowCategoryLabel`/`normalBalanceLabel` defined in Task 1 and consumed with matching signatures in Task 2. `documentStatusLabel(t, status: DocumentStatus)` defined Task 3 Step 3, consumed with `as DocumentStatus` casts (status schemas are `z.string()`). `journalSourceLabel(t, source: string)` defined Task 4 Step 3, consumed in Step 4. `SUBTYPE_VALUES: AccountSubtype[]` defined Task 1 Step 3, consumed Task 2 Step 3. The `nature: 'SALE'|'PURCHASE'` document-tax type is deliberately untouched (distinct from journal `sourceType`).

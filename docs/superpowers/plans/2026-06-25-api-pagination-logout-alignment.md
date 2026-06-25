# API Alignment (Pagination Envelope + Server-Side Logout) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the client to API docs commit `2f88338`: accounts & tax-codes now return the `{data,total,limit,offset}` pagination envelope (breaking), and the API now supports server-side logout (`POST /auth/logout` + `/auth/logout-all`).

**Architecture:** Two independent change sets. (1) Flip `accountsApi`/`taxCodesApi` to `paginated: true` in the existing `createResourceHooks` factory (which unwraps the envelope so all wholesale consumers keep working), update every MSW handler/override to return the envelope via a shared `paged()` helper, then add server-paginated pager UI to the Accounts and Tax Codes list pages (mirroring `PartnersPage`). (2) Add best-effort logout API helpers and surface them from a user-menu `DropdownMenu` in `AppShell`.

**Tech Stack:** React 19, TypeScript (strict), TanStack Query v5 + Router, Zod v4, zustand (session store), shadcn/ui (`DropdownMenu`), MSW v2, Vitest 4 + RTL.

## Global Constraints

- **i18n:** every user-facing string goes through `useT()` (`src/lib/i18n/messages.id.ts`, Indonesian). No hardcoded copy. No em-dashes in UI strings.
- **Money:** decimal.js via `Money`; never JS floats. (Not exercised by this plan, but keep the rule.)
- **Status:** convey state with icon + text, never color alone.
- **Async UI:** wrap query rendering in `QueryState` (loading → not-found → error → data) with composed skeletons.
- **Redesign-preserve:** do not change routes, nav labels, or form-field names. (The logout user-menu is a functional change, not styling; the visible "Keluar" action is preserved as a menu item.)
- **Pre-existing ESLint warnings** about React Compiler / react-hook-form incompatibility are expected — do not "fix" them.
- **MSW base:** `export const API = 'http://localhost:4000/v1'` (`src/test/handlers.ts`). `API_BASE_URL` already includes `/v1`, so client paths are relative (e.g. `/auth/logout`, `/ledger/accounts`).
- **Commands:** Tests `pnpm test --run` · Typecheck `pnpm exec tsc --noEmit` · Lint `pnpm run lint` · Build `pnpm run build`.
- **Out of scope:** generating a typed OpenAPI client; the `/v1/audit` `limit` 500→200 cap (audit uses `LIMIT=50`); doc formatting edits (already committed).

## File Structure

**Task 1 — enveloped accounts & tax-codes (breaking fix):**
- Modify `src/features/accounts/hooks.ts` — add `paginated: true`.
- Modify `src/features/tax-codes/hooks.ts` — add `paginated: true`.
- Modify `src/test/handlers.ts` — add `paged()` helper; convert the `/ledger/accounts` and `/tax/codes` GET handlers to envelopes.
- Modify 11 test files (enumerated in Task 1) — wrap their `/ledger/accounts` & `/tax/codes` GET overrides in `paged()`.

**Task 2 — Accounts list pager UI:**
- Modify `src/features/accounts/AccountsPage.tsx` — `usePagedList` + `Pagination` + page-scoped search.
- Modify `src/features/accounts/AccountsPage.test.tsx` — add a server-pagination test.

**Task 3 — Tax Codes list pager UI:**
- Modify `src/features/tax-codes/TaxCodesPage.tsx` — `usePagedList` for the list, wholesale `useList` for the account-label map, + `Pagination` + page-scoped search.
- Modify `src/features/tax-codes/TaxCodesPage.test.tsx` — add a server-pagination test.

**Task 4 — logout API helpers:**
- Create `src/lib/api/logout.ts` — `logoutCurrentDevice()`, `logoutAllDevices()`.
- Create `src/lib/api/logout.test.ts` — unit tests.
- Modify `src/test/handlers.ts` — default `POST /auth/logout` and `POST /auth/logout-all` handlers.

**Task 5 — logout UI:**
- Modify `src/lib/i18n/messages.id.ts` — add `auth.signOutAllDevices`, `auth.accountMenu`.
- Modify `src/components/common/AppShell.tsx` — replace the sign-out icon button with a `DropdownMenu`.
- Modify `src/components/common/AppShell.test.tsx` — update sign-out test; add all-devices test.

**Interface reference (existing code these tasks rely on):**
- `createResourceHooks(config)` returns `{ useList, usePagedList, useItem, useCreate, useUpdate, useDeactivate, useActivate, useRemove, keys }`. `useList()` with `paginated: true` fetches `?limit=200`, unwraps `.data`, resolves to `TItem[]`. `usePagedList(query)` resolves to `{ data: TItem[]; total: number; limit: number; offset: number }`.
- `Pagination` props: `{ offset: number; limit: number; total: number; onChange: (offset: number) => void }` (`src/components/common/Pagination.tsx`).
- `apiFetch(path, { method?, body?, auth?, query?, schema?, idempotencyKey? })` (`src/lib/api/client.ts`); `auth` defaults `true`; POST auto-assigns an `Idempotency-Key`.
- Session store (`src/stores/session.ts`): `useSession.getState()` exposes `accessToken`, `refreshToken`, `setTokens`, `setUser`, `clear`.

---

### Task 1: Flip accounts & tax-codes to the pagination envelope

**Files:**
- Modify: `src/features/accounts/hooks.ts`
- Modify: `src/features/tax-codes/hooks.ts`
- Modify: `src/test/handlers.ts`
- Modify (test overrides): `src/features/payments/PaymentsPage.test.tsx`, `src/features/payments/PaymentForm.test.tsx`, `src/features/tax-codes/TaxCodeFormDialog.test.tsx`, `src/features/journals/JournalEntryForm.test.tsx`, `src/features/purchase-bills/BillForm.readonly.test.tsx`, `src/features/purchase-bills/BillForm.test.tsx`, `src/features/sales-invoices/InvoiceForm.readonly.test.tsx`, `src/features/sales-invoices/InvoiceForm.test.tsx`, `src/components/common/AccountSelect.test.tsx`, `src/components/common/TaxCodeMultiSelect.test.tsx`, `src/features/tax-codes/TaxCodesPage.test.tsx`

**Interfaces:**
- Consumes: `createResourceHooks` `paginated` option (already implemented).
- Produces: `paged<T>(data, limit?, offset?)` exported from `src/test/handlers.ts` — `{ data: data.slice(offset, offset+limit); total: data.length; limit; offset }`, defaults `limit=200, offset=0`. Used by later tasks' tests too.

- [ ] **Step 1: Add the `paged()` helper to `src/test/handlers.ts`**

Add this export just below the `export const API = ...` line (top of file):

```ts
/**
 * Wrap an array as the `{ data, total, limit, offset }` pagination envelope the
 * API now returns for every enveloped list endpoint. Slices by limit/offset so
 * handlers that read those query params return the correct page.
 */
export function paged<T>(data: T[], limit = 200, offset = 0) {
  return { data: data.slice(offset, offset + limit), total: data.length, limit, offset };
}
```

- [ ] **Step 2: Convert the default `/ledger/accounts` and `/tax/codes` GET handlers to envelopes**

In `src/test/handlers.ts`, replace the current bare-array handlers.

Replace:
```ts
  http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accountFixtures())),
```
with:
```ts
  http.get(`${API}/ledger/accounts`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    return HttpResponse.json(paged(accountFixtures(), Number(u.get('limit') ?? 200), Number(u.get('offset') ?? 0)));
  }),
```

Replace:
```ts
  http.get(`${API}/tax/codes`, () => HttpResponse.json(taxCodeFixtures())),
```
with:
```ts
  http.get(`${API}/tax/codes`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    return HttpResponse.json(paged(taxCodeFixtures(), Number(u.get('limit') ?? 200), Number(u.get('offset') ?? 0)));
  }),
```

- [ ] **Step 3: Flip both resource hooks to `paginated: true`**

`src/features/accounts/hooks.ts` — add the `paginated: true` line:
```ts
export const accountsApi = createResourceHooks<Account, AccountCreatePayload, AccountUpdatePayload>({
  key: 'accounts',
  basePath: '/ledger/accounts',
  itemSchema: accountSchema,
  paginated: true,
});
```

`src/features/tax-codes/hooks.ts` — add the `paginated: true` line:
```ts
export const taxCodesApi = createResourceHooks<TaxCode, TaxCodeCreatePayload, TaxCodeUpdatePayload>({
  key: 'taxCodes',
  basePath: '/tax/codes',
  itemSchema: taxCodeSchema,
  paginated: true,
});
```

- [ ] **Step 4: Run the suite to see exactly which override tests now fail**

Run: `pnpm test --run`
Expected: FAIL. The 11 test files listed under **Files** fail with Zod parse errors (their `server.use` overrides still return bare arrays, but `useList`/`usePagedList` now expect the envelope). Use this failure list to confirm Step 5 hits every site.

- [ ] **Step 5: Wrap every `/ledger/accounts` and `/tax/codes` GET override in `paged()`**

Uniform transformation in each file below: `HttpResponse.json(<array-or-var>)` → `HttpResponse.json(paged(<array-or-var>))`, **only** for the `http.get(\`${API}/ledger/accounts\`, ...)` and `http.get(\`${API}/tax/codes\`, ...)` handlers (leave POST/PATCH/DELETE handlers alone). In each file, add `paged` to the existing `import { API } from '@/test/handlers'` (or `'@/test/handlers'`) statement → `import { API, paged } from '@/test/handlers'`.

Exact sites:
- `src/features/payments/PaymentsPage.test.tsx` — lines 37, 52, 70, 88, 112: `HttpResponse.json(accounts)` → `HttpResponse.json(paged(accounts))`.
- `src/features/payments/PaymentForm.test.tsx` — lines 24, 98: `HttpResponse.json(accounts)` → `HttpResponse.json(paged(accounts))`.
- `src/features/tax-codes/TaxCodeFormDialog.test.tsx` — line 25: `HttpResponse.json(accounts)` → `HttpResponse.json(paged(accounts))`.
- `src/features/journals/JournalEntryForm.test.tsx` — lines 26, 57: `HttpResponse.json(accounts)` → `HttpResponse.json(paged(accounts))`.
- `src/features/purchase-bills/BillForm.readonly.test.tsx` — line 29: `HttpResponse.json([{...}])` → `HttpResponse.json(paged([{...}]))`; line 31: `HttpResponse.json([])` → `HttpResponse.json(paged([]))`.
- `src/features/purchase-bills/BillForm.test.tsx` — lines 28, 62: `HttpResponse.json(accounts)` → `HttpResponse.json(paged(accounts))`; lines 30, 64: `HttpResponse.json([])` → `HttpResponse.json(paged([]))`.
- `src/features/sales-invoices/InvoiceForm.readonly.test.tsx` — line 29: `HttpResponse.json([{...}])` → `HttpResponse.json(paged([{...}]))`; line 31: `HttpResponse.json([])` → `HttpResponse.json(paged([]))`.
- `src/features/sales-invoices/InvoiceForm.test.tsx` — lines 28, 65: `HttpResponse.json(accounts)` → `HttpResponse.json(paged(accounts))`; lines 30, 67: `HttpResponse.json([])` → `HttpResponse.json(paged([]))`.
- `src/components/common/AccountSelect.test.tsx` — line 27: `HttpResponse.json(accounts)` → `HttpResponse.json(paged(accounts))`.
- `src/components/common/TaxCodeMultiSelect.test.tsx` — line 27: `HttpResponse.json(codes)` → `HttpResponse.json(paged(codes))`.
- `src/features/tax-codes/TaxCodesPage.test.tsx` — line 20: `HttpResponse.json([{...account...}])` → `HttpResponse.json(paged([{...account...}]))`; line 23: `HttpResponse.json([{...taxcode...}])` → `HttpResponse.json(paged([{...taxcode...}]))`. Also add `paged` to its import: `import { API, paged } from '@/test/handlers';`.

> Note: `src/features/accounts/AccountFormDialog.test.tsx` references `/ledger/accounts` only via POST/PATCH handlers (no list GET override) — no change needed.

- [ ] **Step 6: Run the full suite — everything green**

Run: `pnpm test --run`
Expected: PASS (all files). The Accounts/Tax Codes pages still use wholesale `useList()` at this point; the envelope is unwrapped transparently. `AccountsPage.test.tsx` and `TaxCodesPage.test.tsx` pass unchanged (they read the default/overridden envelope handlers).

- [ ] **Step 7: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/accounts/hooks.ts src/features/tax-codes/hooks.ts src/test/handlers.ts \
  src/features/payments/PaymentsPage.test.tsx src/features/payments/PaymentForm.test.tsx \
  src/features/tax-codes/TaxCodeFormDialog.test.tsx src/features/journals/JournalEntryForm.test.tsx \
  src/features/purchase-bills/BillForm.readonly.test.tsx src/features/purchase-bills/BillForm.test.tsx \
  src/features/sales-invoices/InvoiceForm.readonly.test.tsx src/features/sales-invoices/InvoiceForm.test.tsx \
  src/components/common/AccountSelect.test.tsx src/components/common/TaxCodeMultiSelect.test.tsx \
  src/features/tax-codes/TaxCodesPage.test.tsx
git commit -m "fix(api): accounts & tax-codes now return the pagination envelope

Flip both resources to paginated:true (useList unwraps .data, so all
wholesale consumers keep working) and update every MSW handler/override to
the {data,total,limit,offset} shape via a shared paged() helper."
```

---

### Task 2: Accounts list pager UI

**Files:**
- Modify: `src/features/accounts/AccountsPage.tsx`
- Test: `src/features/accounts/AccountsPage.test.tsx`

**Interfaces:**
- Consumes: `accountsApi.usePagedList({ limit, offset })` → `{ data: Account[]; total; limit; offset }`; `paged()` from `@/test/handlers` (Task 1); `Pagination`; `t.common.searchOnThisPage` (existing).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing server-pagination test**

Add to `src/features/accounts/AccountsPage.test.tsx`. First extend the imports at the top of the file to:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { AccountsPage } from './AccountsPage';
```

Then add this test:

```tsx
it('paginates accounts server-side', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  const many = Array.from({ length: 25 }, (_, i) => ({
    id: `a${i}`, code: `1-${1000 + i}`, name: `Akun ${i}`, type: 'ASSET',
    subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', cashFlowCategory: 'OPERATING',
    isPostable: true, isActive: true, parentId: null,
  }));
  server.use(
    http.get(`${API}/ledger/accounts`, ({ request }) => {
      const u = new URL(request.url).searchParams;
      return HttpResponse.json(paged(many, Number(u.get('limit') ?? 20), Number(u.get('offset') ?? 0)));
    }),
  );
  renderPage();

  expect(await screen.findByText('Akun 0')).toBeInTheDocument();
  expect(screen.queryByText('Akun 20')).not.toBeInTheDocument();
  expect(screen.getByText(/1.*20.*25/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /berikutnya/i }));
  expect(await screen.findByText('Akun 20')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test --run src/features/accounts/AccountsPage.test.tsx`
Expected: FAIL — `AccountsPage` still calls `useList()` (no `Pagination`, all 25 rows render so "Akun 20" is present), so the assertions about paging fail.

- [ ] **Step 3: Rewrite `AccountsPage.tsx` to use `usePagedList` + `Pagination`**

Replace the entire file `src/features/accounts/AccountsPage.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { QueryState } from '@/components/common/QueryState';
import { RoleGate } from '@/components/common/RoleGate';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/useT';
import { ACCOUNT_TYPE_ORDER, type AccountType } from './account-meta';
import { buildAccountColumns } from './columns';
import { AccountFormDialog } from './AccountFormDialog';
import { accountsApi } from './hooks';
import type { Account } from './schema';

const LIMIT = 20;

const TYPE_LABEL: Record<AccountType, keyof ReturnType<typeof useT>['accounts']> = {
  ASSET: 'typeAset', LIABILITY: 'typeLiabilitas', EQUITY: 'typeEkuitas',
  REVENUE: 'typePendapatan', EXPENSE: 'typeBeban',
};

export function AccountsPage() {
  const t = useT();
  const [offset, setOffset] = useState(0);
  const page = accountsApi.usePagedList({ limit: LIMIT, offset });
  const deactivate = accountsApi.useDeactivate();
  const remove = accountsApi.useRemove();
  const { mutate: activate } = accountsApi.useActivate();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'delete'; account: Account } | null>(null);

  const columns = useMemo(
    () =>
      buildAccountColumns(t, {
        onEdit: (a) => setEditing(a),
        onToggleActive: (a) =>
          a.isActive
            ? setConfirm({ kind: 'deactivate', account: a })
            : activate(a.id, {
                onSuccess: () => toast.success(t.crud.activated),
                onError: () => toast.error(t.common.error),
              }),
        onDelete: (a) => setConfirm({ kind: 'delete', account: a }),
      }),
    [t, activate],
  );

  function runConfirm() {
    if (!confirm) return;
    const action = confirm.kind === 'deactivate' ? deactivate : remove;
    const okMsg = confirm.kind === 'deactivate' ? t.crud.deactivated : t.crud.deleted;
    action.mutate(confirm.account.id, {
      onSuccess: () => { toast.success(okMsg); setConfirm(null); },
      onError: () => toast.error(t.common.error),
    });
  }

  return (
    <div>
      <PageHeader
        title={t.accounts.title}
        actions={
          <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> {t.crud.new}
            </Button>
          </RoleGate>
        }
      />

      <div className="mb-4 max-w-xs space-y-1">
        <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <p className="text-xs text-muted-foreground">{t.common.searchOnThisPage}</p>
      </div>

      <QueryState query={page} loading={<SkeletonTable rows={8} cols={4} />} onRetry>
        {(env) => {
          const q = search.toLowerCase();
          const rows = env.data.filter(
            (a) => !q || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
          );
          const grouped = ACCOUNT_TYPE_ORDER.map((type) => ({
            type,
            rows: rows.filter((a) => a.type === type).sort((x, y) => x.code.localeCompare(y.code)),
          })).filter((g) => g.rows.length > 0);
          return (
            <>
              <div className="space-y-8">
                {grouped.map((g) => (
                  <section key={g.type}>
                    <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                      {t.accounts[TYPE_LABEL[g.type]]}
                    </h2>
                    <DataTable columns={columns} data={g.rows} />
                  </section>
                ))}
              </div>
              <Pagination offset={offset} limit={LIMIT} total={env.total} onChange={setOffset} />
            </>
          );
        }}
      </QueryState>

      <AccountFormDialog open={creating} onOpenChange={setCreating} mode="create" />
      <AccountFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        mode="edit"
        account={editing ?? undefined}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === 'delete' ? t.crud.confirmDeleteTitle : t.crud.confirmDeactivateTitle}
        description={confirm?.kind === 'delete' ? t.crud.confirmDeleteDesc : undefined}
        confirmLabel={confirm?.kind === 'delete' ? t.common.delete : t.crud.deactivate}
        destructive={confirm?.kind === 'delete'}
        pending={deactivate.isPending || remove.isPending}
        onConfirm={runConfirm}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the AccountsPage tests**

Run: `pnpm test --run src/features/accounts/AccountsPage.test.tsx`
Expected: PASS — the existing "grouped by type", "New button" and "hides New" tests still pass (the 2 default fixtures fit on page 1), and the new pagination test passes.

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm exec tsc --noEmit` → no errors.

```bash
git add src/features/accounts/AccountsPage.tsx src/features/accounts/AccountsPage.test.tsx
git commit -m "feat(accounts): server-paginate the accounts list page

Switch AccountsPage to usePagedList + Pagination with page-scoped search,
mirroring the partners list. Grouping-by-type now applies to the current page."
```

---

### Task 3: Tax Codes list pager UI

**Files:**
- Modify: `src/features/tax-codes/TaxCodesPage.tsx`
- Test: `src/features/tax-codes/TaxCodesPage.test.tsx`

**Interfaces:**
- Consumes: `taxCodesApi.usePagedList({ limit, offset })` for the list; `accountsApi.useList()` (wholesale) for the account-label map; `Pagination`; `paged()` from `@/test/handlers`.
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing server-pagination test**

Add to `src/features/tax-codes/TaxCodesPage.test.tsx`. The file already imports `http`, `HttpResponse`, `API`, `server`. Extend the imports to add `userEvent` and `paged`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { TaxCodesPage } from './TaxCodesPage';
```

Then add this test:

```tsx
it('paginates tax codes server-side', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  const many = Array.from({ length: 25 }, (_, i) => ({
    id: `t${i}`, code: `PPN-${i}`, name: `Pajak ${i}`, kind: 'PPN_OUTPUT',
    rate: '0.11', taxAccountId: 'a1', isActive: true,
  }));
  server.use(
    http.get(`${API}/tax/codes`, ({ request }) => {
      const u = new URL(request.url).searchParams;
      return HttpResponse.json(paged(many, Number(u.get('limit') ?? 20), Number(u.get('offset') ?? 0)));
    }),
  );
  renderPage();

  expect(await screen.findByText('PPN-0')).toBeInTheDocument();
  expect(screen.queryByText('PPN-20')).not.toBeInTheDocument();
  expect(screen.getByText(/1.*20.*25/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /berikutnya/i }));
  expect(await screen.findByText('PPN-20')).toBeInTheDocument();
});
```

(The default `/ledger/accounts` envelope handler from Task 1 supplies the account-label map — no override needed for accounts here.)

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test --run src/features/tax-codes/TaxCodesPage.test.tsx`
Expected: FAIL — `TaxCodesPage` still calls `useList()` for the list (no `Pagination`; all 25 rows render, so "PPN-20" is present).

- [ ] **Step 3: Rewrite `TaxCodesPage.tsx` — paginate the list, keep accounts wholesale**

Replace the entire file `src/features/tax-codes/TaxCodesPage.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { QueryState } from '@/components/common/QueryState';
import { RoleGate } from '@/components/common/RoleGate';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { useT } from '@/lib/i18n/useT';
import { accountsApi } from '@/features/accounts/hooks';
import { buildTaxCodeColumns } from './columns';
import { TaxCodeFormDialog } from './TaxCodeFormDialog';
import { taxCodesApi } from './hooks';
import type { TaxCode } from './schema';

const LIMIT = 20;

export function TaxCodesPage() {
  const t = useT();
  const [offset, setOffset] = useState(0);
  const page = taxCodesApi.usePagedList({ limit: LIMIT, offset });
  const accounts = accountsApi.useList();
  const deactivate = taxCodesApi.useDeactivate();
  const remove = taxCodesApi.useRemove();
  const { mutate: activate } = taxCodesApi.useActivate();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TaxCode | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'delete'; taxCode: TaxCode } | null>(null);

  const accountLabel = useMemo(() => {
    const map = new Map((accounts.data ?? []).map((a) => [a.id, `${a.code} — ${a.name}`]));
    return (id: string) => map.get(id) ?? '—';
  }, [accounts.data]);

  const columns = useMemo(
    () => buildTaxCodeColumns(t, accountLabel, {
      onEdit: (x) => setEditing(x),
      onToggleActive: (x) =>
        x.isActive
          ? setConfirm({ kind: 'deactivate', taxCode: x })
          : activate(x.id, {
              onSuccess: () => toast.success(t.crud.activated),
              onError: () => toast.error(t.common.error),
            }),
      onDelete: (x) => setConfirm({ kind: 'delete', taxCode: x }),
    }),
    [t, accountLabel, activate],
  );

  function runConfirm() {
    if (!confirm) return;
    const action = confirm.kind === 'deactivate' ? deactivate : remove;
    const okMsg = confirm.kind === 'deactivate' ? t.crud.deactivated : t.crud.deleted;
    action.mutate(confirm.taxCode.id, {
      onSuccess: () => { toast.success(okMsg); setConfirm(null); },
      onError: () => toast.error(t.common.error),
    });
  }

  return (
    <div>
      <PageHeader title={t.taxCodes.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button onClick={() => setCreating(true)}><Plus className="size-4" /> {t.crud.new}</Button>
        </RoleGate>
      } />

      <div className="mb-4 max-w-xs space-y-1">
        <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <p className="text-xs text-muted-foreground">{t.common.searchOnThisPage}</p>
      </div>

      <QueryState query={page} loading={<SkeletonTable rows={8} cols={4} />} onRetry>
        {(env) => {
          const q = search.toLowerCase();
          const rows = env.data.filter(
            (x) => !q || x.code.toLowerCase().includes(q) || x.name.toLowerCase().includes(q),
          );
          return (
            <>
              <DataTable columns={columns} data={rows} />
              <Pagination offset={offset} limit={LIMIT} total={env.total} onChange={setOffset} />
            </>
          );
        }}
      </QueryState>

      <TaxCodeFormDialog open={creating} onOpenChange={setCreating} mode="create" />
      <TaxCodeFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} mode="edit" taxCode={editing ?? undefined} />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === 'delete' ? t.crud.confirmDeleteTitle : t.crud.confirmDeactivateTitle}
        description={confirm?.kind === 'delete' ? t.crud.confirmDeleteDesc : undefined}
        confirmLabel={confirm?.kind === 'delete' ? t.common.delete : t.crud.deactivate}
        destructive={confirm?.kind === 'delete'}
        pending={deactivate.isPending || remove.isPending}
        onConfirm={runConfirm}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the TaxCodesPage tests**

Run: `pnpm test --run src/features/tax-codes/TaxCodesPage.test.tsx`
Expected: PASS — the existing "renders rate as a percent and the joined account name" test still passes (its envelope overrides from Task 1 supply one tax code + one account), and the new pagination test passes.

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm exec tsc --noEmit` → no errors.

```bash
git add src/features/tax-codes/TaxCodesPage.tsx src/features/tax-codes/TaxCodesPage.test.tsx
git commit -m "feat(tax-codes): server-paginate the tax codes list page

Switch the list to usePagedList + Pagination with page-scoped search; keep a
wholesale accountsApi.useList() for the account-label map."
```

---

### Task 4: Server-side logout API helpers

**Files:**
- Create: `src/lib/api/logout.ts`
- Test: `src/lib/api/logout.test.ts`
- Modify: `src/test/handlers.ts`

**Interfaces:**
- Consumes: `useSession.getState().refreshToken`, `API_BASE_URL` (`src/lib/api/config.ts`), `apiFetch` (`src/lib/api/client.ts`).
- Produces: `logoutCurrentDevice(): Promise<void>` and `logoutAllDevices(): Promise<void>` — both best-effort (never throw). Consumed by Task 5.

- [ ] **Step 1: Add default MSW handlers for the two logout endpoints**

In `src/test/handlers.ts`, add these two handlers immediately after the `POST /auth/login` handler (before the `GET /auth/me` handler):

```ts
  http.post(`${API}/auth/logout`, () => HttpResponse.json({ ok: true })),
  http.post(`${API}/auth/logout-all`, () => HttpResponse.json({ ok: true })),
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/api/logout.test.ts`:

```ts
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { logoutCurrentDevice, logoutAllDevices } from './logout';

afterEach(() => useSession.getState().clear());

it('logoutCurrentDevice POSTs /auth/logout with the refresh token', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'ref-xyz' });
  let received: unknown = null;
  server.use(
    http.post(`${API}/auth/logout`, async ({ request }) => {
      received = await request.json();
      return HttpResponse.json({ ok: true });
    }),
  );
  await logoutCurrentDevice();
  expect(received).toEqual({ refreshToken: 'ref-xyz' });
});

it('logoutCurrentDevice is a no-op when there is no refresh token', async () => {
  let called = false;
  server.use(
    http.post(`${API}/auth/logout`, () => {
      called = true;
      return HttpResponse.json({ ok: true });
    }),
  );
  await logoutCurrentDevice();
  expect(called).toBe(false);
});

it('logoutCurrentDevice swallows server errors (never throws)', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'ref' });
  server.use(http.post(`${API}/auth/logout`, () => HttpResponse.json({}, { status: 500 })));
  await expect(logoutCurrentDevice()).resolves.toBeUndefined();
});

it('logoutAllDevices POSTs /auth/logout-all with the bearer token', async () => {
  useSession.getState().setTokens({ accessToken: 'tok-1', refreshToken: 'r' });
  let auth: string | null = null;
  server.use(
    http.post(`${API}/auth/logout-all`, ({ request }) => {
      auth = request.headers.get('Authorization');
      return HttpResponse.json({ ok: true });
    }),
  );
  await logoutAllDevices();
  expect(auth).toBe('Bearer tok-1');
});

it('logoutAllDevices swallows server errors (never throws)', async () => {
  useSession.getState().setTokens({ accessToken: 'tok-1', refreshToken: 'r' });
  server.use(http.post(`${API}/auth/logout-all`, () => HttpResponse.json({}, { status: 500 })));
  await expect(logoutAllDevices()).resolves.toBeUndefined();
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm test --run src/lib/api/logout.test.ts`
Expected: FAIL — `./logout` does not exist (cannot resolve module).

- [ ] **Step 4: Implement `src/lib/api/logout.ts`**

```ts
import { useSession } from '@/stores/session';
import { API_BASE_URL } from './config';
import { apiFetch } from './client';

/**
 * Best-effort: revoke the current device's refresh-token family server-side.
 * Uses a bare fetch (the endpoint is public/throttled and must work even when
 * the access token is expired) and swallows every failure — logout must never
 * be blocked by a server or network error. The caller clears the local session.
 */
export async function logoutCurrentDevice(): Promise<void> {
  const refreshToken = useSession.getState().refreshToken;
  if (!refreshToken) return;
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Best-effort: revoke ALL sessions for the current user. Authenticated, so it
 * goes through apiFetch to attach the Bearer header. Swallows failures.
 */
export async function logoutAllDevices(): Promise<void> {
  try {
    await apiFetch('/auth/logout-all', { method: 'POST' });
  } catch {
    /* best-effort */
  }
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm test --run src/lib/api/logout.test.ts`
Expected: PASS (all 5 tests).

- [ ] **Step 6: Typecheck + commit**

Run: `pnpm exec tsc --noEmit` → no errors.

```bash
git add src/lib/api/logout.ts src/lib/api/logout.test.ts src/test/handlers.ts
git commit -m "feat(auth): best-effort server-side logout helpers

logoutCurrentDevice() POSTs /auth/logout { refreshToken }; logoutAllDevices()
POSTs /auth/logout-all. Both swallow errors so logout never blocks."
```

---

### Task 5: Logout user-menu in AppShell

**Files:**
- Modify: `src/lib/i18n/messages.id.ts`
- Modify: `src/components/common/AppShell.tsx`
- Test: `src/components/common/AppShell.test.tsx`

**Interfaces:**
- Consumes: `logoutCurrentDevice`, `logoutAllDevices` (Task 4); `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` (`src/components/ui/dropdown-menu.tsx`); `useSession` `clear`; router `navigate`.
- Produces: nothing downstream.

- [ ] **Step 1: Add the two i18n strings**

In `src/lib/i18n/messages.id.ts`, extend the `auth` block (keep `signOut`). After `signOut: 'Keluar',` add:

```ts
    signOutAllDevices: 'Keluar dari semua perangkat',
    accountMenu: 'Menu akun',
```

- [ ] **Step 2: Update the AppShell sign-out test (open menu, then click item) and add the all-devices test**

In `src/components/common/AppShell.test.tsx`, extend the imports to add MSW + handlers + server:

```tsx
import { http, HttpResponse } from 'msw';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
```

Replace the existing test `it('clears the session and navigates to /login on sign-out', ...)` with these two tests:

```tsx
it('signs out the current device and navigates to /login', async () => {
  useSession.getState().setTokens({ accessToken: 'tok-abc', refreshToken: 'ref-abc' });
  useSession.getState().setUser({ id: '2', email: 'user@buku.id', role: 'VIEWER' });
  let loggedOut = false;
  server.use(
    http.post(`${API}/auth/logout`, () => {
      loggedOut = true;
      return HttpResponse.json({ ok: true });
    }),
  );
  renderWithLoginRoute();

  await userEvent.click(await screen.findByRole('button', { name: 'Menu akun' }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Keluar' }));

  expect(useSession.getState().accessToken).toBeNull();
  await screen.findByTestId('login');
  expect(loggedOut).toBe(true);
});

it('signs out of all devices and navigates to /login', async () => {
  useSession.getState().setTokens({ accessToken: 'tok-abc', refreshToken: 'ref-abc' });
  useSession.getState().setUser({ id: '2', email: 'user@buku.id', role: 'VIEWER' });
  let loggedOutAll = false;
  server.use(
    http.post(`${API}/auth/logout-all`, () => {
      loggedOutAll = true;
      return HttpResponse.json({ ok: true });
    }),
  );
  renderWithLoginRoute();

  await userEvent.click(await screen.findByRole('button', { name: 'Menu akun' }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Keluar dari semua perangkat' }));

  expect(useSession.getState().accessToken).toBeNull();
  await screen.findByTestId('login');
  expect(loggedOutAll).toBe(true);
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm test --run src/components/common/AppShell.test.tsx`
Expected: FAIL — there is no button named "Menu akun" yet (the current control is an icon button named "Keluar"), so `findByRole('button', { name: 'Menu akun' })` times out.

- [ ] **Step 4: Convert the sign-out button into a `DropdownMenu`**

In `src/components/common/AppShell.tsx`:

(a) Add imports near the other component imports (after the `Button` import):
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logoutCurrentDevice, logoutAllDevices } from '@/lib/api/logout';
```

(b) Inside the `AppShell` component body, after the `useHydrateSession();` call, add the two handlers:
```tsx
  async function handleSignOut() {
    await logoutCurrentDevice();
    clear();
    void navigate({ to: '/login' });
  }
  async function handleSignOutAll() {
    await logoutAllDevices();
    clear();
    void navigate({ to: '/login' });
  }
```

(c) Replace the existing sign-out `<Button>` block in the header:
```tsx
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.auth.signOut}
            onClick={() => {
              clear();
              void navigate({ to: '/login' });
            }}
          >
            <LogOut className="size-4" />
          </Button>
```
with:
```tsx
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.auth.accountMenu}>
                <LogOut className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void handleSignOut()}>
                {t.auth.signOut}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleSignOutAll()}>
                {t.auth.signOutAllDevices}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm test --run src/components/common/AppShell.test.tsx`
Expected: PASS — both new sign-out tests pass; the app-name/email test and the sidebar-toggle test are unchanged. (The Radix dropdown opens in jsdom thanks to the pointer-capture shims in `src/test/setup.ts`.)

- [ ] **Step 6: Full verification + commit**

Run all gates:
```bash
pnpm test --run
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```
Expected: tests PASS; tsc no errors; lint shows only the pre-existing React-Compiler / react-hook-form warnings (do not fix); build succeeds.

```bash
git add src/lib/i18n/messages.id.ts src/components/common/AppShell.tsx src/components/common/AppShell.test.tsx
git commit -m "feat(auth): logout user-menu with single + all-devices sign-out

Replace the sign-out icon button with a DropdownMenu: 'Keluar' (this device,
best-effort POST /auth/logout) and 'Keluar dari semua perangkat'
(POST /auth/logout-all). Local session is always cleared."
```

---

## Self-Review

**1. Spec coverage:**
- Spec Change 1A (flip both to `paginated: true`) → Task 1 Step 3. ✓
- Spec Change 1B (pager UI on both list pages, page-scoped search) → Tasks 2 & 3. ✓
- Spec Change 1C (MSW envelope handlers) → Task 1 Steps 1–2 (default) + Step 5 (overrides). ✓
- Spec Change 1D (no Zod schema changes) → respected; no schema files touched. ✓
- Spec Change 2A (logout API helpers, best-effort) → Task 4. ✓
- Spec Change 2B (sign-out DropdownMenu with two items; `clear()` unchanged; navigation in AppShell) → Task 5. Note: the spec mentioned an optional `useSignOut()` hook "for testability"; this plan inlines the two handlers in AppShell instead (YAGNI — `clear()` is trivially available and AppShell already owns navigation; testability is covered by `logout.test.ts` unit tests + AppShell integration tests). ✓
- Spec Change 2C (i18n `signOutAllDevices`; keep `signOut`) → Task 5 Step 1. Added `accountMenu` for the trigger's accessible name (avoids name collision between the trigger and the "Keluar" menu item). ✓
- Spec testing section → covered across tasks; full gate in Task 5 Step 6. ✓
- Spec out-of-scope items → not implemented, recorded in Global Constraints. ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Full file bodies given for the two page rewrites and `logout.ts`; exact before/after snippets for handler/AppShell edits; every override site enumerated by file+line. ✓

**3. Type consistency:** `paged<T>(data, limit?, offset?)` defined in Task 1, reused verbatim in Tasks 2–3 tests. `logoutCurrentDevice` / `logoutAllDevices` names match between Task 4 (definition) and Task 5 (import). `usePagedList`/`useList` signatures match the factory. `Pagination` prop names (`offset`, `limit`, `total`, `onChange`) match the component. i18n keys (`signOut`, `signOutAllDevices`, `accountMenu`, `common.searchOnThisPage`) match usages. ✓

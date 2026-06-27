# Master-data Layer Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the duplicated master-data form-dialog and list-page patterns (accounts / partners / tax codes) into two config-driven modules — `MasterDataFormDialog` and `MasterDataListPage` + `useMasterDataListController` — the activate/deactivate/delete siblings of `DocumentEditor` / `DocumentListPage`.

**Architecture:** A new `src/features/master-data/` home (parallel to `src/features/documents/`). `MasterDataFormDialog` is a component owning the `FormDialog` shell + RHF + submit lifecycle + the root/code error block, with fields supplied via a `(form) => ReactNode` render-prop. `MasterDataListPage(config)` on `useMasterDataListController(config)` owns offset/search-reset/activate-deactivate-delete-confirm/pagination, with a `renderData?` slot for accounts' type-grouped display. Behavior-preserving except one settled consistency fix (partner create now shows the 409 `code` error).

**Tech Stack:** React 19 + React Compiler, TypeScript strict, react-hook-form + `@hookform/resolvers/zod`, Zod, TanStack Query/Table, sonner, Vitest + RTL/MSW.

## Global Constraints

- **Behavior-preserving EXCEPT one settled change:** `MasterDataFormDialog` always renders the `root` and `code` error blocks; `AccountFormDialog` and `TaxCodeFormDialog` create forms already show `code`, so only **`PartnerFormDialog`'s create form** changes (it gains the 409 duplicate-code error display it currently sets but never renders). No other user-facing change; routes / nav labels / form-field names / aria-labels unchanged.
- **i18n:** all copy via `useT()`; no hardcoded user-facing strings; no em-dashes. Feature-specific field-error translation helpers (`msg`/`err`) stay in the feature fields.
- **Typecheck reality:** `pnpm run build` (`tsc -b && vite build`) is the real typecheck (NOT `tsc --noEmit`). Run before each commit.
- **Lint:** stays at 0 errors / the 8 pre-existing React-Compiler/react-hook-form/TanStack-Table warnings. The generic component will reuse the same isolated casts `DocumentEditor` uses (`zodResolver(schema as any)`, `handleSubmit(onSubmit as never)`) — these are expected, not new lint errors.
- **Commands:** Build `pnpm run build` · Tests `pnpm test --run` · one file `pnpm test --run <path>` · Lint `pnpm run lint`.

## File Structure

- **Create** `src/features/master-data/MasterDataFormDialog.tsx` (+ `.test.tsx`) — Task 1.
- **Create** `src/features/master-data/useMasterDataListController.ts`, `src/features/master-data/MasterDataListPage.tsx` (+ a `.test.tsx`) — Task 2.
- **Modify** the 3 form dialogs (Task 1) and the 3 list pages (Task 2) to consume the modules.
- **Unchanged:** `FormDialog`, `ConfirmDialog`, `DataTable`, `Pagination`, `QueryState`, `RoleGate`, `SkeletonTable`, the resource-hooks factory, the `columns.ts` builders, all schemas, routes/nav.

---

### Task 1: `MasterDataFormDialog` + migrate the three form dialogs

**Files:**
- Create: `src/features/master-data/MasterDataFormDialog.tsx`, `src/features/master-data/MasterDataFormDialog.test.tsx`
- Modify: `src/features/accounts/AccountFormDialog.tsx`, `src/features/partners/PartnerFormDialog.tsx`, `src/features/tax-codes/TaxCodeFormDialog.tsx`

**Interfaces:**
- Produces: `MasterDataFormDialog<TValues>({ open, onOpenChange, title, description?, schema, defaultValues, resetOnSuccess?, submit, fields })` where `submit: (values: TValues) => Promise<unknown>` and `fields: (form: UseFormReturn<TValues>) => ReactNode`.

- [ ] **Step 1: Write the failing interface test**

Create `src/features/master-data/MasterDataFormDialog.test.tsx`:

```tsx
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/stores/session';
import { MasterDataFormDialog } from './MasterDataFormDialog';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { toast } from 'sonner';

afterEach(() => { vi.clearAllMocks(); useSession.getState().clear(); });

const schema = z.object({ code: z.string().min(1), name: z.string().min(1) });
type V = z.infer<typeof schema>;

function renderDialog(submit: (v: V) => Promise<unknown>) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MasterDataFormDialog<V>
        open onOpenChange={() => {}}
        title="New thing"
        schema={schema}
        defaultValues={{ code: '', name: '' }}
        resetOnSuccess
        submit={submit}
        fields={(form) => (
          <>
            <input aria-label="code" {...form.register('code')} />
            <input aria-label="name" {...form.register('name')} />
          </>
        )}
      />
    </QueryClientProvider>,
  );
}

it('submits valid values, then toasts success', async () => {
  const user = userEvent.setup();
  const submit = vi.fn().mockResolvedValue({});
  renderDialog(submit);
  await user.type(screen.getByLabelText('code'), 'C1');
  await user.type(screen.getByLabelText('name'), 'Name');
  await user.click(screen.getByRole('button', { name: /simpan|save/i }));
  expect(submit).toHaveBeenCalledWith({ code: 'C1', name: 'Name' });
  expect(toast.success).toHaveBeenCalled();
});

it('routes a 409 to the code field error (shown)', async () => {
  const user = userEvent.setup();
  const submit = vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'CONFLICT', message: 'dup' }));
  renderDialog(submit);
  await user.type(screen.getByLabelText('code'), 'C1');
  await user.type(screen.getByLabelText('name'), 'Name');
  await user.click(screen.getByRole('button', { name: /simpan|save/i }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(toast.success).not.toHaveBeenCalled();
});

it('blocks submit when validation fails', async () => {
  const user = userEvent.setup();
  const submit = vi.fn();
  renderDialog(submit);
  await user.click(screen.getByRole('button', { name: /simpan|save/i }));
  expect(submit).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it — confirm it fails**

Run: `pnpm test --run src/features/master-data/MasterDataFormDialog.test.tsx`
Expected: FAIL — cannot resolve `./MasterDataFormDialog`.

- [ ] **Step 3: Implement `MasterDataFormDialog`**

Create `src/features/master-data/MasterDataFormDialog.tsx`:

```tsx
import type { ReactNode } from 'react';
import { useForm, type UseFormReturn, type FieldValues, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { ZodType } from 'zod';
import { FormDialog } from '@/components/common/FormDialog';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { useT } from '@/lib/i18n/useT';

export interface MasterDataFormDialogProps<TValues extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: ZodType<TValues>;
  defaultValues: DefaultValues<TValues>;
  /** Reset the form after a successful submit (true for create, false for edit). */
  resetOnSuccess?: boolean;
  /** Perform the mutation; throw on failure (use `mutateAsync`). */
  submit: (values: TValues) => Promise<unknown>;
  fields: (form: UseFormReturn<TValues>) => ReactNode;
}

/** A validated master-data dialog form bound to one submit. Owns the FormDialog
 *  shell, RHF setup, the submit → success-toast/reset/close · error → form lifecycle,
 *  and the shared root + code error block. Fields are supplied per resource. */
export function MasterDataFormDialog<TValues extends FieldValues>({
  open, onOpenChange, title, description, schema, defaultValues, resetOnSuccess, submit, fields,
}: MasterDataFormDialogProps<TValues>) {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<TValues>({ resolver: zodResolver(schema as any), defaultValues });

  async function onSubmit(values: TValues) {
    try {
      await submit(values);
      toast.success(t.crud.saved);
      if (resetOnSuccess) form.reset();
      onOpenChange(false);
    } catch (err) {
      applyApiErrorToForm(err, form, t);
    }
  }

  const errors = form.formState.errors as Record<string, { message?: string } | undefined>;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      onSubmit={form.handleSubmit(onSubmit as never)}
      pending={form.formState.isSubmitting}
    >
      {fields(form)}
      {errors.root ? <p role="alert" className="text-sm text-destructive">{errors.root.message}</p> : null}
      {errors.code ? <p role="alert" className="text-sm text-destructive">{errors.code.message}</p> : null}
    </FormDialog>
  );
}
```

- [ ] **Step 4: Run it — confirm it passes**

Run: `pnpm test --run src/features/master-data/MasterDataFormDialog.test.tsx`
Expected: PASS (3 tests). If the success test fails on `pending`, confirm `form.formState.isSubmitting` is true through the awaited submit (it is — `handleSubmit` awaits an async handler).

- [ ] **Step 5: Migrate `AccountFormDialog`**

Rewrite `src/features/accounts/AccountFormDialog.tsx` so each sub-form renders `MasterDataFormDialog`. Keep the exact field JSX (move it verbatim into a `fields` render-prop), and keep the subtype→type/normalBalance derivation effect inside the create fields (it uses `form`). The two sub-forms become:

```tsx
function CreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const create = accountsApi.useCreate();
  return (
    <MasterDataFormDialog<AccountCreateValues>
      open={open}
      onOpenChange={onOpenChange}
      title={t.accounts.newAccount}
      schema={accountCreateSchema}
      defaultValues={{
        code: '', name: '', subtype: 'CURRENT_ASSET', type: 'ASSET',
        normalBalance: 'DEBIT', cashFlowCategory: 'NONE', isPostable: true, parentCode: '',
      }}
      resetOnSuccess
      submit={(values) => create.mutateAsync({ ...values, parentCode: values.parentCode || undefined })}
      fields={(form) => <AccountCreateFields form={form} />}
    />
  );
}

function EditForm({ account, open, onOpenChange }: { account: Account; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const update = accountsApi.useUpdate();
  return (
    <MasterDataFormDialog<AccountEditValues>
      open={open}
      onOpenChange={onOpenChange}
      title={t.accounts.editAccount}
      description={`${account.code} — ${account.name}`}
      schema={accountEditSchema}
      defaultValues={{ name: account.name, cashFlowCategory: account.cashFlowCategory ?? 'NONE', isActive: account.isActive }}
      submit={(values) => update.mutateAsync({ id: account.id, data: values })}
      fields={(form) => <AccountEditFields form={form} />}
    />
  );
}
```

Extract the existing field JSX (today's lines 75–127 for create, 170–187 for edit) **verbatim** into `AccountCreateFields({ form }: { form: UseFormReturn<AccountCreateValues> })` and `AccountEditFields({ form }: { form: UseFormReturn<AccountEditValues> })`, dropping each sub-form's now-duplicated `root`/`code` error blocks (the module renders them). The `subtype` `useEffect` derivation moves into `AccountCreateFields`. Keep the `Field` helper. Remove the now-unused `toast`/`applyApiErrorToForm`/`zodResolver`/`useForm` imports if no longer referenced in this file (the field components don't need them).

- [ ] **Step 6: Migrate `PartnerFormDialog`**

Rewrite `src/features/partners/PartnerFormDialog.tsx` the same way. The create form's `submit` is `(values) => create.mutateAsync(values)`; edit's is `(values) => update.mutateAsync({ id: partner.id, data: values })` (no `resetOnSuccess` on edit, `resetOnSuccess` on create). Move the existing `CreateFields`/`SharedFields` JSX into the `fields` render-prop (they already take `form`). **Delete the dialogs' own `RootError` component and stop rendering it inside the fields** — the module now renders root + code. (This is the settled change: partner create now shows the 409 `code` error.) Keep the `msg`/`SharedFields` field-error helpers and the npwp/email/isCustomer inline field errors — those are field-specific and stay in `SharedFields`.

- [ ] **Step 7: Migrate `TaxCodeFormDialog`**

Rewrite `src/features/tax-codes/TaxCodeFormDialog.tsx` the same way. Create `submit` = `(values) => create.mutateAsync({ code: values.code, name: values.name, kind: values.kind, rate: percentToFraction(values.ratePercent), taxAccountId: values.taxAccountId })`; edit `submit` = `(values) => update.mutateAsync({ id: taxCode.id, data: { name: values.name, rate: percentToFraction(values.ratePercent), isActive: values.isActive } })`. Move the existing field JSX (kind select, rate, `AccountSelect`, etc.) verbatim into `fields`, dropping the in-fields `root`/`code` error blocks (the module renders them; tax-code create already showed both, so no behavior change here). Keep the `err`/`KIND_OPTIONS` helpers and the inline `ratePercent`/`taxAccountId` field errors.

- [ ] **Step 8: Run the migrated dialogs' tests + build**

Run: `pnpm test --run src/features/accounts src/features/partners src/features/tax-codes`
Expected: PASS. The 3 form-dialog tests stay green; if a `PartnerFormDialog` test asserts the duplicate-code error is *absent* on create, update it to assert it now appears (the settled fix). No other assertion changes.
Run: `pnpm run build` → succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/features/master-data/MasterDataFormDialog.tsx src/features/master-data/MasterDataFormDialog.test.tsx src/features/accounts/AccountFormDialog.tsx src/features/partners/PartnerFormDialog.tsx src/features/tax-codes/TaxCodeFormDialog.tsx
git commit -m "refactor(master-data): MasterDataFormDialog — config-driven dialog form

Owns FormDialog + RHF + submit lifecycle + root/code error block; the three
master-data dialogs supply schema/defaults/submit/fields. Partner create now
shows the 409 code error (was set but never rendered). Behavior otherwise unchanged."
```

---

### Task 2: `MasterDataListPage` + `useMasterDataListController` + migrate the three pages

**Files:**
- Create: `src/features/master-data/useMasterDataListController.ts`, `src/features/master-data/MasterDataListPage.tsx`, `src/features/master-data/MasterDataListPage.test.tsx`
- Modify: `src/features/accounts/AccountsPage.tsx`, `src/features/partners/PartnersPage.tsx`, `src/features/tax-codes/TaxCodesPage.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 (independent; the pages render their feature dialogs via a `formDialog` slot).
- Produces: `useMasterDataListController<TItem>(config)` and `MasterDataListPage<TItem>(config)` with the `MasterDataListConfig<TItem>` below.

- [ ] **Step 1: Implement the controller**

Create `src/features/master-data/useMasterDataListController.ts`:

```ts
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';

export interface MasterDataActionHandlers<TItem> {
  onEdit: (item: TItem) => void;
  onToggleActive: (item: TItem) => void;
  onDelete: (item: TItem) => void;
}

type Mutation = UseMutationResult<unknown, ApiError, string>;

export interface MasterDataActions {
  activate: Mutation;
  deactivate: Mutation;
  remove: Mutation;
}

export function useMasterDataListController<TItem extends { id: string; isActive: boolean }>(
  actions: MasterDataActions,
  limit: number,
) {
  const t = useT();
  const [offset, setOffset] = useState(0);
  const [search, setSearchRaw] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TItem | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'delete'; item: TItem } | null>(null);

  // Search resets pagination to the first page — the offset-reset invariant.
  const setSearch = (v: string) => { setSearchRaw(v); setOffset(0); };

  const handlers: MasterDataActionHandlers<TItem> = useMemo(
    () => ({
      onEdit: (item) => setEditing(item),
      onToggleActive: (item) =>
        item.isActive
          ? setConfirm({ kind: 'deactivate', item })
          : actions.activate.mutate(item.id, {
              onSuccess: () => toast.success(t.crud.activated),
              onError: () => toast.error(t.common.error),
            }),
      onDelete: (item) => setConfirm({ kind: 'delete', item }),
    }),
    [actions, t],
  );

  function runConfirm() {
    if (!confirm) return;
    const action = confirm.kind === 'deactivate' ? actions.deactivate : actions.remove;
    const okMsg = confirm.kind === 'deactivate' ? t.crud.deactivated : t.crud.deleted;
    action.mutate(confirm.item.id, {
      onSuccess: () => { toast.success(okMsg); setConfirm(null); },
      onError: () => toast.error(t.common.error),
    });
  }

  const confirmProps = {
    open: !!confirm,
    onOpenChange: (o: boolean) => { if (!o) setConfirm(null); },
    title: confirm?.kind === 'delete' ? t.crud.confirmDeleteTitle : t.crud.confirmDeactivateTitle,
    description: confirm?.kind === 'delete' ? t.crud.confirmDeleteDesc : undefined,
    confirmLabel: confirm?.kind === 'delete' ? t.common.delete : t.crud.deactivate,
    destructive: confirm?.kind === 'delete',
    pending: actions.deactivate.isPending || actions.remove.isPending,
    onConfirm: runConfirm,
  };

  return { offset, setOffset, search, setSearch, creating, setCreating, editing, setEditing, handlers, confirmProps, limit };
}
```

- [ ] **Step 2: Implement the page**

Create `src/features/master-data/MasterDataListPage.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/errors';
import type { Role } from '@/stores/session';
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
import { useMasterDataListController, type MasterDataActions, type MasterDataActionHandlers } from './useMasterDataListController';

type Envelope<TItem> = { data: TItem[]; total: number; limit: number; offset: number };

export interface MasterDataListConfig<TItem extends { id: string; isActive: boolean }> {
  title: string;
  newRole?: Role[];
  list: UseQueryResult<Envelope<TItem>, ApiError>;
  actions: MasterDataActions;
  columns: (handlers: MasterDataActionHandlers<TItem>) => ColumnDef<TItem, unknown>[];
  /** Page-scoped row filter; default matches `code`/`name` (case-insensitive). */
  search?: (item: TItem, q: string) => boolean;
  /** Skeleton column count. Default 4. */
  skeletonCols?: number;
  /** Row rendering; default a flat DataTable. Accounts overrides with type grouping. */
  renderData?: (rows: TItem[], columns: ColumnDef<TItem, unknown>[]) => ReactNode;
  /** Renders the feature's create/edit dialog. */
  formDialog: (props: { open: boolean; onOpenChange: (o: boolean) => void; mode: 'create' | 'edit'; item?: TItem }) => ReactNode;
  limit?: number;
}

const DEFAULT_ROLES: Role[] = ['ACCOUNTANT', 'APPROVER', 'ADMIN'];

function defaultSearch(item: { code?: string; name?: string }, q: string): boolean {
  if (!q) return true;
  const l = q.toLowerCase();
  return (item.code?.toLowerCase().includes(l) ?? false) || (item.name?.toLowerCase().includes(l) ?? false);
}

export function MasterDataListPage<TItem extends { id: string; isActive: boolean; code?: string; name?: string }>(
  config: MasterDataListConfig<TItem>,
) {
  const t = useT();
  const limit = config.limit ?? 20;
  const c = useMasterDataListController<TItem>(config.actions, limit);
  const columns = config.columns(c.handlers);
  const match = config.search ?? defaultSearch;
  const renderRows = config.renderData ?? ((rows, cols) => <DataTable columns={cols} data={rows} />);

  return (
    <div>
      <PageHeader
        title={config.title}
        actions={
          <RoleGate allow={config.newRole ?? DEFAULT_ROLES}>
            <Button onClick={() => c.setCreating(true)}><Plus className="size-4" /> {t.crud.new}</Button>
          </RoleGate>
        }
      />

      <div className="mb-4 max-w-xs space-y-1">
        <Input placeholder={t.common.search} value={c.search} onChange={(e) => c.setSearch(e.target.value)} />
        <p className="text-xs text-muted-foreground">{t.common.searchOnThisPage}</p>
      </div>

      <QueryState query={config.list} loading={<SkeletonTable rows={8} cols={config.skeletonCols ?? 4} />} onRetry>
        {(env) => {
          const rows = env.data.filter((item) => match(item, c.search));
          return (
            <>
              {renderRows(rows, columns)}
              <Pagination offset={c.offset} limit={limit} total={env.total} onChange={c.setOffset} />
            </>
          );
        }}
      </QueryState>

      {config.formDialog({ open: c.creating, onOpenChange: c.setCreating, mode: 'create' })}
      {config.formDialog({ open: !!c.editing, onOpenChange: (o) => { if (!o) c.setEditing(null); }, mode: 'edit', item: c.editing ?? undefined })}

      <ConfirmDialog {...c.confirmProps} />
    </div>
  );
}
```

(Confirm `Role` is exported from `@/stores/session`; if it lives elsewhere — e.g. `@/components/common/RoleGate` — import it from there instead. The implementer verifies the exact export site.)

- [ ] **Step 3: Write the controller/page interface test**

Create `src/features/master-data/MasterDataListPage.test.tsx` — drive it with a synthetic master-data resource via MSW (mirror the `DocumentListPage` test harness). Cover: (1) typing in search resets `offset` to 0 (assert the `?offset=0` request after a page change); (2) toggling an **active** row opens the deactivate `ConfirmDialog` and confirming calls the deactivate mutation + success toast; (3) toggling an **inactive** row activates immediately (no dialog); (4) delete opens the destructive confirm. Use `vi.mock('sonner')`. Keep assertions behavioral (roles, dialog text, request offset), not implementation-detail.

```tsx
// Harness: build a synthetic resource with createMasterDataHooks('mdtest', '/mdtest'),
// render <MasterDataListPage config={...}/> with columns exposing buttons that call
// handlers.onToggleActive / onDelete, and MSW handlers for /mdtest (paged envelope),
// /mdtest/:id/deactivate, /mdtest/:id (DELETE), /mdtest/:id (PATCH isActive).
// Assert the four behaviors above. (Full harness ~70 lines — model it on
// src/features/documents/DocumentListPage.test.tsx.)
```

Run: `pnpm test --run src/features/master-data/MasterDataListPage.test.tsx` → PASS.

- [ ] **Step 4: Migrate `PartnersPage` (the flat baseline)**

Rewrite `src/features/partners/PartnersPage.tsx` to a config (the flat case — default `renderData`):

```tsx
import { MasterDataListPage } from '@/features/master-data/MasterDataListPage';
import { buildPartnerColumns } from './columns';
import { PartnerFormDialog } from './PartnerFormDialog';
import { partnersApi } from './hooks';
import type { Partner } from './schema';
import { useT } from '@/lib/i18n/useT';

const LIMIT = 20;

export function PartnersPage() {
  const t = useT();
  return (
    <MasterDataListPage<Partner>
      title={t.partners.title}
      list={partnersApi.usePagedList({ limit: LIMIT, offset: 0 })}  /* see note */
      actions={{ activate: partnersApi.useActivate(), deactivate: partnersApi.useDeactivate(), remove: partnersApi.useRemove() }}
      columns={(h) => buildPartnerColumns(t, h)}
      skeletonCols={5}
      formDialog={(p) => <PartnerFormDialog open={p.open} onOpenChange={p.onOpenChange} mode={p.mode} partner={p.item} />}
      limit={LIMIT}
    />
  );
}
```

**Offset wiring note (resolve before finishing this step):** `usePagedList` needs the controller's live `offset`, but the controller is created *inside* `MasterDataListPage`. Two clean options — pick one and apply consistently to all three pages:
- **(a)** Move the `usePagedList` call inside `MasterDataListPage`: add `usePagedList: (q) => UseQueryResult<Envelope<TItem>, ApiError>` to the config instead of a ready `list`, and the page calls `config.usePagedList({ limit, offset: c.offset })`. (Preferred — keeps offset ownership in the controller.)
- **(b)** Have `useMasterDataListController` expose `offset` and the page pass it back up — not possible since the page owns the controller; so **(a)** is the right shape. Update the `MasterDataListConfig` (Step 2) to take `usePagedList: (query: { limit: number; offset: number }) => UseQueryResult<Envelope<TItem>, ApiError>` and call it as `config.usePagedList({ limit, offset: c.offset })`, replacing the `list` field. Each page passes `usePagedList={partnersApi.usePagedList}`.

(Apply option (a) to the Step-2 module before migrating pages. It is the intended design; the `list` field above is a simplification to correct here.)

- [ ] **Step 5: Migrate `TaxCodesPage`**

Rewrite `src/features/tax-codes/TaxCodesPage.tsx` the same way: `taxCodesApi`, `buildTaxCodeColumns`, `TaxCodeFormDialog` (`taxCode={p.item}`), the page's existing `skeletonCols`, default flat `renderData`. Preserve any tax-code-specific search predicate if it differs from code/name (it doesn't — keep default).

- [ ] **Step 6: Migrate `AccountsPage` (the grouped case)**

Rewrite `src/features/accounts/AccountsPage.tsx` to a config that supplies `renderData` for the type-grouped display (move today's grouping JSX — `ACCOUNT_TYPE_ORDER.map(... per-type DataTable ...)` — into the slot verbatim):

```tsx
renderData={(rows, columns) => {
  const grouped = ACCOUNT_TYPE_ORDER.map((type) => ({
    type,
    rows: rows.filter((a) => a.type === type).sort((x, y) => x.code.localeCompare(y.code)),
  })).filter((g) => g.rows.length > 0);
  return (
    <div className="space-y-8">
      {grouped.map((g) => (
        <section key={g.type}>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{t.accounts[TYPE_LABEL[g.type]]}</h2>
          <DataTable columns={columns} data={g.rows} />
        </section>
      ))}
    </div>
  );
}}
```
Keep the `TYPE_LABEL` map + `buildAccountColumns` + `AccountFormDialog` (`account={p.item}`). The grouping reads `a.type`, so `TItem = Account` (which has `type`); the default code/name search still applies before grouping.

- [ ] **Step 7: Run the migrated page tests + the full gate**

Run: `pnpm test --run src/features/accounts src/features/partners src/features/tax-codes src/features/master-data`
Expected: PASS — the 3 page tests stay green (grouped accounts display preserved; search/pagination/confirm flows preserved).
Then the **full gate**:
```bash
pnpm run build
pnpm test --run
pnpm run lint
```
Expected: build clean (real `tsc -b`); full suite green; lint 0 errors / 8 pre-existing warnings.

- [ ] **Step 8: Commit**

```bash
git add src/features/master-data/useMasterDataListController.ts src/features/master-data/MasterDataListPage.tsx src/features/master-data/MasterDataListPage.test.tsx src/features/accounts/AccountsPage.tsx src/features/partners/PartnersPage.tsx src/features/tax-codes/TaxCodesPage.tsx
git commit -m "refactor(master-data): MasterDataListPage + useMasterDataListController

Config-driven master-data list (the activate/deactivate/delete sibling of
DocumentListPage). Controller owns offset/search-reset/confirm flow/pagination;
a renderData slot preserves accounts' type-grouped display. The three pages
become configs. Behavior unchanged."
```

---

## Self-Review

**1. Spec coverage:**
- `MasterDataFormDialog` (component + render-prop fields, owns shell/RHF/submit-lifecycle/root+code error) → Task 1 Step 3. ✓
- The settled consistency fix (partner create shows the 409 `code` error; account/tax-code already did) → Task 1 Steps 3, 6, 8. ✓
- `MasterDataListPage` + `useMasterDataListController` (offset/search-reset/activate-deactivate-delete-confirm/pagination), separate from DocumentListPage → Task 2 Steps 1–2. ✓
- Accounts' type-grouped display via `renderData` slot → Task 2 Step 6. ✓
- All three forms + three pages migrated; Documents untouched → Tasks 1–2. ✓
- Behavior-preserving except the one fix; build/lint gate → Global Constraints + Task 2 Step 7. ✓

**2. Placeholder scan:** Full code for both modules + the form-dialog test; the list-page test is specified behaviorally with a harness pointer to the existing `DocumentListPage.test.tsx` (a genuine model, not a TODO — the four behaviors to assert are enumerated). The per-feature field/column JSX is *relocated verbatim* (it already exists), not re-invented. The Step-4 offset note flags and resolves a real wiring decision (config takes `usePagedList`, not a ready `list`) — apply option (a) to Step 2.

**3. Type consistency:** `MasterDataFormDialog<TValues extends FieldValues>` — `submit: (values: TValues) => Promise<unknown>`, `fields: (form: UseFormReturn<TValues>) => ReactNode`. The isolated casts (`zodResolver(schema as any)`, `handleSubmit(onSubmit as never)`, `errors as Record<…>`) match `DocumentEditor`'s approach. `MasterDataListConfig<TItem extends { id; isActive; code?; name? }>` — `columns(handlers)`, `usePagedList(query)` (per the Step-4 resolution), `actions: {activate,deactivate,remove}` typed `UseMutationResult<unknown, ApiError, string>` (the factory's `useActivate/useDeactivate/useRemove` shape), `renderData?(rows, columns)`, `formDialog({open,onOpenChange,mode,item})`. Accounts passes `TItem = Account` (has `type` for grouping).

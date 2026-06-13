# Plan 2a — Shared CRUD Layer + Chart of Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable role-gated CRUD machinery (`createResourceHooks` data layer, `applyApiErrorToForm` error mapper, and the shared `FormDialog`/`ConfirmDialog`/`RowActions` UI bricks) and prove it on the Chart of Accounts screen — a flat type-grouped table with a subtype-driven create form and ADMIN soft-delete.

**Architecture:** A typed hook factory wraps `apiFetch` for list/item/create/update/deactivate/remove with automatic React Query cache invalidation; a shared error mapper turns the API error envelope into React Hook Form field errors + toasts. The Accounts feature is a thin consumer: a Zod item schema, a `createResourceHooks` instance, hand-written columns/page, and a subtype-driven form whose `type`/`normalBalance` derive from a static `account-meta` map. Built on the Plan 1 foundation (`apiFetch`/`ApiError`, `RoleGate`, `DataTable`, `useT`, MSW).

**Tech Stack:** React 19, TanStack Query v5 + Router, Zod v4, React Hook Form + @hookform/resolvers, shadcn/ui (+ alert-dialog, checkbox, switch, popover, command), sonner, Vitest + RTL + MSW, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-13-accounts-partners-tax-codes-design.md`.

---

## Canonical interfaces (used across tasks — keep names/signatures consistent)

```ts
// src/lib/crud/createResourceHooks.ts
interface ResourceConfig<TItem> { key: string; basePath: string; itemSchema: ZodType<TItem>; }
interface ResourceKeys {
  all: readonly unknown[];
  list: () => readonly unknown[];
  item: (id: string) => readonly unknown[];
}
function createResourceKeys(key: string): ResourceKeys;
function createResourceHooks<TItem, TCreate = unknown, TUpdate = unknown>(config: ResourceConfig<TItem>): {
  keys: ResourceKeys;
  useList():       UseQueryResult<TItem[], ApiError>;          // GET basePath
  useItem(id):     UseQueryResult<TItem, ApiError>;            // GET basePath/:id
  useCreate():     UseMutationResult<TItem, ApiError, TCreate>;            // POST basePath
  useUpdate():     UseMutationResult<TItem, ApiError, {id: string; data: TUpdate}>; // PATCH basePath/:id
  useDeactivate(): UseMutationResult<unknown, ApiError, string>;  // POST basePath/:id/deactivate (arg = id)
  useRemove():     UseMutationResult<unknown, ApiError, string>;  // DELETE basePath/:id (arg = id)
};

// src/lib/api/form-errors.ts
function applyApiErrorToForm(error: unknown, form: UseFormReturn<any>, t: Messages): void;

// src/components/common/FormDialog.tsx
interface FormDialogProps {
  open: boolean; onOpenChange: (o: boolean) => void;
  title: string; description?: string;
  onSubmit: () => void;          // wire to form.handleSubmit(...) by the caller
  submitLabel?: string; pending?: boolean; children: React.ReactNode;
}
// src/components/common/ConfirmDialog.tsx
interface ConfirmDialogProps {
  open: boolean; onOpenChange: (o: boolean) => void;
  title: string; description?: string;
  confirmLabel: string; onConfirm: () => void; pending?: boolean; destructive?: boolean;
}
// src/components/common/RowActions.tsx
interface RowActionsProps { onEdit: () => void; onDeactivate?: () => void; onDelete?: () => void; }
// src/components/common/StatusBadge.tsx
function StatusBadge(props: { active: boolean }): JSX.Element;

// src/features/accounts/account-meta.ts
type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
type NormalBalance = 'DEBIT' | 'CREDIT';
type AccountSubtype = 'EQUITY'|'REVENUE'|'CURRENT_ASSET'|'NON_CURRENT_ASSET'|'FIXED_ASSET'|'ACCUMULATED_DEPRECIATION'|'CURRENT_LIABILITY'|'NON_CURRENT_LIABILITY'|'COGS'|'OPERATING_EXPENSE'|'OTHER_INCOME'|'OTHER_EXPENSE'|'TAX_PAYABLE'|'TAX_RECEIVABLE';
const SUBTYPE_META: Record<AccountSubtype, { type: AccountType; defaultNormalBalance: NormalBalance; label: string }>;
const ACCOUNT_TYPE_ORDER: AccountType[]; // ['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE']
```

---

## File structure created by this plan

```
src/lib/crud/createResourceHooks.ts          # the factory + createResourceKeys
src/lib/crud/createResourceHooks.test.ts
src/lib/api/form-errors.ts                    # applyApiErrorToForm
src/lib/api/form-errors.test.ts
src/components/common/{FormDialog,ConfirmDialog,RowActions,StatusBadge}.tsx (+ RowActions.test.tsx)
src/lib/i18n/messages.id.ts                   # MODIFY: add `crud` + `accounts` groups
src/features/accounts/
  account-meta.ts (+ account-meta.test.ts)
  schema.ts                                   # Zod item + create/edit form schemas
  hooks.ts                                    # createResourceHooks<Account,...>(...)
  columns.tsx                                 # DataTable columns
  AccountFormDialog.tsx
  AccountsPage.tsx (+ AccountsPage.test.tsx)
src/app/routes/_app/accounts.tsx              # MODIFY: render <AccountsPage/>
src/test/handlers.ts                          # MODIFY: add accounts CRUD fixtures
```

---

## Task 1: Resource keys + `createResourceHooks` factory (TDD)

**Files:**
- Create: `src/lib/crud/createResourceHooks.ts`, `src/lib/crud/createResourceHooks.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/lib/crud/createResourceHooks.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { createResourceHooks, createResourceKeys } from './createResourceHooks';

const widgetSchema = z.object({ id: z.string(), name: z.string() });
type Widget = z.infer<typeof widgetSchema>;
const widgets = createResourceHooks<Widget, { name: string }, { name: string }>({
  key: 'widgets',
  basePath: '/widgets',
  itemSchema: widgetSchema,
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

afterEach(() => useSession.getState().clear());

describe('createResourceKeys', () => {
  it('builds prefix-shaped keys', () => {
    const k = createResourceKeys('widgets');
    expect(k.all).toEqual(['widgets']);
    expect(k.list()).toEqual(['widgets', 'list']);
    expect(k.item('7')).toEqual(['widgets', 'item', '7']);
  });
});

describe('createResourceHooks', () => {
  it('useList fetches and parses a bare array', async () => {
    server.use(http.get(`${API}/widgets`, () => HttpResponse.json([{ id: '1', name: 'A' }])));
    const { result } = renderHook(() => widgets.useList(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: '1', name: 'A' }]);
  });

  it('useCreate posts the body and invalidates the list (refetch reflects the new item)', async () => {
    let created = false;
    server.use(
      http.get(`${API}/widgets`, () =>
        HttpResponse.json(created ? [{ id: '1', name: 'A' }, { id: '2', name: 'B' }] : [{ id: '1', name: 'A' }]),
      ),
      http.post(`${API}/widgets`, async ({ request }) => {
        const body = (await request.json()) as { name: string };
        created = true;
        return HttpResponse.json({ id: '2', name: body.name });
      }),
    );
    const { result } = renderHook(
      () => ({ list: widgets.useList(), create: widgets.useCreate() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(1));
    await result.current.create.mutateAsync({ name: 'B' });
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
  });

  it('useDeactivate posts to /:id/deactivate', async () => {
    let hit = '';
    server.use(http.post(`${API}/widgets/9/deactivate`, () => { hit = 'deactivate'; return HttpResponse.json({}); }));
    const { result } = renderHook(() => widgets.useDeactivate(), { wrapper });
    await result.current.mutateAsync('9');
    expect(hit).toBe('deactivate');
  });

  it('useRemove deletes /:id', async () => {
    let method = '';
    server.use(http.delete(`${API}/widgets/9`, () => { method = 'DELETE'; return HttpResponse.json({}); }));
    const { result } = renderHook(() => widgets.useRemove(), { wrapper });
    await result.current.mutateAsync('9');
    expect(method).toBe('DELETE');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/crud/createResourceHooks.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the factory**

Create `src/lib/crud/createResourceHooks.ts`:
```ts
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ZodType } from 'zod';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';

export interface ResourceConfig<TItem> {
  key: string;
  basePath: string;
  itemSchema: ZodType<TItem>;
}

export interface ResourceKeys {
  all: readonly unknown[];
  list: () => readonly unknown[];
  item: (id: string) => readonly unknown[];
}

export function createResourceKeys(key: string): ResourceKeys {
  return {
    all: [key],
    list: () => [key, 'list'],
    item: (id: string) => [key, 'item', id],
  };
}

export function createResourceHooks<TItem, TCreate = unknown, TUpdate = unknown>(
  config: ResourceConfig<TItem>,
) {
  const { basePath, itemSchema } = config;
  const keys = createResourceKeys(config.key);
  const listSchema = itemSchema.array();

  const invalidate = (qc: ReturnType<typeof useQueryClient>) =>
    qc.invalidateQueries({ queryKey: keys.all });

  function useList(): UseQueryResult<TItem[], ApiError> {
    return useQuery<TItem[], ApiError>({
      queryKey: keys.list(),
      queryFn: () => apiFetch(basePath, { schema: listSchema }),
    });
  }

  function useItem(id: string): UseQueryResult<TItem, ApiError> {
    return useQuery<TItem, ApiError>({
      queryKey: keys.item(id),
      queryFn: () => apiFetch(`${basePath}/${id}`, { schema: itemSchema }),
      enabled: !!id,
    });
  }

  function useCreate(): UseMutationResult<TItem, ApiError, TCreate> {
    const qc = useQueryClient();
    return useMutation<TItem, ApiError, TCreate>({
      mutationFn: (data) =>
        apiFetch(basePath, { method: 'POST', body: data, schema: itemSchema }),
      onSuccess: () => invalidate(qc),
    });
  }

  function useUpdate(): UseMutationResult<TItem, ApiError, { id: string; data: TUpdate }> {
    const qc = useQueryClient();
    return useMutation<TItem, ApiError, { id: string; data: TUpdate }>({
      mutationFn: ({ id, data }) =>
        apiFetch(`${basePath}/${id}`, { method: 'PATCH', body: data, schema: itemSchema }),
      onSuccess: () => invalidate(qc),
    });
  }

  function useDeactivate(): UseMutationResult<unknown, ApiError, string> {
    const qc = useQueryClient();
    return useMutation<unknown, ApiError, string>({
      mutationFn: (id) => apiFetch(`${basePath}/${id}/deactivate`, { method: 'POST' }),
      onSuccess: () => invalidate(qc),
    });
  }

  function useRemove(): UseMutationResult<unknown, ApiError, string> {
    const qc = useQueryClient();
    return useMutation<unknown, ApiError, string>({
      mutationFn: (id) => apiFetch(`${basePath}/${id}`, { method: 'DELETE' }),
      onSuccess: () => invalidate(qc),
    });
  }

  return { keys, useList, useItem, useCreate, useUpdate, useDeactivate, useRemove };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/lib/crud/createResourceHooks.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/crud
git commit -m "feat: add createResourceHooks CRUD data-layer factory"
```

---

## Task 2: `applyApiErrorToForm` error mapper (TDD)

**Files:**
- Create: `src/lib/api/form-errors.ts`, `src/lib/api/form-errors.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/api/form-errors.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { ApiError } from './errors';
import { applyApiErrorToForm } from './form-errors';
import { id as messages } from '@/lib/i18n/messages.id';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

function makeForm() {
  const errors: Record<string, { message: string }> = {};
  return {
    setError: vi.fn((name: string, e: { message: string }) => { errors[name] = e; }),
    _errors: errors,
  } as any;
}

describe('applyApiErrorToForm', () => {
  it('maps a 409 CONFLICT to the code field', () => {
    const form = makeForm();
    applyApiErrorToForm(
      new ApiError({ status: 409, code: 'CONFLICT', message: 'dup' }), form, messages,
    );
    expect(form.setError).toHaveBeenCalledWith('code', expect.objectContaining({ message: expect.any(String) }));
  });

  it('maps details.errors to a root error', () => {
    const form = makeForm();
    applyApiErrorToForm(
      new ApiError({ status: 400, code: 'INVALID_INPUT', message: 'bad', details: { errors: ['name must be a string'] } }),
      form, messages,
    );
    expect(form.setError).toHaveBeenCalledWith('root', expect.objectContaining({ message: expect.stringContaining('name must be a string') }));
  });

  it('toasts on 403 FORBIDDEN', () => {
    const form = makeForm();
    applyApiErrorToForm(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' }), form, messages);
    expect(toast.error).toHaveBeenCalled();
  });

  it('toasts message + traceId on a generic error', () => {
    const form = makeForm();
    applyApiErrorToForm(
      new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom', traceId: 'trace-1' }), form, messages,
    );
    expect(toast.error).toHaveBeenCalledWith('boom', expect.objectContaining({ description: expect.stringContaining('trace-1') }));
  });

  it('toasts a generic message for a non-ApiError', () => {
    const form = makeForm();
    applyApiErrorToForm(new Error('network'), form, messages);
    expect(toast.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/api/form-errors.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the mapper**

Create `src/lib/api/form-errors.ts`:
```ts
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import type { Messages } from '@/lib/i18n/messages.id';
import { ApiError } from './errors';

/**
 * Translate an API error into form field errors and/or a toast.
 * - details.errors[]  -> root error listing the messages (best-effort inline)
 * - 409 CONFLICT      -> `code` field error (duplicate code)
 * - 403 FORBIDDEN     -> toast (UI already role-gates; this is defensive)
 * - otherwise         -> toast with message + traceId
 */
export function applyApiErrorToForm(
  error: unknown,
  form: UseFormReturn<any>,
  t: Messages,
): void {
  if (!(error instanceof ApiError)) {
    toast.error(t.common.error);
    return;
  }

  if (error.status === 409) {
    form.setError('code', { message: t.crud.duplicateCode });
    return;
  }

  if (error.status === 403) {
    toast.error(error.code === 'SEGREGATION_OF_DUTIES' ? t.roles.segregationOfDuties : t.roles.forbidden);
    return;
  }

  const fieldErrors = error.fieldErrors;
  if (fieldErrors.length > 0) {
    form.setError('root', { message: fieldErrors.join('. ') });
    return;
  }

  toast.error(error.message || t.common.error, {
    description: error.traceId ? `${t.common.reference}: ${error.traceId}` : undefined,
  });
}
```
> This references `t.crud.duplicateCode` (added in Task 6). Implement Task 6 before running, OR temporarily inline the string and replace it in Task 6. The test imports the real catalog, so add the `crud` group (Task 6) first if running in isolation.

- [ ] **Step 4: Run to verify it passes** (after Task 6's `crud` keys exist)

Run: `pnpm test src/lib/api/form-errors.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/form-errors.ts src/lib/api/form-errors.test.ts
git commit -m "feat: add applyApiErrorToForm error mapper"
```

---

## Task 3: Add shadcn primitives

**Files:** writes under `src/components/ui/`

- [ ] **Step 1: Add the components**

Run:
```bash
pnpm dlx shadcn@latest add alert-dialog checkbox switch popover command
```
Expected: creates `alert-dialog.tsx`, `checkbox.tsx`, `switch.tsx`, `popover.tsx`, `command.tsx` under `src/components/ui/`. If a component is already present, the CLI skips it.

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui package.json pnpm-lock.yaml
git commit -m "chore: add shadcn alert-dialog, checkbox, switch, popover, command"
```

---

## Task 4: `StatusBadge` + `FormDialog`

**Files:**
- Create: `src/components/common/StatusBadge.tsx`, `src/components/common/FormDialog.tsx`

- [ ] **Step 1: Implement `StatusBadge`**

Create `src/components/common/StatusBadge.tsx`:
```tsx
import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n/useT';

export function StatusBadge({ active }: { active: boolean }) {
  const t = useT();
  return (
    <Badge variant={active ? 'default' : 'secondary'} className={active ? '' : 'opacity-70'}>
      {active ? t.crud.active : t.crud.inactive}
    </Badge>
  );
}
```
> Uses `t.crud.active` / `t.crud.inactive` (Task 6).

- [ ] **Step 2: Implement `FormDialog`**

Create `src/components/common/FormDialog.tsx`:
```tsx
import type { ReactNode } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSubmit: () => void;
  submitLabel?: string;
  pending?: boolean;
  children: ReactNode;
}

export function FormDialog({
  open, onOpenChange, title, description, onSubmit, submitLabel, pending, children,
}: FormDialogProps) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
          className="space-y-4"
          noValidate
        >
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>{submitLabel ?? t.common.save}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds (after Task 6's `crud` keys exist; if building before Task 6, temporarily hardcode the two StatusBadge strings).

- [ ] **Step 4: Commit**

```bash
git add src/components/common/StatusBadge.tsx src/components/common/FormDialog.tsx
git commit -m "feat: add StatusBadge and FormDialog shared components"
```

---

## Task 5: `ConfirmDialog` + `RowActions` (TDD for RowActions)

**Files:**
- Create: `src/components/common/ConfirmDialog.tsx`, `src/components/common/RowActions.tsx`, `src/components/common/RowActions.test.tsx`

- [ ] **Step 1: Implement `ConfirmDialog`**

Create `src/components/common/ConfirmDialog.tsx`:
```tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  destructive?: boolean;
}

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, onConfirm, pending, destructive,
}: ConfirmDialogProps) {
  const t = useT();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={onConfirm}
            className={cn(destructive && 'bg-destructive text-white hover:bg-destructive/90')}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Write the failing `RowActions` test**

Create `src/components/common/RowActions.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { useSession } from '@/stores/session';
import { RowActions } from './RowActions';

afterEach(() => useSession.getState().clear());

it('shows Edit for ACCOUNTANT but not Deactivate/Delete', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  render(<RowActions onEdit={vi.fn()} onDeactivate={vi.fn()} onDelete={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /aksi/i }));
  expect(screen.getByRole('menuitem', { name: /ubah/i })).toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: /nonaktifkan/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: /hapus/i })).not.toBeInTheDocument();
});

it('shows Deactivate and Delete for ADMIN', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  render(<RowActions onEdit={vi.fn()} onDeactivate={vi.fn()} onDelete={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /aksi/i }));
  expect(screen.getByRole('menuitem', { name: /nonaktifkan/i })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: /hapus/i })).toBeInTheDocument();
});

it('renders nothing for VIEWER', () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  const { container } = render(<RowActions onEdit={vi.fn()} />);
  expect(container).toBeEmptyDOMElement();
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test src/components/common/RowActions.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `RowActions`**

Create `src/components/common/RowActions.tsx`:
```tsx
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useT } from '@/lib/i18n/useT';
import { hasRole, useRole } from './RoleGate';

interface RowActionsProps {
  onEdit: () => void;
  onDeactivate?: () => void;
  onDelete?: () => void;
}

export function RowActions({ onEdit, onDeactivate, onDelete }: RowActionsProps) {
  const t = useT();
  const role = useRole();
  const canEdit = hasRole(role, ['ACCOUNTANT', 'APPROVER', 'ADMIN']);
  const canAdmin = hasRole(role, ['ADMIN']);
  if (!canEdit && !canAdmin) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.common.actions}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit ? <DropdownMenuItem onSelect={onEdit}>{t.common.edit}</DropdownMenuItem> : null}
        {canAdmin && onDeactivate ? (
          <DropdownMenuItem onSelect={onDeactivate}>{t.crud.deactivate}</DropdownMenuItem>
        ) : null}
        {canAdmin && onDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              {t.common.delete}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```
> `t.common.actions` = "Aksi", `t.common.edit` = "Ubah", `t.common.delete` = "Hapus", `t.crud.deactivate` = "Nonaktifkan". The test matches these via regex.

- [ ] **Step 5: Run to verify it passes** (after Task 6)

Run: `pnpm test src/components/common/RowActions.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/common/ConfirmDialog.tsx src/components/common/RowActions.tsx src/components/common/RowActions.test.tsx
git commit -m "feat: add ConfirmDialog and role-gated RowActions"
```

---

## Task 6: i18n — `crud` + `accounts` message groups

**Files:**
- Modify: `src/lib/i18n/messages.id.ts`

- [ ] **Step 1: Add the `crud` and `accounts` groups**

In `src/lib/i18n/messages.id.ts`, add these groups to the exported `id` object (keep existing groups; the object is `as const`):
```ts
  crud: {
    new: 'Baru',
    deactivate: 'Nonaktifkan',
    active: 'Aktif',
    inactive: 'Nonaktif',
    saved: 'Tersimpan',
    deactivated: 'Dinonaktifkan',
    deleted: 'Dihapus',
    confirmDeactivateTitle: 'Nonaktifkan data ini?',
    confirmDeleteTitle: 'Hapus permanen?',
    confirmDeleteDesc: 'Tindakan ini tidak dapat dibatalkan.',
    duplicateCode: 'Kode sudah dipakai',
    includeInactive: 'Tampilkan nonaktif',
  },
  accounts: {
    title: 'Bagan Akun',
    code: 'Kode',
    name: 'Nama',
    type: 'Tipe',
    subtype: 'Subtipe',
    normalBalance: 'Saldo Normal',
    debit: 'Debit',
    credit: 'Kredit',
    postable: 'Dapat Diposting',
    cashFlowCategory: 'Kategori Arus Kas',
    parent: 'Akun Induk',
    newAccount: 'Akun Baru',
    editAccount: 'Ubah Akun',
    typeAset: 'Aset',
    typeLiabilitas: 'Liabilitas',
    typeEkuitas: 'Ekuitas',
    typePendapatan: 'Pendapatan',
    typeBeban: 'Beban',
  },
```

- [ ] **Step 2: Verify the catalog typechecks and dependent tests pass**

Run: `pnpm test src/lib/api/form-errors.test.ts src/components/common/RowActions.test.tsx`
Expected: PASS (these depend on the new keys).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat: add crud and accounts i18n message groups"
```

---

## Task 7: `account-meta.ts` (TDD)

**Files:**
- Create: `src/features/accounts/account-meta.ts`, `src/features/accounts/account-meta.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/accounts/account-meta.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { SUBTYPE_META, ACCOUNT_TYPE_ORDER, type AccountSubtype } from './account-meta';

describe('SUBTYPE_META', () => {
  it('derives type + default normal balance for standard subtypes', () => {
    expect(SUBTYPE_META.CURRENT_ASSET).toMatchObject({ type: 'ASSET', defaultNormalBalance: 'DEBIT' });
    expect(SUBTYPE_META.CURRENT_LIABILITY).toMatchObject({ type: 'LIABILITY', defaultNormalBalance: 'CREDIT' });
    expect(SUBTYPE_META.REVENUE).toMatchObject({ type: 'REVENUE', defaultNormalBalance: 'CREDIT' });
    expect(SUBTYPE_META.COGS).toMatchObject({ type: 'EXPENSE', defaultNormalBalance: 'DEBIT' });
    expect(SUBTYPE_META.EQUITY).toMatchObject({ type: 'EQUITY', defaultNormalBalance: 'CREDIT' });
  });

  it('marks contra-asset accumulated depreciation as ASSET/CREDIT', () => {
    expect(SUBTYPE_META.ACCUMULATED_DEPRECIATION).toMatchObject({ type: 'ASSET', defaultNormalBalance: 'CREDIT' });
  });

  it('covers all 14 subtypes with a non-empty label', () => {
    const keys = Object.keys(SUBTYPE_META) as AccountSubtype[];
    expect(keys).toHaveLength(14);
    for (const k of keys) expect(SUBTYPE_META[k].label.length).toBeGreaterThan(0);
  });

  it('orders types Aset→Liabilitas→Ekuitas→Pendapatan→Beban', () => {
    expect(ACCOUNT_TYPE_ORDER).toEqual(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/accounts/account-meta.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `account-meta.ts`**

Create `src/features/accounts/account-meta.ts`:
```ts
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';
export type AccountSubtype =
  | 'EQUITY' | 'REVENUE' | 'CURRENT_ASSET' | 'NON_CURRENT_ASSET' | 'FIXED_ASSET'
  | 'ACCUMULATED_DEPRECIATION' | 'CURRENT_LIABILITY' | 'NON_CURRENT_LIABILITY'
  | 'COGS' | 'OPERATING_EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE'
  | 'TAX_PAYABLE' | 'TAX_RECEIVABLE';
export type CashFlowCategory = 'OPERATING' | 'INVESTING' | 'FINANCING' | 'NONE';

export const ACCOUNT_TYPE_ORDER: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

export const SUBTYPE_META: Record<
  AccountSubtype,
  { type: AccountType; defaultNormalBalance: NormalBalance; label: string }
> = {
  CURRENT_ASSET:            { type: 'ASSET',     defaultNormalBalance: 'DEBIT',  label: 'Aset Lancar' },
  NON_CURRENT_ASSET:        { type: 'ASSET',     defaultNormalBalance: 'DEBIT',  label: 'Aset Tidak Lancar' },
  FIXED_ASSET:              { type: 'ASSET',     defaultNormalBalance: 'DEBIT',  label: 'Aset Tetap' },
  ACCUMULATED_DEPRECIATION: { type: 'ASSET',     defaultNormalBalance: 'CREDIT', label: 'Akumulasi Penyusutan' },
  TAX_RECEIVABLE:           { type: 'ASSET',     defaultNormalBalance: 'DEBIT',  label: 'Pajak Dibayar di Muka' },
  CURRENT_LIABILITY:        { type: 'LIABILITY', defaultNormalBalance: 'CREDIT', label: 'Liabilitas Jangka Pendek' },
  NON_CURRENT_LIABILITY:    { type: 'LIABILITY', defaultNormalBalance: 'CREDIT', label: 'Liabilitas Jangka Panjang' },
  TAX_PAYABLE:              { type: 'LIABILITY', defaultNormalBalance: 'CREDIT', label: 'Utang Pajak' },
  EQUITY:                   { type: 'EQUITY',    defaultNormalBalance: 'CREDIT', label: 'Ekuitas' },
  REVENUE:                  { type: 'REVENUE',   defaultNormalBalance: 'CREDIT', label: 'Pendapatan' },
  OTHER_INCOME:             { type: 'REVENUE',   defaultNormalBalance: 'CREDIT', label: 'Pendapatan Lain-lain' },
  COGS:                     { type: 'EXPENSE',   defaultNormalBalance: 'DEBIT',  label: 'Harga Pokok Penjualan' },
  OPERATING_EXPENSE:        { type: 'EXPENSE',   defaultNormalBalance: 'DEBIT',  label: 'Beban Operasional' },
  OTHER_EXPENSE:            { type: 'EXPENSE',   defaultNormalBalance: 'DEBIT',  label: 'Beban Lain-lain' },
};

export const SUBTYPE_OPTIONS = (Object.keys(SUBTYPE_META) as AccountSubtype[]).map((value) => ({
  value,
  label: SUBTYPE_META[value].label,
}));
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/features/accounts/account-meta.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/accounts/account-meta.ts src/features/accounts/account-meta.test.ts
git commit -m "feat: add account subtype metadata map"
```

---

## Task 8: Account schema + hooks

**Files:**
- Create: `src/features/accounts/schema.ts`, `src/features/accounts/hooks.ts`
- Modify: `src/lib/query/keys.ts`

- [ ] **Step 1: Add the account query key root**

In `src/lib/query/keys.ts`, extend the exported `queryKeys` object:
```ts
import { createResourceKeys } from '@/lib/crud/createResourceHooks';

export const queryKeys = {
  me: ['auth', 'me'] as const,
  accounts: createResourceKeys('accounts'),
};
```

- [ ] **Step 2: Create the Zod schemas**

Create `src/features/accounts/schema.ts`:
```ts
import { z } from 'zod';
import type { AccountSubtype } from './account-meta';

export const accountTypeSchema = z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']);
export const normalBalanceSchema = z.enum(['DEBIT', 'CREDIT']);
export const cashFlowCategorySchema = z.enum(['OPERATING', 'INVESTING', 'FINANCING', 'NONE']);
export const accountSubtypeSchema = z.enum([
  'EQUITY', 'REVENUE', 'CURRENT_ASSET', 'NON_CURRENT_ASSET', 'FIXED_ASSET',
  'ACCUMULATED_DEPRECIATION', 'CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY',
  'COGS', 'OPERATING_EXPENSE', 'OTHER_INCOME', 'OTHER_EXPENSE', 'TAX_PAYABLE', 'TAX_RECEIVABLE',
]);

// Item shape — hand-authored; reconciled against the live API in Plan 2b's first task.
// Default zod strips unknown keys, so extra server fields are tolerated.
export const accountSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: accountTypeSchema,
  subtype: accountSubtypeSchema,
  normalBalance: normalBalanceSchema,
  cashFlowCategory: cashFlowCategorySchema.nullish(),
  isPostable: z.boolean(),
  isActive: z.boolean(),
  parentCode: z.string().nullish(),
});
export type Account = z.infer<typeof accountSchema>;

// Create form (subtype-driven; type+normalBalance derived but still submitted).
export const accountCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  subtype: accountSubtypeSchema,
  type: accountTypeSchema,
  normalBalance: normalBalanceSchema,
  cashFlowCategory: cashFlowCategorySchema,
  isPostable: z.boolean(),
  parentCode: z.string().optional(),
});
export type AccountCreateValues = z.infer<typeof accountCreateSchema>;

// Edit form (UpdateAccountDto: name, cashFlowCategory, isActive only).
export const accountEditSchema = z.object({
  name: z.string().min(1),
  cashFlowCategory: cashFlowCategorySchema,
  isActive: z.boolean(),
});
export type AccountEditValues = z.infer<typeof accountEditSchema>;

export type AccountCreatePayload = AccountCreateValues;
export type AccountUpdatePayload = AccountEditValues;
```

- [ ] **Step 3: Create the hooks**

Create `src/features/accounts/hooks.ts`:
```ts
import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { accountSchema, type Account, type AccountCreatePayload, type AccountUpdatePayload } from './schema';

export const accountsApi = createResourceHooks<Account, AccountCreatePayload, AccountUpdatePayload>({
  key: 'accounts',
  basePath: '/ledger/accounts',
  itemSchema: accountSchema,
});
```

- [ ] **Step 4: Verify typecheck/build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/features/accounts/schema.ts src/features/accounts/hooks.ts src/lib/query/keys.ts
git commit -m "feat: account schema, hooks, and query keys"
```

---

## Task 9: MSW account fixtures

**Files:**
- Modify: `src/test/handlers.ts`

- [ ] **Step 1: Add account handlers + a fixtures helper**

In `src/test/handlers.ts`, append to the `handlers` array (keep existing auth handlers) and export a fixtures factory:
```ts
// --- accounts (Plan 2a) ---
export const accountFixtures = () => [
  { id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', cashFlowCategory: 'OPERATING', isPostable: true, isActive: true, parentCode: null },
  { id: 'a2', code: '4-1000', name: 'Pendapatan Penjualan', type: 'REVENUE', subtype: 'REVENUE', normalBalance: 'CREDIT', cashFlowCategory: 'NONE', isPostable: true, isActive: true, parentCode: null },
];
```
And inside the exported `handlers` array, add:
```ts
  http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accountFixtures())),
  http.post(`${API}/ledger/accounts`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.code === '1-1000') {
      return HttpResponse.json({ code: 'CONFLICT', message: 'duplicate' }, { status: 409 });
    }
    return HttpResponse.json({ id: 'a9', isActive: true, parentCode: null, ...body });
  }),
  http.patch(`${API}/ledger/accounts/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...accountFixtures()[0], id: params.id, ...body });
  }),
  http.post(`${API}/ledger/accounts/:id/deactivate`, () => HttpResponse.json({})),
  http.delete(`${API}/ledger/accounts/:id`, () => HttpResponse.json({})),
```
> Tests override these per-case with `server.use(...)` where they need different behavior; these defaults cover the happy path. The 409-on-`1-1000` default drives the duplicate-code test.

- [ ] **Step 2: Verify existing tests still pass**

Run: `pnpm test src/test`
Expected: PASS (smoke test unaffected; `onUnhandledRequest: 'error'` now satisfied for account calls).

- [ ] **Step 3: Commit**

```bash
git add src/test/handlers.ts
git commit -m "test: add MSW account CRUD fixtures"
```

---

## Task 10: Account columns + `AccountsPage` list with type grouping (TDD)

**Files:**
- Create: `src/features/accounts/columns.tsx`, `src/features/accounts/AccountsPage.tsx`, `src/features/accounts/AccountsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/accounts/AccountsPage.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { AccountsPage } from './AccountsPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}><AccountsPage /></QueryClientProvider>);
}

it('lists accounts grouped by type', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  renderPage();
  expect(await screen.findByText('Kas')).toBeInTheDocument();
  expect(screen.getByText('Pendapatan Penjualan')).toBeInTheDocument();
  // type group headers
  expect(screen.getByText(/aset/i)).toBeInTheDocument();
  expect(screen.getByText(/pendapatan/i)).toBeInTheDocument();
});

it('shows the New button for ACCOUNTANT', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  renderPage();
  await screen.findByText('Kas');
  expect(screen.getByRole('button', { name: /baru/i })).toBeInTheDocument();
});

it('hides the New button for VIEWER', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  renderPage();
  await screen.findByText('Kas');
  expect(screen.queryByRole('button', { name: /baru/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/accounts/AccountsPage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the columns**

Create `src/features/accounts/columns.tsx`:
```tsx
import { createColumnHelper } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RowActions } from '@/components/common/RowActions';
import type { Messages } from '@/lib/i18n/messages.id';
import { SUBTYPE_META } from './account-meta';
import type { Account } from './schema';

const col = createColumnHelper<Account>();

export function buildAccountColumns(
  t: Messages,
  handlers: { onEdit: (a: Account) => void; onDeactivate: (a: Account) => void; onDelete: (a: Account) => void },
) {
  return [
    col.accessor('code', { header: t.accounts.code }),
    col.accessor('name', { header: t.accounts.name }),
    col.accessor('subtype', {
      header: t.accounts.subtype,
      cell: (c) => SUBTYPE_META[c.getValue()]?.label ?? c.getValue(),
    }),
    col.accessor('normalBalance', {
      header: t.accounts.normalBalance,
      cell: (c) => (
        <Badge variant="outline">
          {c.getValue() === 'DEBIT' ? t.accounts.debit : t.accounts.credit}
        </Badge>
      ),
    }),
    col.accessor('isActive', {
      header: '',
      cell: (c) => <StatusBadge active={c.getValue()} />,
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => (
        <RowActions
          onEdit={() => handlers.onEdit(c.row.original)}
          onDeactivate={() => handlers.onDeactivate(c.row.original)}
          onDelete={() => handlers.onDelete(c.row.original)}
        />
      ),
    }),
  ];
}
```

- [ ] **Step 4: Create `AccountsPage`**

Create `src/features/accounts/AccountsPage.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { RoleGate } from '@/components/common/RoleGate';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/useT';
import { ACCOUNT_TYPE_ORDER, type AccountType } from './account-meta';
import { buildAccountColumns } from './columns';
import { AccountFormDialog } from './AccountFormDialog';
import { accountsApi } from './hooks';
import type { Account } from './schema';

const TYPE_LABEL: Record<AccountType, keyof ReturnType<typeof useT>['accounts']> = {
  ASSET: 'typeAset', LIABILITY: 'typeLiabilitas', EQUITY: 'typeEkuitas',
  REVENUE: 'typePendapatan', EXPENSE: 'typeBeban',
};

export function AccountsPage() {
  const t = useT();
  const list = accountsApi.useList();
  const deactivate = accountsApi.useDeactivate();
  const remove = accountsApi.useRemove();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'delete'; account: Account } | null>(null);

  const columns = useMemo(
    () =>
      buildAccountColumns(t, {
        onEdit: (a) => setEditing(a),
        onDeactivate: (a) => setConfirm({ kind: 'deactivate', account: a }),
        onDelete: (a) => setConfirm({ kind: 'delete', account: a }),
      }),
    [t],
  );

  const grouped = useMemo(() => {
    const rows = (list.data ?? []).filter((a) => {
      const q = search.toLowerCase();
      return !q || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    });
    return ACCOUNT_TYPE_ORDER.map((type) => ({
      type,
      rows: rows.filter((a) => a.type === type).sort((x, y) => x.code.localeCompare(y.code)),
    })).filter((g) => g.rows.length > 0);
  }, [list.data, search]);

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

      <div className="mb-4 max-w-xs">
        <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {list.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : list.isError ? (
        <ErrorState error={list.error} />
      ) : (
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
      )}

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
> `AccountFormDialog` is created in Task 11; until it exists this file won't compile. Implement Task 11 before running the build, but the list-only tests in Step 1 import `AccountsPage`, which imports `AccountFormDialog` — so **do Task 11 first, then run Step 2's test**. (If executing strictly in order, write a minimal `AccountFormDialog` stub returning `null` now and replace it in Task 11.)

- [ ] **Step 5: Run to verify it passes** (after Task 11)

Run: `pnpm test src/features/accounts/AccountsPage.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/accounts/columns.tsx src/features/accounts/AccountsPage.tsx src/features/accounts/AccountsPage.test.tsx
git commit -m "feat: accounts list page with type grouping and role-gated New"
```

---

## Task 11: `AccountFormDialog` — subtype-driven create + edit (TDD)

**Files:**
- Create: `src/features/accounts/AccountFormDialog.tsx`, `src/features/accounts/AccountFormDialog.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/accounts/AccountFormDialog.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { AccountFormDialog } from './AccountFormDialog';

afterEach(() => useSession.getState().clear());

function renderDialog(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('auto-derives type + normal balance from the chosen subtype', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let posted: any = null;
  server.use(
    http.post(`${API}/ledger/accounts`, async ({ request }) => {
      posted = await request.json();
      return HttpResponse.json({ id: 'a9', isActive: true, parentCode: null, ...(posted as object) });
    }),
  );
  renderDialog(<AccountFormDialog open onOpenChange={vi.fn()} mode="create" />);
  await userEvent.type(screen.getByLabelText(/kode/i), '1-2000');
  await userEvent.type(screen.getByLabelText(/nama/i), 'Bank');
  // choose subtype = Aset Lancar (CURRENT_ASSET)
  await userEvent.click(screen.getByLabelText(/subtipe/i));
  await userEvent.click(await screen.findByRole('option', { name: /aset lancar/i }));
  await userEvent.click(screen.getByRole('button', { name: /simpan/i }));
  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ type: 'ASSET', normalBalance: 'DEBIT', subtype: 'CURRENT_ASSET' });
});

it('shows a duplicate-code field error on 409', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.post(`${API}/ledger/accounts`, () =>
      HttpResponse.json({ code: 'CONFLICT', message: 'dup' }, { status: 409 }),
    ),
  );
  renderDialog(<AccountFormDialog open onOpenChange={vi.fn()} mode="create" />);
  await userEvent.type(screen.getByLabelText(/kode/i), '1-1000');
  await userEvent.type(screen.getByLabelText(/nama/i), 'Kas');
  await userEvent.click(screen.getByLabelText(/subtipe/i));
  await userEvent.click(await screen.findByRole('option', { name: /aset lancar/i }));
  await userEvent.click(screen.getByRole('button', { name: /simpan/i }));
  expect(await screen.findByText(/kode sudah dipakai/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/accounts/AccountFormDialog.test.tsx`
Expected: FAIL — module not found (or stub renders nothing).

- [ ] **Step 3: Implement `AccountFormDialog`**

Create `src/features/accounts/AccountFormDialog.tsx`:
```tsx
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FormDialog } from '@/components/common/FormDialog';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { useT } from '@/lib/i18n/useT';
import { SUBTYPE_META, SUBTYPE_OPTIONS, type AccountSubtype } from './account-meta';
import { accountsApi } from './hooks';
import {
  accountCreateSchema, accountEditSchema,
  type AccountCreateValues, type AccountEditValues, type Account,
} from './schema';

const CASH_FLOW_OPTIONS = ['NONE', 'OPERATING', 'INVESTING', 'FINANCING'] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  account?: Account;
}

export function AccountFormDialog({ open, onOpenChange, mode, account }: Props) {
  if (mode === 'edit' && account) {
    return <EditForm key={account.id} account={account} open={open} onOpenChange={onOpenChange} />;
  }
  return <CreateForm open={open} onOpenChange={onOpenChange} />;
}

function CreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const create = accountsApi.useCreate();
  const form = useForm<AccountCreateValues>({
    resolver: zodResolver(accountCreateSchema),
    defaultValues: {
      code: '', name: '', subtype: 'CURRENT_ASSET', type: 'ASSET',
      normalBalance: 'DEBIT', cashFlowCategory: 'NONE', isPostable: true, parentCode: '',
    },
  });

  const subtype = form.watch('subtype');
  useEffect(() => {
    const meta = SUBTYPE_META[subtype as AccountSubtype];
    if (meta) {
      form.setValue('type', meta.type);
      form.setValue('normalBalance', meta.defaultNormalBalance);
    }
  }, [subtype, form]);

  function onSubmit(values: AccountCreateValues) {
    create.mutate(
      { ...values, parentCode: values.parentCode || undefined },
      {
        onSuccess: () => { toast.success(t.crud.saved); onOpenChange(false); form.reset(); },
        onError: (err) => applyApiErrorToForm(err, form, t),
      },
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.accounts.newAccount}
      onSubmit={form.handleSubmit(onSubmit)}
      pending={create.isPending}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.accounts.code} htmlFor="code">
          <Input id="code" {...form.register('code')} />
        </Field>
        <Field label={t.accounts.name} htmlFor="name">
          <Input id="name" {...form.register('name')} />
        </Field>
      </div>

      <Field label={t.accounts.subtype} htmlFor="subtype">
        <Select value={subtype} onValueChange={(v) => form.setValue('subtype', v as AccountSubtype)}>
          <SelectTrigger id="subtype" aria-label={t.accounts.subtype}><SelectValue /></SelectTrigger>
          <SelectContent>
            {SUBTYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.accounts.normalBalance} htmlFor="nb">
          <Select
            value={form.watch('normalBalance')}
            onValueChange={(v) => form.setValue('normalBalance', v as 'DEBIT' | 'CREDIT')}
          >
            <SelectTrigger id="nb" aria-label={t.accounts.normalBalance}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DEBIT">{t.accounts.debit}</SelectItem>
              <SelectItem value="CREDIT">{t.accounts.credit}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t.accounts.cashFlowCategory} htmlFor="cf">
          <Select
            value={form.watch('cashFlowCategory')}
            onValueChange={(v) => form.setValue('cashFlowCategory', v as AccountCreateValues['cashFlowCategory'])}
          >
            <SelectTrigger id="cf" aria-label={t.accounts.cashFlowCategory}><SelectValue /></SelectTrigger>
            <SelectContent>
              {CASH_FLOW_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.watch('isPostable')}
          onCheckedChange={(v) => form.setValue('isPostable', v === true)}
        />
        {t.accounts.postable}
      </label>

      {form.formState.errors.root ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      ) : null}
      {form.formState.errors.code ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.code.message}</p>
      ) : null}
    </FormDialog>
  );
}

function EditForm({ account, open, onOpenChange }: { account: Account; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const update = accountsApi.useUpdate();
  const form = useForm<AccountEditValues>({
    resolver: zodResolver(accountEditSchema),
    defaultValues: {
      name: account.name,
      cashFlowCategory: account.cashFlowCategory ?? 'NONE',
      isActive: account.isActive,
    },
  });

  function onSubmit(values: AccountEditValues) {
    update.mutate(
      { id: account.id, data: values },
      {
        onSuccess: () => { toast.success(t.crud.saved); onOpenChange(false); },
        onError: (err) => applyApiErrorToForm(err, form, t),
      },
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.accounts.editAccount}
      description={`${account.code} — ${account.name}`}
      onSubmit={form.handleSubmit(onSubmit)}
      pending={update.isPending}
    >
      <Field label={t.accounts.name} htmlFor="ename">
        <Input id="ename" {...form.register('name')} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={form.watch('isActive')} onCheckedChange={(v) => form.setValue('isActive', v === true)} />
        {t.crud.active}
      </label>
      {form.formState.errors.root ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      ) : null}
    </FormDialog>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
```
- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/features/accounts/AccountFormDialog.test.tsx`
Expected: PASS (2 tests).

> Note on the radix Select in jsdom: if `userEvent.click` on the trigger + `findByRole('option')` is flaky under jsdom (radix Select uses pointer events), drive the select by its `aria-label` and options as in the test; if the option role isn't found, fall back to asserting via `screen.findByText(/aset lancar/i)` within the open listbox. Keep the test deterministic — the goal is to prove subtype→type/normalBalance derivation and the 409 field error.

- [ ] **Step 5: Run the accounts page test too (now that the dialog exists)**

Run: `pnpm test src/features/accounts/`
Expected: PASS (AccountsPage 3 + AccountFormDialog 2 + account-meta 4).

- [ ] **Step 6: Commit**

```bash
git add src/features/accounts/AccountFormDialog.tsx src/features/accounts/AccountFormDialog.test.tsx
git commit -m "feat: subtype-driven account create/edit form with 409 handling"
```

---

## Task 12: Wire the accounts route + full verification

**Files:**
- Modify: `src/app/routes/_app/accounts.tsx`

- [ ] **Step 1: Render `AccountsPage` in the route**

Replace `src/app/routes/_app/accounts.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { AccountsPage } from '@/features/accounts/AccountsPage';

export const Route = createFileRoute('/_app/accounts')({
  component: AccountsPage,
});
```

- [ ] **Step 2: Full verification**

Run:
```bash
pnpm lint && pnpm test && pnpm build
```
Expected: lint 0 errors; all tests pass (Plan 1's 42 + this plan's new tests); build succeeds.

- [ ] **Step 3: Manual smoke (optional, live API in `.env`)**

Run `pnpm dev`, log in, open **Bagan Akun**: the chart lists grouped by type; ACCOUNTANT sees "Baru" and can create an account (pick a subtype → type/normal-balance auto-fill); ADMIN sees Nonaktifkan/Hapus in the row menu; a duplicate code shows an inline "Kode sudah dipakai".

- [ ] **Step 4: Commit**

```bash
git add src/app/routes/_app/accounts.tsx
git commit -m "feat: wire Chart of Accounts route"
```

---

## Done criteria for Plan 2a

- `createResourceHooks` + `applyApiErrorToForm` implemented, tested, and used by the Accounts feature.
- Shared `FormDialog` / `ConfirmDialog` / `RowActions` / `StatusBadge` in place.
- `/accounts` renders a type-grouped chart; ACCOUNTANT+ can create/edit; ADMIN can deactivate/delete; duplicate code → inline field error; subtype drives type + normal balance.
- **Deferred (noted):** the optional `parentCode` picker is intentionally omitted from the create form — `parentCode` is optional in the API and the COA here is type-grouped (not parent-grouped), so accounts are created flat. Add a header-account picker in a later pass if the chart grows deep enough to need it.
- `pnpm lint && pnpm test && pnpm build` all green.
- Ready for Plan 2b (Partners + Tax Codes + AccountSelect + rate helper + live-API schema reconciliation), which reuses every shared piece built here.
```

# Plan 3b — Sales Invoice Post / Void / Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the sales-invoice lifecycle — APPROVER/ADMIN post (idempotent, SoD-guarded) and void invoices from the list with confirm dialogs, and posted/void invoices open read-only in the editor.

**Architecture:** A reusable `useDocumentAction` hook POSTs `/sales-invoices/:id/{post|void}` with an `Idempotency-Key` and invalidates the list; `toastApiError` surfaces `403 SEGREGATION_OF_DUTIES` distinctly. The list's actions cell becomes status- and role-aware; the existing `InvoiceForm` gains a `readOnly` mode reused for viewing posted/void invoices.

**Tech Stack:** React 19, TanStack Query v5 + Router, Zod v4, React Hook Form, shadcn/ui, Vitest + RTL + MSW, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-13-sales-invoice-post-void-design.md`.

---

## Reconciled shapes (verified live during planning — use these)

- `POST /sales-invoices/:id/post` → 200, full invoice: `status: "POSTED"`, `invoiceNumber: 1` (number), `invoiceRef: "INV/2026/000001"`, `journalEntryId`, `postedBy`, `postedAt` set.
- `POST /sales-invoices/:id/void` → 200, full invoice: `status: "VOID"`.
- SoD enabled + single user → creator self-post returns `403 SEGREGATION_OF_DUTIES`. 2026 periods open.

## Canonical interfaces

```ts
// src/lib/crud/useDocumentAction.ts
function useDocumentAction<TResult = unknown>(config: { key: string; basePath: string; action: string }):
  UseMutationResult<TResult, ApiError, { id: string; idempotencyKey: string }>;

// src/lib/api/toastApiError.ts
function toastApiError(error: unknown, t: Messages): void;

// src/features/sales-invoices/hooks.ts (added)
function usePostInvoice(): ReturnType<typeof useDocumentAction>;
function useVoidInvoice(): ReturnType<typeof useDocumentAction>;
```

---

## Task 1: Schema corrections (invoiceNumber→number, invoiceRef) + consumers

**Files:**
- Modify: `src/features/sales-invoices/schema.ts`, `src/features/sales-invoices/schema.test.ts`, `src/features/sales-invoices/columns.tsx`, `src/features/sales-invoices/SalesInvoicesPage.tsx`

- [ ] **Step 1: Update the schema**

In `src/features/sales-invoices/schema.ts`, in `salesInvoiceSchema`, replace `invoiceNumber: z.string().nullish(),` with:
```ts
  invoiceNumber: z.number().nullish(),
  invoiceRef: z.string().nullish(),
  postedBy: z.string().nullish(),
  postedAt: z.string().nullish(),
  journalEntryId: z.string().nullish(),
```

- [ ] **Step 2: Add a posted-invoice parse test**

In `src/features/sales-invoices/schema.test.ts`, add inside the `salesInvoiceSchema` describe:
```ts
  it('parses a POSTED invoice (numeric invoiceNumber + invoiceRef)', () => {
    const r = salesInvoiceSchema.parse({ ...sample, status: 'POSTED', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', postedBy: 'u', postedAt: '2026-06-15T00:00:00.000Z', journalEntryId: 'j1' });
    expect(r.status).toBe('POSTED');
    expect(r.invoiceNumber).toBe(1);
    expect(r.invoiceRef).toBe('INV/2026/000001');
  });
```

- [ ] **Step 3: Update consumers (columns display + page search) to use invoiceRef**

In `src/features/sales-invoices/columns.tsx`, change the number column from `invoiceNumber` to `invoiceRef`:
```ts
    col.accessor('invoiceRef', { header: t.salesInvoices.number, cell: (c) => c.getValue() ?? '—' }),
```
In `src/features/sales-invoices/SalesInvoicesPage.tsx`, change the search predicate's `invoiceNumber` reference to `invoiceRef` (since `invoiceNumber` is now a number, `.toLowerCase()` on it would break):
```ts
      return !q || (inv.invoiceRef ?? '').toLowerCase().includes(q) || partnerName(inv.partnerId).toLowerCase().includes(q);
```

- [ ] **Step 4: Run tests + build**

Run: `pnpm test src/features/sales-invoices/schema.test.ts && pnpm build`
Expected: schema tests PASS (incl. the new posted case); build succeeds (no `.toLowerCase()`-on-number error).

- [ ] **Step 5: Commit**

```bash
git add src/features/sales-invoices/schema.ts src/features/sales-invoices/schema.test.ts src/features/sales-invoices/columns.tsx src/features/sales-invoices/SalesInvoicesPage.tsx
git commit -m "fix: invoiceNumber is numeric + add invoiceRef (reconciled); display invoiceRef"
```

---

## Task 2: i18n — post/void/view + closed-period keys

**Files:**
- Modify: `src/lib/i18n/messages.id.ts`

- [ ] **Step 1: Extend the `salesInvoices` group**

Add these keys to the existing `salesInvoices` group in `src/lib/i18n/messages.id.ts`:
```ts
    post: 'Posting',
    void: 'Batalkan',
    view: 'Lihat',
    confirmPostTitle: 'Posting faktur ini?',
    confirmPostDesc: 'Faktur akan diposting ke buku besar dan tidak bisa diubah lagi.',
    confirmVoidTitle: 'Batalkan faktur ini?',
    confirmVoidDesc: 'Posting akan dibalik (jurnal pembalik dibuat).',
    posted: 'Faktur diposting',
    voided: 'Faktur dibatalkan',
    readOnlyPosted: 'Faktur sudah diposting — hanya-baca.',
    readOnlyVoid: 'Faktur dibatalkan — hanya-baca.',
```

- [ ] **Step 2: Extend the `crud` group**

Add to the existing `crud` group:
```ts
    closedPeriod: 'Periode sudah ditutup',
    closedYear: 'Tahun buku sudah ditutup',
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat: add post/void/view + closed-period i18n keys"
```

---

## Task 3: `toastApiError` (TDD)

**Files:**
- Create: `src/lib/api/toastApiError.ts`, `src/lib/api/toastApiError.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/api/toastApiError.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { ApiError } from './errors';
import { toastApiError } from './toastApiError';
import { id as messages } from '@/lib/i18n/messages.id';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('toastApiError', () => {
  it('shows the SoD message for 403 SEGREGATION_OF_DUTIES', () => {
    toastApiError(new ApiError({ status: 403, code: 'SEGREGATION_OF_DUTIES', message: 'x' }), messages);
    expect(toast.error).toHaveBeenLastCalledWith(messages.roles.segregationOfDuties);
  });
  it('shows forbidden for a plain 403', () => {
    toastApiError(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'x' }), messages);
    expect(toast.error).toHaveBeenLastCalledWith(messages.roles.forbidden);
  });
  it('shows closed-period for 409 CLOSED_PERIOD', () => {
    toastApiError(new ApiError({ status: 409, code: 'CLOSED_PERIOD', message: 'x' }), messages);
    expect(toast.error).toHaveBeenLastCalledWith(messages.crud.closedPeriod);
  });
  it('shows message + traceId for a generic error', () => {
    toastApiError(new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom', traceId: 'tr-1' }), messages);
    expect(toast.error).toHaveBeenLastCalledWith('boom', expect.objectContaining({ description: expect.stringContaining('tr-1') }));
  });
  it('shows a generic toast for a non-ApiError', () => {
    toastApiError(new Error('net'), messages);
    expect(toast.error).toHaveBeenLastCalledWith(messages.common.error);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/api/toastApiError.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/api/toastApiError.ts`:
```ts
import { toast } from 'sonner';
import type { Messages } from '@/lib/i18n/messages.id';
import { ApiError } from './errors';

/** Surface an API error as a toast (for action/confirm contexts, not forms). */
export function toastApiError(error: unknown, t: Messages): void {
  if (!(error instanceof ApiError)) {
    toast.error(t.common.error);
    return;
  }
  if (error.status === 403) {
    toast.error(error.code === 'SEGREGATION_OF_DUTIES' ? t.roles.segregationOfDuties : t.roles.forbidden);
    return;
  }
  if (error.status === 409 && error.code === 'CLOSED_PERIOD') {
    toast.error(t.crud.closedPeriod);
    return;
  }
  if (error.status === 409 && error.code === 'CLOSED_YEAR') {
    toast.error(t.crud.closedYear);
    return;
  }
  toast.error(error.message || t.common.error, {
    description: error.traceId ? `${t.common.reference}: ${error.traceId}` : undefined,
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/lib/api/toastApiError.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/toastApiError.ts src/lib/api/toastApiError.test.ts
git commit -m "feat: add toastApiError (SoD-aware action error toasts)"
```

---

## Task 4: `useDocumentAction` + post/void hooks (TDD)

**Files:**
- Create: `src/lib/crud/useDocumentAction.ts`, `src/lib/crud/useDocumentAction.test.tsx`
- Modify: `src/features/sales-invoices/hooks.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/crud/useDocumentAction.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useDocumentAction } from './useDocumentAction';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('POSTs to /:id/:action with an Idempotency-Key header', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let seenKey: string | null = null;
  let hitPath = '';
  server.use(
    http.post(`${API}/widgets/7/post`, ({ request }) => {
      seenKey = request.headers.get('Idempotency-Key');
      hitPath = '/widgets/7/post';
      return HttpResponse.json({ ok: true });
    }),
  );
  const { result } = renderHook(() => useDocumentAction({ key: 'widgets', basePath: '/widgets', action: 'post' }), { wrapper });
  await result.current.mutateAsync({ id: '7', idempotencyKey: 'key-123' });
  await waitFor(() => expect(hitPath).toBe('/widgets/7/post'));
  expect(seenKey).toBe('key-123');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/crud/useDocumentAction.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/crud/useDocumentAction.ts`:
```ts
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';

/** A document lifecycle action (post/void/reverse): POST {basePath}/:id/{action} with an
 *  Idempotency-Key, invalidating the resource list on success. */
export function useDocumentAction<TResult = unknown>(config: {
  key: string;
  basePath: string;
  action: string;
}): UseMutationResult<TResult, ApiError, { id: string; idempotencyKey: string }> {
  const qc = useQueryClient();
  return useMutation<TResult, ApiError, { id: string; idempotencyKey: string }>({
    mutationFn: ({ id, idempotencyKey }) =>
      apiFetch(`${config.basePath}/${id}/${config.action}`, { method: 'POST', idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [config.key] }),
  });
}
```

- [ ] **Step 4: Add the invoice hooks**

In `src/features/sales-invoices/hooks.ts`, append:
```ts
import { useDocumentAction } from '@/lib/crud/useDocumentAction';

export const usePostInvoice = () => useDocumentAction({ key: 'salesInvoices', basePath: '/sales-invoices', action: 'post' });
export const useVoidInvoice = () => useDocumentAction({ key: 'salesInvoices', basePath: '/sales-invoices', action: 'void' });
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test src/lib/crud/useDocumentAction.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/crud/useDocumentAction.ts src/lib/crud/useDocumentAction.test.tsx src/features/sales-invoices/hooks.ts
git commit -m "feat: useDocumentAction + usePostInvoice/useVoidInvoice"
```

---

## Task 5: MSW post/void handlers

**Files:**
- Modify: `src/test/handlers.ts`

- [ ] **Step 1: Add post/void handlers**

In `src/test/handlers.ts`, add inside the `handlers` array (after the existing sales-invoice handlers):
```ts
  http.post(`${API}/sales-invoices/:id/post`, ({ params }) =>
    HttpResponse.json({ ...salesInvoiceFixtures()[0], id: params.id, status: 'POSTED', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', postedBy: 'u', postedAt: '2026-06-15T00:00:00.000Z', journalEntryId: 'j1' }),
  ),
  http.post(`${API}/sales-invoices/:id/void`, ({ params }) =>
    HttpResponse.json({ ...salesInvoiceFixtures()[0], id: params.id, status: 'VOID', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', journalEntryId: 'j1' }),
  ),
```
> Tests that need a `403 SEGREGATION_OF_DUTIES` response override the post handler per-test with `server.use(...)`.

- [ ] **Step 2: Verify**

Run: `pnpm test src/test && pnpm build`
Expected: PASS / succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/test/handlers.ts
git commit -m "test: add MSW sales-invoice post/void handlers"
```

---

## Task 6: `InvoiceForm` read-only mode (TDD)

**Files:**
- Modify: `src/components/common/MoneyInput.tsx`, `src/features/sales-invoices/InvoiceLineRow.tsx`, `src/features/sales-invoices/InvoiceForm.tsx`, `src/features/sales-invoices/InvoiceEditorPage.tsx`
- Create: `src/features/sales-invoices/InvoiceForm.readonly.test.tsx`

- [ ] **Step 1: Add `disabled` to `MoneyInput`**

In `src/components/common/MoneyInput.tsx`, add `disabled` to the props interface and pass it through:
```tsx
interface MoneyInputProps {
  value: string;
  onChange: (raw: string) => void;
  'aria-label'?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}
```
and add `disabled={disabled}` to the rendered `<Input ... />` (destructure `disabled` from props).

- [ ] **Step 2: Write the failing read-only test**

Create `src/features/sales-invoices/InvoiceForm.readonly.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { InvoiceForm } from './InvoiceForm';
import type { SalesInvoice } from './schema';

afterEach(() => useSession.getState().clear());

const posted: SalesInvoice = {
  id: 'i1', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', partnerId: 'c1', date: '2026-06-15T00:00:00.000Z',
  dueDate: null, description: 'x', status: 'POSTED', subtotal: '1000000.0000', taxTotal: '110000.0000',
  withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000',
  paymentStatus: 'UNPAID', postedBy: 'u', postedAt: '2026-06-15T00:00:00.000Z', journalEntryId: 'j1',
  lines: [{ id: 'l1', lineNo: 1, description: 'Jasa', accountId: 'rev', quantity: '1.0000', unitPrice: '1000000.0000', amount: '1000000.0000', taxCodeIds: [] }],
};

function renderForm(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('renders a posted invoice read-only: disabled fields, banner, no Save', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json([{ id: 'rev', code: '4-1000', name: 'Pendapatan', type: 'REVENUE', subtype: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, isActive: true, parentId: null }])),
    http.get(`${API}/partners`, () => HttpResponse.json([{ id: 'c1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }])),
    http.get(`${API}/tax/codes`, () => HttpResponse.json([])),
  );
  renderForm(<InvoiceForm mode="edit" invoice={posted} onSaved={vi.fn()} readOnly />);
  expect(await screen.findByText(/hanya-baca/i)).toBeInTheDocument();          // banner
  expect(screen.queryByRole('button', { name: /simpan draf/i })).not.toBeInTheDocument(); // no Save
  expect(screen.queryByRole('button', { name: /tambah baris/i })).not.toBeInTheDocument(); // no Add line
  expect(screen.getByLabelText(/tanggal/i)).toBeDisabled();                    // disabled field
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test src/features/sales-invoices/InvoiceForm.readonly.test.tsx`
Expected: FAIL (no `readOnly` behavior yet).

- [ ] **Step 4: Thread `readOnly` through `InvoiceLineRow`**

In `src/features/sales-invoices/InvoiceLineRow.tsx`, add `readOnly?: boolean` to the props and pass `disabled={readOnly}` to the description `Input`, `AccountSelect`, the quantity `Input`, `MoneyInput`, and `TaxCodeMultiSelect`; hide the remove button when `readOnly`:
```tsx
export function InvoiceLineRow({ form, index, onRemove, readOnly }: { form: UseFormReturn<InvoiceFormValues>; index: number; onRemove: () => void; readOnly?: boolean }) {
```
- `<Input ... disabled={readOnly} {...form.register(...)} />` for description and quantity
- `<AccountSelect ... disabled={readOnly} />`
- `<MoneyInput ... disabled={readOnly} />`
- `<TaxCodeMultiSelect ... disabled={readOnly} />`
- the remove `<Button>` cell: render `{readOnly ? null : <Button ... onRemove />}`

- [ ] **Step 5: Thread `readOnly` through `InvoiceForm`**

In `src/features/sales-invoices/InvoiceForm.tsx`:
- Add `readOnly?: boolean` to `Props`.
- When `readOnly`, render a banner above the header (use `t.salesInvoices.readOnlyPosted` for POSTED, `readOnlyVoid` otherwise — derive from `invoice?.status`):
```tsx
{readOnly ? (
  <div className="rounded-md border border-muted bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
    {invoice?.status === 'VOID' ? t.salesInvoices.readOnlyVoid : t.salesInvoices.readOnlyPosted}
    {invoice?.invoiceRef ? ` (${invoice.invoiceRef})` : ''}
  </div>
) : null}
```
- Pass `disabled={readOnly}` to `PartnerSelect`; add `disabled={readOnly}` to the date / dueDate / description `Input`s.
- Pass `readOnly={readOnly}` to each `InvoiceLineRow`.
- Hide Add-line and Save when `readOnly` (keep Cancel as a "Kembali"/back via `onSaved`): wrap the Add-line `Button` and the submit `Button` in `{readOnly ? null : ...}`. The footer still shows the Cancel/back button.

- [ ] **Step 6: Pass `readOnly` from `InvoiceEditorPage`**

In `src/features/sales-invoices/InvoiceEditorPage.tsx`, in the edit branch pass `readOnly={item.data.status !== 'DRAFT'}`:
```tsx
return (
  <div>
    <PageHeader title={item.data.status === 'DRAFT' ? t.salesInvoices.editInvoice : t.salesInvoices.view} />
    <InvoiceForm mode="edit" invoice={item.data} onSaved={goList} readOnly={item.data.status !== 'DRAFT'} />
  </div>
);
```

- [ ] **Step 7: Run to verify it passes**

Run: `pnpm test src/features/sales-invoices/InvoiceForm.readonly.test.tsx src/features/sales-invoices/InvoiceForm.test.tsx`
Expected: PASS (the read-only test + the existing create/validate tests still green).

- [ ] **Step 8: Commit**

```bash
git add src/components/common/MoneyInput.tsx src/features/sales-invoices/InvoiceLineRow.tsx src/features/sales-invoices/InvoiceForm.tsx src/features/sales-invoices/InvoiceEditorPage.tsx src/features/sales-invoices/InvoiceForm.readonly.test.tsx
git commit -m "feat: read-only InvoiceForm mode for posted/void invoices"
```

---

## Task 7: Post/Void row actions on the list (TDD)

**Files:**
- Modify: `src/features/sales-invoices/columns.tsx`, `src/features/sales-invoices/SalesInvoicesPage.tsx`, `src/features/sales-invoices/SalesInvoicesPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

First, at the top of `src/features/sales-invoices/SalesInvoicesPage.test.tsx`, add `vi` to the vitest import, import the toast + catalog, and mock sonner so toast calls are assertable without mounting a `<Toaster/>` (this is safe — the existing 3a tests assert server flags / DOM, not toasts):
```tsx
import { afterEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { id as messages } from '@/lib/i18n/messages.id';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
```

Then add these tests (keep existing tests; `userEvent`, `waitFor`, `within` are already imported from Plan 3a):
```tsx
const postedInvoice = { id: 'i2', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z', dueDate: null, description: 'x', status: 'POSTED', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] };
const draftInvoice = { id: 'i1', invoiceNumber: null, invoiceRef: null, partnerId: 'p1', date: '2026-06-13T00:00:00.000Z', dueDate: null, description: 'x', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] };
const onePartner = [{ id: 'p1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }];

it('APPROVER can post a draft (idempotency key sent); ACCOUNTANT cannot post', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  // ACCOUNTANT: no Posting action
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([draftInvoice])),
    http.get(`${API}/partners`, () => HttpResponse.json(onePartner)),
  );
  const { unmount } = renderPage();
  await screen.findByText('Toko A');
  expect(screen.queryByRole('button', { name: /posting/i })).not.toBeInTheDocument();
  unmount();

  // APPROVER: can post; idempotency key header sent
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  let seenKey: string | null = null;
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([draftInvoice])),
    http.get(`${API}/partners`, () => HttpResponse.json(onePartner)),
    http.post(`${API}/sales-invoices/i1/post`, ({ request }) => { seenKey = request.headers.get('Idempotency-Key'); return HttpResponse.json({ ...draftInvoice, status: 'POSTED', invoiceNumber: 1, invoiceRef: 'INV/2026/000001' }); }),
  );
  renderPage();
  await screen.findByText('Toko A');
  await user.click(screen.getByRole('button', { name: /posting/i }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: /posting/i }));
  await waitFor(() => expect(seenKey).toBeTruthy());
});

it('shows the SoD message when post returns 403 SEGREGATION_OF_DUTIES', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([draftInvoice])),
    http.get(`${API}/partners`, () => HttpResponse.json(onePartner)),
    http.post(`${API}/sales-invoices/i1/post`, () => HttpResponse.json({ code: 'SEGREGATION_OF_DUTIES', message: 'no self-approve' }, { status: 403 })),
  );
  renderPage();
  await screen.findByText('Toko A');
  await user.click(screen.getByRole('button', { name: /posting/i }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: /posting/i }));
  // toastApiError routes the 403 to the SoD branch (sonner is mocked above)
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(messages.roles.segregationOfDuties));
});

it('APPROVER can void a posted invoice', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  let voided = false;
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([postedInvoice])),
    http.get(`${API}/partners`, () => HttpResponse.json(onePartner)),
    http.post(`${API}/sales-invoices/i2/void`, () => { voided = true; return HttpResponse.json({ ...postedInvoice, status: 'VOID' }); }),
  );
  renderPage();
  await screen.findByText('Toko A');
  await user.click(screen.getByRole('button', { name: /batalkan/i }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: /batalkan/i }));
  await waitFor(() => expect(voided).toBe(true));
});
```
> With sonner mocked (above), the post-success and void tests still pass because they assert server-side flags (`seenKey`, `voided`), not toasts; `toast.success`/`toast.error` are no-op spies.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/features/sales-invoices/SalesInvoicesPage.test.tsx`
Expected: FAIL (no Posting/Batalkan actions yet).

- [ ] **Step 3: Rewrite the columns actions cell (status + role aware)**

Replace the `actions` column in `src/features/sales-invoices/columns.tsx` with handlers for post/void/delete (edit/view are Links). Update the signature:
```tsx
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { RoleGate } from '@/components/common/RoleGate';
// ... existing imports

export function buildInvoiceColumns(
  t: Messages,
  partnerName: (id: string) => string,
  handlers: { onDelete: (inv: SalesInvoice) => void; onPost: (inv: SalesInvoice) => void; onVoid: (inv: SalesInvoice) => void },
) {
  return [
    col.accessor('invoiceRef', { header: t.salesInvoices.number, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('partnerId', { header: t.salesInvoices.partner, cell: (c) => partnerName(c.getValue()) }),
    col.accessor('date', { header: t.salesInvoices.date, cell: (c) => formatDateID(c.getValue().slice(0, 10)) }),
    col.accessor('status', { header: t.salesInvoices.status, cell: (c) => <Badge variant={c.getValue() === 'DRAFT' ? 'secondary' : 'default'}>{statusLabel(t, c.getValue())}</Badge> }),
    col.accessor('total', { header: t.salesInvoices.total, cell: (c) => <MoneyText value={c.getValue()} /> }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => {
        const inv = c.row.original;
        return (
          <div className="flex justify-end gap-1">
            {inv.status === 'DRAFT' ? (
              <>
                <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/sales-invoices/$id/edit" params={{ id: inv.id }}>{t.common.edit}</Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onDelete(inv)}>{t.common.delete}</Button>
                </RoleGate>
                <RoleGate allow={['APPROVER', 'ADMIN']}>
                  <Button variant="ghost" size="sm" onClick={() => handlers.onPost(inv)}>{t.salesInvoices.post}</Button>
                </RoleGate>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/sales-invoices/$id/edit" params={{ id: inv.id }}>{t.salesInvoices.view}</Link>
                </Button>
                {inv.status === 'POSTED' ? (
                  <RoleGate allow={['APPROVER', 'ADMIN']}>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onVoid(inv)}>{t.salesInvoices.void}</Button>
                  </RoleGate>
                ) : null}
              </>
            )}
          </div>
        );
      },
    }),
  ];
}
```

- [ ] **Step 4: Wire post/void confirm + idempotency into the page**

In `src/features/sales-invoices/SalesInvoicesPage.tsx`:
- Import `usePostInvoice`, `useVoidInvoice` from `./hooks`, `toastApiError` from `@/lib/api/toastApiError`.
- Replace the single delete-confirm state with a unified action state:
```tsx
const post = usePostInvoice();
const voidInvoice = useVoidInvoice();
const [action, setAction] = useState<{ kind: 'delete' | 'post' | 'void'; invoice: SalesInvoice; idempotencyKey?: string } | null>(null);

const columns = useMemo(
  () => buildInvoiceColumns(t, partnerName, {
    onDelete: (inv) => setAction({ kind: 'delete', invoice: inv }),
    onPost: (inv) => setAction({ kind: 'post', invoice: inv, idempotencyKey: crypto.randomUUID() }),
    onVoid: (inv) => setAction({ kind: 'void', invoice: inv, idempotencyKey: crypto.randomUUID() }),
  }),
  [t, partnerName],
);

function runAction() {
  if (!action) return;
  const close = () => setAction(null);
  if (action.kind === 'delete') {
    remove.mutate(action.invoice.id, { onSuccess: () => { toast.success(t.crud.deleted); close(); }, onError: () => toast.error(t.common.error) });
  } else if (action.kind === 'post') {
    post.mutate({ id: action.invoice.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.salesInvoices.posted); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
  } else {
    voidInvoice.mutate({ id: action.invoice.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.salesInvoices.voided); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
  }
}

const confirmCopy = {
  delete: { title: t.crud.confirmDeleteTitle, desc: t.crud.confirmDeleteDesc, label: t.common.delete },
  post: { title: t.salesInvoices.confirmPostTitle, desc: t.salesInvoices.confirmPostDesc, label: t.salesInvoices.post },
  void: { title: t.salesInvoices.confirmVoidTitle, desc: t.salesInvoices.confirmVoidDesc, label: t.salesInvoices.void },
} as const;
```
- Replace the existing `ConfirmDialog` block with one driven by `action`:
```tsx
<ConfirmDialog
  open={!!action}
  onOpenChange={(o) => !o && setAction(null)}
  title={action ? confirmCopy[action.kind].title : ''}
  description={action ? confirmCopy[action.kind].desc : undefined}
  confirmLabel={action ? confirmCopy[action.kind].label : ''}
  destructive={action?.kind !== 'post'}
  pending={remove.isPending || post.isPending || voidInvoice.isPending}
  onConfirm={runAction}
/>
```
> `crypto.randomUUID()` is available in jsdom (Node 24) and the browser. The confirm label for post is "Posting" (matches the row button), so the test's `within(dialog).getByRole('button', { name: /posting/i })` resolves to the dialog action.

- [ ] **Step 5: Run to verify they pass**

Run: `pnpm test src/features/sales-invoices/SalesInvoicesPage.test.tsx`
Expected: PASS (3a's tests + the 3 new lifecycle tests).
> The 3a delete-flow test still passes under the mocked sonner (it asserts the server `deleted` flag, not the toast).

- [ ] **Step 6: Commit**

```bash
git add src/features/sales-invoices/columns.tsx src/features/sales-invoices/SalesInvoicesPage.tsx src/features/sales-invoices/SalesInvoicesPage.test.tsx
git commit -m "feat: post/void row actions with idempotency and SoD handling"
```

---

## Task 8: Full verification

- [ ] **Step 1: Lint, test, build**

Run:
```bash
pnpm lint && pnpm test && pnpm build
```
Expected: lint 0 errors (benign react-compiler warnings OK); all tests pass; build succeeds.

- [ ] **Step 2: Manual smoke (optional, live API in `.env`)**

`pnpm dev`, log in, open **Faktur Penjualan**: create a draft; as APPROVER/ADMIN click **Posting** — with SoD on and a single user this returns the **SoD message** (expected: the creator can't self-approve). Disable SoD in the API (or use a second user) to post successfully; a posted row shows **Lihat** (opens read-only) + **Batalkan**.

- [ ] **Step 3: Commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore: Plan 3b verification fixups" || echo "nothing to commit"
```

---

## Done criteria for Plan 3b

- APPROVER/ADMIN post (idempotent) and void invoices from the list via confirm dialogs; ACCOUNTANT cannot.
- `403 SEGREGATION_OF_DUTIES` surfaces the distinct SoD message (not a generic forbidden).
- Posted/void invoices open read-only in the editor (disabled fields, banner, no Save); the list "Lihat" navigates there.
- `invoiceNumber` parses as a number; the list shows `invoiceRef`.
- `useDocumentAction` + `toastApiError` built, tested, reusable (purchase bills/payments/journals will reuse them).
- `pnpm lint && pnpm test && pnpm build` green. **Plan 3 (Sales Invoices) complete.**
```

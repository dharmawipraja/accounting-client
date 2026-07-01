# DocumentEditorPage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the three near-identical editor-page wrappers (invoice, bill, payment) into one deep `DocumentEditorPage` route module, concentrating the load / new-vs-edit / not-found / readOnly / navigate skeleton in one tested place.

**Architecture:** `DocumentEditorPage({ config, id })` owns the shared route-level lifecycle: it calls the feature's `useItem(id)` loader, branches create-vs-edit off `id`, renders the `QueryState` + `SkeletonForm` + `NotFound` envelope, derives the `readOnly = status !== 'DRAFT'` invariant once, and frames the page with `PageHeader` + a feature-supplied `back` node. The differing form body (`DocumentEditor` for invoice/bill, `PaymentForm` for payment) stays at a single `renderForm` seam and never enters the module's interface. The module is router-agnostic: the feature supplies a typed `onDone` closure (so TanStack route literals keep their types, mirroring `DocumentListConfig.newControl`).

**Tech Stack:** React 19 + TypeScript (strict), TanStack Router + Query v5, Vitest 4 + React Testing Library, Tailwind v4, pnpm.

## Global Constraints

- Money via `Money`/decimal.js only — never JS floats. (Not touched by this plan, but keep it true.)
- Every user-facing string goes through `useT()` — no hardcoded copy, no em-dashes in UI strings.
- Wrap query rendering in `QueryState` (loading → not-found → error → data).
- Do NOT change routes, nav labels, or form-field names.
- Pre-existing ESLint warnings about React Compiler / react-hook-form incompatibility are expected — do NOT "fix" them.
- Commands: Tests `pnpm test --run` · Typecheck `pnpm exec tsc --noEmit` · Lint `pnpm run lint` · Build `pnpm run build`.
- The existing form-body config type is named `DocumentEditorConfig` (in `DocumentEditor.tsx`). This plan's new config type MUST be named `DocumentEditorPageConfig` to avoid a name collision.
- Behavior must be preserved exactly. The three wrappers currently: (a) render the create form with no `doc`/`readOnly` when there is no `id`; (b) on an `id`, load via `useItem`, show `SkeletonForm fields={6}` while loading, `NotFound(recordTitle · recordMessage · backToList→goList)` on a 404, and the form with `readOnly = status !== 'DRAFT'` on success; (c) title is create / (readOnly ? view : edit).

## Work on a branch

The repo starts on `main`. Before Task 1, create the feature branch:

```bash
git checkout -b feat/document-editor-page
```

---

### Task 1: `DocumentEditorPage` module + unit test

**Files:**
- Create: `src/features/documents/DocumentEditorPage.tsx`
- Test: `src/features/documents/DocumentEditorPage.test.tsx`

**Interfaces:**
- Consumes: `QueryState`, `SkeletonForm`, `NotFound`, `PageHeader`, `Button`, `useT`, `ApiError`, `UseQueryResult`.
- Produces:
  - `export interface DocumentEditorPageConfig<T extends { id: string; status: string }> { useItem: (id: string) => UseQueryResult<T, ApiError>; onDone: () => void; back: ReactNode; titles: { create: string; edit: string; view: string }; renderForm: (ctx: { mode: 'create' | 'edit'; doc?: T; readOnly: boolean; onSaved: () => void }) => ReactNode; }`
  - `export function DocumentEditorPage<T extends { id: string; status: string }>({ config, id }: { config: DocumentEditorPageConfig<T>; id?: string }): JSX.Element`

- [ ] **Step 1: Write the failing test**

Create `src/features/documents/DocumentEditorPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { UseQueryResult } from '@tanstack/react-query';
import { id as messages } from '@/lib/i18n/messages.id';
import { ApiError } from '@/lib/api/errors';
import { DocumentEditorPage, type DocumentEditorPageConfig } from './DocumentEditorPage';

type Doc = { id: string; status: string };

// The module reads only these fields off the query, so a hand-crafted result is
// deterministic and needs no QueryClient/MSW.
function fakeQuery(over: Partial<UseQueryResult<Doc, ApiError>>): UseQueryResult<Doc, ApiError> {
  return {
    isPending: false,
    isError: false,
    fetchStatus: 'idle',
    data: undefined,
    error: null,
    refetch: vi.fn(),
    ...over,
  } as unknown as UseQueryResult<Doc, ApiError>;
}

function makeConfig(query: UseQueryResult<Doc, ApiError>, onDone = vi.fn()): DocumentEditorPageConfig<Doc> {
  return {
    useItem: () => query,
    onDone,
    back: <span>kembali</span>,
    titles: { create: 'Buat Dokumen', edit: 'Ubah Dokumen', view: 'Lihat Dokumen' },
    renderForm: ({ mode, readOnly }) => <div>{`form:${mode}:${String(readOnly)}`}</div>,
  };
}

it('create mode (no id) renders the create title and form without consulting the query', () => {
  render(<DocumentEditorPage config={makeConfig(fakeQuery({}))} />);
  expect(screen.getByText('Buat Dokumen')).toBeInTheDocument();
  expect(screen.getByText('form:create:false')).toBeInTheDocument();
  expect(screen.getByText('kembali')).toBeInTheDocument();
});

it('edit mode shows a loading skeleton while the item is fetching', () => {
  const { container } = render(
    <DocumentEditorPage config={makeConfig(fakeQuery({ isPending: true, fetchStatus: 'fetching' }))} id="d1" />,
  );
  expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
});

it('edit mode renders record-not-found on a 404 and wires back-to-list to onDone', async () => {
  const user = userEvent.setup();
  const onDone = vi.fn();
  const q = fakeQuery({ isError: true, error: new ApiError({ status: 404, code: 'NOT_FOUND', message: 'x' }) });
  render(<DocumentEditorPage config={makeConfig(q, onDone)} id="d1" />);
  const back = screen.getByRole('button', { name: messages.notFound.backToList });
  await user.click(back);
  expect(onDone).toHaveBeenCalledTimes(1);
});

it('edit mode on a DRAFT doc renders the edit title and an editable form', () => {
  render(<DocumentEditorPage config={makeConfig(fakeQuery({ data: { id: 'd1', status: 'DRAFT' } }))} id="d1" />);
  expect(screen.getByText('Ubah Dokumen')).toBeInTheDocument();
  expect(screen.getByText('form:edit:false')).toBeInTheDocument();
});

it('edit mode on a POSTED doc renders the view title and a read-only form', () => {
  render(<DocumentEditorPage config={makeConfig(fakeQuery({ data: { id: 'd1', status: 'POSTED' } }))} id="d1" />);
  expect(screen.getByText('Lihat Dokumen')).toBeInTheDocument();
  expect(screen.getByText('form:edit:true')).toBeInTheDocument();
});

it('edit mode on a non-404 error falls through to the error state (not notFound, not data)', () => {
  const q = fakeQuery({ isError: true, error: new ApiError({ status: 500, code: 'SERVER', message: 'x' }) });
  render(<DocumentEditorPage config={makeConfig(q)} id="d1" />);
  expect(screen.queryByRole('button', { name: messages.notFound.backToList })).not.toBeInTheDocument();
  expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test --run src/features/documents/DocumentEditorPage.test.tsx`
Expected: FAIL — cannot resolve `./DocumentEditorPage` (module does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `src/features/documents/DocumentEditorPage.tsx`:

```tsx
import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { NotFound } from '@/components/common/NotFound';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { useT } from '@/lib/i18n/useT';
import type { ApiError } from '@/lib/api/errors';

export interface DocumentEditorPageConfig<T extends { id: string; status: string }> {
  /** The loader hook, e.g. salesInvoicesApi.useItem. Disabled internally when id is empty. */
  useItem: (id: string) => UseQueryResult<T, ApiError>;
  /** Navigate-on-save and the not-found "back to list" action. Feature-supplied so
   *  the TanStack route literal keeps its type (mirrors DocumentListConfig.newControl). */
  onDone: () => void;
  /** Pre-rendered <BackLink> for the PageHeader. */
  back: ReactNode;
  titles: { create: string; edit: string; view: string };
  /** The one seam: maps the loaded doc onto the feature's form body. */
  renderForm: (ctx: { mode: 'create' | 'edit'; doc?: T; readOnly: boolean; onSaved: () => void }) => ReactNode;
}

/** Route-level wrapper shared by the invoice / bill / payment editor pages: load,
 *  new-vs-edit branch, not-found + loading envelope, the editable-only-while-DRAFT
 *  invariant, and navigate-on-save. The form body is supplied via config.renderForm. */
export function DocumentEditorPage<T extends { id: string; status: string }>({
  config,
  id,
}: {
  config: DocumentEditorPageConfig<T>;
  id?: string;
}) {
  const t = useT();
  const item = config.useItem(id ?? '');

  if (!id) {
    return (
      <div>
        <PageHeader title={config.titles.create} back={config.back} />
        {config.renderForm({ mode: 'create', readOnly: false, onSaved: config.onDone })}
      </div>
    );
  }

  return (
    <QueryState
      query={item}
      loading={<SkeletonForm fields={6} />}
      onRetry
      notFound={
        <NotFound
          title={t.notFound.recordTitle}
          message={t.notFound.recordMessage}
          action={<Button onClick={config.onDone}>{t.notFound.backToList}</Button>}
        />
      }
    >
      {(doc) => {
        const readOnly = doc.status !== 'DRAFT';
        return (
          <div>
            <PageHeader title={readOnly ? config.titles.view : config.titles.edit} back={config.back} />
            {config.renderForm({ mode: 'edit', doc, readOnly, onSaved: config.onDone })}
          </div>
        );
      }}
    </QueryState>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test --run src/features/documents/DocumentEditorPage.test.tsx`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors from the two new files.

- [ ] **Step 6: Commit**

```bash
git add src/features/documents/DocumentEditorPage.tsx src/features/documents/DocumentEditorPage.test.tsx
git commit -m "feat(documents): add DocumentEditorPage route module + tests"
```

---

### Task 2: Migrate `InvoiceEditorPage` onto `DocumentEditorPage`

**Files:**
- Modify: `src/features/sales-invoices/InvoiceEditorPage.tsx` (full rewrite, 53 → ~22 lines)

**Interfaces:**
- Consumes: `DocumentEditorPage`, `DocumentEditorPageConfig` (Task 1); `salesInvoicesApi.useItem` → `UseQueryResult<SalesInvoice, ApiError>`; `useInvoiceEditorConfig()`; `DocumentEditor` props `{ config, mode, doc?, readOnly?, onSaved }`; i18n keys `nav.salesInvoices`, `salesInvoices.{newInvoice,editInvoice,view}`.
- Produces: unchanged public shape — `InvoiceEditorPage({ id?: string })`.

- [ ] **Step 1: Rewrite the wrapper to build config**

Replace the entire contents of `src/features/sales-invoices/InvoiceEditorPage.tsx` with:

```tsx
import { useNavigate } from '@tanstack/react-router';
import { BackLink } from '@/components/common/BackLink';
import { useT } from '@/lib/i18n/useT';
import { DocumentEditor } from '@/features/documents/DocumentEditor';
import { DocumentEditorPage } from '@/features/documents/DocumentEditorPage';
import { useInvoiceEditorConfig } from './editorConfig';
import { salesInvoicesApi } from './hooks';

export function InvoiceEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const editorConfig = useInvoiceEditorConfig();
  return (
    <DocumentEditorPage
      id={id}
      config={{
        useItem: salesInvoicesApi.useItem,
        onDone: () => navigate({ to: '/sales-invoices' }),
        back: <BackLink to="/sales-invoices" label={t.nav.salesInvoices} />,
        titles: { create: t.salesInvoices.newInvoice, edit: t.salesInvoices.editInvoice, view: t.salesInvoices.view },
        renderForm: ({ mode, doc, readOnly, onSaved }) => (
          <DocumentEditor config={editorConfig} mode={mode} doc={doc} readOnly={readOnly} onSaved={onSaved} />
        ),
      }}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. (This proves the config wiring — `T` inferred as `SalesInvoice` from `useItem`, and `doc` flowing into `DocumentEditor`'s `doc?: TItem` — type-checks.)

- [ ] **Step 3: Run the invoice form + sales-invoices tests**

Run: `pnpm test --run src/features/sales-invoices`
Expected: PASS. The form-body tests (`InvoiceForm.test.tsx`, `InvoiceForm.readonly.test.tsx`) render `DocumentEditor` directly and are unaffected; this confirms nothing regressed.

- [ ] **Step 4: Commit**

```bash
git add src/features/sales-invoices/InvoiceEditorPage.tsx
git commit -m "refactor(sales-invoices): InvoiceEditorPage on DocumentEditorPage"
```

---

### Task 3: Migrate `BillEditorPage` onto `DocumentEditorPage`

**Files:**
- Modify: `src/features/purchase-bills/BillEditorPage.tsx` (full rewrite, 53 → ~22 lines)

**Interfaces:**
- Consumes: `DocumentEditorPage` (Task 1); `purchaseBillsApi.useItem` → `UseQueryResult<PurchaseBill, ApiError>`; `useBillEditorConfig()`; `DocumentEditor`; i18n keys `nav.purchaseBills`, `purchaseBills.{newBill,editBill,view}`.
- Produces: unchanged — `BillEditorPage({ id?: string })`.

- [ ] **Step 1: Rewrite the wrapper to build config**

Replace the entire contents of `src/features/purchase-bills/BillEditorPage.tsx` with:

```tsx
import { useNavigate } from '@tanstack/react-router';
import { BackLink } from '@/components/common/BackLink';
import { useT } from '@/lib/i18n/useT';
import { DocumentEditor } from '@/features/documents/DocumentEditor';
import { DocumentEditorPage } from '@/features/documents/DocumentEditorPage';
import { useBillEditorConfig } from './editorConfig';
import { purchaseBillsApi } from './hooks';

export function BillEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const editorConfig = useBillEditorConfig();
  return (
    <DocumentEditorPage
      id={id}
      config={{
        useItem: purchaseBillsApi.useItem,
        onDone: () => navigate({ to: '/purchase-bills' }),
        back: <BackLink to="/purchase-bills" label={t.nav.purchaseBills} />,
        titles: { create: t.purchaseBills.newBill, edit: t.purchaseBills.editBill, view: t.purchaseBills.view },
        renderForm: ({ mode, doc, readOnly, onSaved }) => (
          <DocumentEditor config={editorConfig} mode={mode} doc={doc} readOnly={readOnly} onSaved={onSaved} />
        ),
      }}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Run the bill form + purchase-bills tests**

Run: `pnpm test --run src/features/purchase-bills`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/purchase-bills/BillEditorPage.tsx
git commit -m "refactor(purchase-bills): BillEditorPage on DocumentEditorPage"
```

---

### Task 4: Migrate `PaymentEditorPage` onto `DocumentEditorPage`

**Files:**
- Modify: `src/features/payments/PaymentEditorPage.tsx` (full rewrite, 47 → ~26 lines)

**Interfaces:**
- Consumes: `DocumentEditorPage` (Task 1); `paymentsApi.useItem` → `UseQueryResult<Payment, ApiError>`; `PaymentForm` props `{ mode, payment?, onSaved, readOnly?, direction? }`; i18n keys `nav.payments`, `payments.{newReceiptTitle,newDisbursementTitle,editPayment,view}`.
- Produces: unchanged — `PaymentEditorPage({ id?: string; direction?: 'RECEIPT' | 'DISBURSEMENT' })`.

- [ ] **Step 1: Rewrite the wrapper to build config**

Replace the entire contents of `src/features/payments/PaymentEditorPage.tsx` with:

```tsx
import { useNavigate } from '@tanstack/react-router';
import { BackLink } from '@/components/common/BackLink';
import { useT } from '@/lib/i18n/useT';
import { DocumentEditorPage } from '@/features/documents/DocumentEditorPage';
import { PaymentForm } from './PaymentForm';
import { paymentsApi } from './hooks';

export function PaymentEditorPage({ id, direction = 'RECEIPT' }: { id?: string; direction?: 'RECEIPT' | 'DISBURSEMENT' }) {
  const t = useT();
  const navigate = useNavigate();
  const createTitle = direction === 'DISBURSEMENT' ? t.payments.newDisbursementTitle : t.payments.newReceiptTitle;
  return (
    <DocumentEditorPage
      id={id}
      config={{
        useItem: paymentsApi.useItem,
        onDone: () => navigate({ to: '/payments' }),
        back: <BackLink to="/payments" label={t.nav.payments} />,
        titles: { create: createTitle, edit: t.payments.editPayment, view: t.payments.view },
        renderForm: ({ mode, doc, readOnly, onSaved }) => (
          <PaymentForm mode={mode} payment={doc} direction={direction} onSaved={onSaved} readOnly={readOnly} />
        ),
      }}
    />
  );
}
```

Note: `PaymentForm` resolves the effective direction as `payment?.direction ?? directionProp`, so passing `direction` in both create and edit is safe and preserves current behavior.

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Run the payments tests**

Run: `pnpm test --run src/features/payments`
Expected: PASS. (`PaymentForm.test.tsx` renders `PaymentForm` directly and is unaffected.)

- [ ] **Step 4: Commit**

```bash
git add src/features/payments/PaymentEditorPage.tsx
git commit -m "refactor(payments): PaymentEditorPage on DocumentEditorPage"
```

---

### Task 5: Full verification + duplication check

**Files:** none created; verification only.

- [ ] **Step 1: Confirm the duplicated envelope is gone from the three wrappers**

Run: `grep -rn "notFound.recordTitle\|status !== 'DRAFT'\|SkeletonForm" src/features/sales-invoices/InvoiceEditorPage.tsx src/features/purchase-bills/BillEditorPage.tsx src/features/payments/PaymentEditorPage.tsx`
Expected: no matches (the readOnly derivation, the not-found copy, and the skeleton now live only in `DocumentEditorPage.tsx`). `JournalEntryEditorPage.tsx` is intentionally untouched.

- [ ] **Step 2: Full test suite**

Run: `pnpm test --run`
Expected: PASS. Total count is the prior baseline + 6 new tests from Task 1.

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Lint**

Run: `pnpm run lint`
Expected: 0 errors. Pre-existing React Compiler / react-hook-form warnings may remain — do NOT fix them.

- [ ] **Step 5: Build**

Run: `pnpm run build`
Expected: succeeds.

- [ ] **Step 6: Commit (only if lint/build produced incidental formatting changes)**

```bash
git add -A
git commit -m "chore(documents): verify DocumentEditorPage migration green" || echo "nothing to commit"
```

---

## Out of scope (recorded, not done here)

- **Candidate 1(b):** the `useDocumentSubmit` + `<ReadOnlyBanner>` seam inside the form bodies (`DocumentEditor.tsx`, `PaymentForm.tsx`). A separate, smaller seam — do as a follow-up branch.
- **Journal:** `JournalEntryEditorPage` stays bespoke (create-only + read-only detail-table edit view — a different lifecycle shape). Not migrated.

## Self-Review

**Spec coverage:** scope = invoice/bill/payment wrappers (Tasks 2–4) over a new tested module (Task 1), verified end-to-end (Task 5). Journal intentionally excluded. Covered.

**Placeholder scan:** every code step contains full file contents; every run step has an exact command and expected result. No TBD/TODO.

**Type consistency:** the config type is `DocumentEditorPageConfig` everywhere (distinct from the existing `DocumentEditorConfig`). `useItem` returns `UseQueryResult<T, ApiError>`; `renderForm` ctx is `{ mode, doc?, readOnly, onSaved }` in Task 1 and consumed identically in Tasks 2–4. `DocumentEditor` is passed `{ config, mode, doc, readOnly, onSaved }` and `PaymentForm` `{ mode, payment, direction, onSaved, readOnly }`, matching their real prop interfaces.

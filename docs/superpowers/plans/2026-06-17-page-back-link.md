# Back Link on Sub-Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a labeled "back to parent" link to the document editors and report pages, so the way out of a sub-page is always visible at the top.

**Architecture:** A new `BackLink` component (a styled TanStack Router `<Link>` with an ArrowLeft icon + parent label) is slotted into the shared `PageHeader` via a new optional `back?: ReactNode` prop. Each of the 10 sub-page components passes `back={<BackLink to="<parent>" label={t.nav.<key>} />}`. Because `BackLink` renders a router `<Link>` (which needs router context), the 6 existing report-page tests — which render without a router — are migrated to a new shared `renderWithRouter` test helper.

**Tech Stack:** React 19, TypeScript strict, TanStack Router (file-based), lucide-react (`ArrowLeft`), Tailwind v4 tokens (`text-primary`, `ring-ring`), Vitest 4 + RTL, MSW v2.

---

## Spec

Reference: `docs/superpowers/specs/2026-06-17-page-back-link-design.md`

## File Structure

- `src/test/renderWithRouter.tsx` — **Create.** Test helper: renders a node inside a memory router (with the 5 sub-page parent routes registered) plus a QueryClient. Used by `BackLink` test and the migrated report tests.
- `src/components/common/BackLink.tsx` — **Create.** The back-link component (typed parent route + label).
- `src/components/common/BackLink.test.tsx` — **Create.**
- `src/components/common/PageHeader.tsx` — **Modify.** Add optional `back` slot above the title.
- `src/components/common/PageHeader.test.tsx` — **Create.**
- `src/features/{sales-invoices,purchase-bills,payments,journals}/*EditorPage.tsx` — **Modify** (one `back` per `PageHeader`).
- `src/features/reports/{BalanceSheet,IncomeStatement,CashFlow,TrialBalance,GeneralLedger,Aging}Page.tsx` — **Modify** (one `back` each).
- `src/features/reports/*Page.test.tsx` (the 6 above) — **Modify** (migrate to `renderWithRouter`); `TrialBalancePage.test.tsx` also gets the back-link smoke.

---

## Task 1: `renderWithRouter` helper + `BackLink` component

**Files:**
- Create: `src/test/renderWithRouter.tsx`
- Create: `src/components/common/BackLink.tsx`
- Create: `src/components/common/BackLink.test.tsx`

- [ ] **Step 1: Create the test helper**

Create `src/test/renderWithRouter.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

/** The sub-page parent routes a BackLink may point at. Registered so <Link> resolves their href. */
const PARENT_PATHS = ['/sales-invoices', '/purchase-bills', '/payments', '/journals', '/reports'];

/**
 * Render a component inside a memory router + QueryClient. Use for anything that
 * renders a TanStack Router <Link> (e.g. BackLink), which throws without router context.
 */
export function renderWithRouter(ui: ReactNode) {
  const root = createRootRoute({ component: () => ui });
  const children = PARENT_PATHS.map((path) =>
    createRoute({ getParentRoute: () => root, path, component: () => null }),
  );
  const router = createRouter({
    routeTree: root.addChildren(children),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
```

(This mirrors the existing `src/components/common/AppShell.test.tsx` router harness, which already creates a custom router in tests and compiles cleanly.)

- [ ] **Step 2: Write the failing BackLink test**

Create `src/components/common/BackLink.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { BackLink } from './BackLink';

it('renders the label and an icon, linking to the parent route', async () => {
  renderWithRouter(<BackLink to="/sales-invoices" label="Faktur Penjualan" />);
  const link = await screen.findByRole('link', { name: 'Faktur Penjualan' });
  expect(link).toHaveAttribute('href', '/sales-invoices');
  expect(link.querySelector('svg')).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test --run src/components/common/BackLink.test.tsx`
Expected: FAIL — `BackLink` is not defined / module `./BackLink` not found.

- [ ] **Step 4: Create the BackLink component**

Create `src/components/common/BackLink.tsx`:

```tsx
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

/** Parent routes a sub-page can return to. Typed so a wrong route is a compile error. */
type ParentRoute = '/sales-invoices' | '/purchase-bills' | '/payments' | '/journals' | '/reports';

export function BackLink({ to, label }: { to: ParentRoute; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test --run src/components/common/BackLink.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: clean. (The `to` union is assignable to the typed `Link` `to`; the custom test router compiles, same as `AppShell.test`.)

- [ ] **Step 7: Commit**

```bash
git add src/test/renderWithRouter.tsx src/components/common/BackLink.tsx src/components/common/BackLink.test.tsx
git commit -m "feat(nav): BackLink component + renderWithRouter test helper"
```

---

## Task 2: `PageHeader` back slot

**Files:**
- Modify: `src/components/common/PageHeader.tsx`
- Create: `src/components/common/PageHeader.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/PageHeader.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

it('renders the title heading', () => {
  render(<PageHeader title="Judul" />);
  expect(screen.getByRole('heading', { name: 'Judul' })).toBeInTheDocument();
});

it('renders the back slot when provided', () => {
  render(<PageHeader title="Judul" back={<a href="/x">Kembali</a>} />);
  expect(screen.getByRole('link', { name: 'Kembali' })).toBeInTheDocument();
});

it('renders no link when back is omitted', () => {
  render(<PageHeader title="Judul" />);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify the back-slot cases fail**

Run: `pnpm test --run src/components/common/PageHeader.test.tsx`
Expected: FAIL — `PageHeader` does not accept `back`; "renders the back slot when provided" fails (no "Kembali" link). (The title test passes.)

- [ ] **Step 3: Add the back slot**

Replace the entire contents of `src/components/common/PageHeader.tsx` with:

```tsx
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  actions,
  back,
}: {
  title: string;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {back ? <div className="mb-2">{back}</div> : null}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test --run src/components/common/PageHeader.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/common/PageHeader.tsx src/components/common/PageHeader.test.tsx
git commit -m "feat(nav): optional back slot on PageHeader"
```

---

## Task 3: Migrate the 6 report-page tests to `renderWithRouter`

Adding `BackLink` to the report pages (Task 4) makes them render a `<Link>`, which throws without router context. These 6 tests currently render with only a `QueryClientProvider`. Migrate them to `renderWithRouter` first, so they stay green when Task 4 lands. No page code changes here; tests must remain green after this task (the pages render the same, now inside a router).

**Files (modify all six):**
- `src/features/reports/TrialBalancePage.test.tsx`
- `src/features/reports/BalanceSheetPage.test.tsx`
- `src/features/reports/IncomeStatementPage.test.tsx`
- `src/features/reports/CashFlowPage.test.tsx`
- `src/features/reports/GeneralLedgerPage.test.tsx`
- `src/features/reports/AgingPage.test.tsx`

The transformation is identical in each: drop the `@tanstack/react-query` import and the local `render(...)`, import `renderWithRouter`, and call it instead. Drop `render` from the `@testing-library/react` import (it becomes unused).

- [ ] **Step 1: TrialBalancePage.test.tsx**

Change the import on line 1:
- Remove: `import { QueryClient, QueryClientProvider } from '@tanstack/react-query';`

Change line 2 from:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
```
to:
```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react';
```

Add this import (next to the other `@/test` / local imports, e.g. after the `server` import):
```tsx
import { renderWithRouter } from '@/test/renderWithRouter';
```

Replace the `renderPage` function:
```tsx
function renderPage() {
  const onOpenAccount = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><TrialBalancePage onOpenAccount={onOpenAccount} /></QueryClientProvider>);
  return onOpenAccount;
}
```
with:
```tsx
function renderPage() {
  const onOpenAccount = vi.fn();
  renderWithRouter(<TrialBalancePage onOpenAccount={onOpenAccount} />);
  return onOpenAccount;
}
```

- [ ] **Step 2: BalanceSheetPage.test.tsx**

Remove line 1 (`import { QueryClient, QueryClientProvider } from '@tanstack/react-query';`).
Change line 2 from `import { fireEvent, render, screen, waitFor } from '@testing-library/react';` to `import { fireEvent, screen, waitFor } from '@testing-library/react';`.
Add `import { renderWithRouter } from '@/test/renderWithRouter';` with the other imports.
Replace:
```tsx
function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><BalanceSheetPage /></QueryClientProvider>);
}
```
with:
```tsx
function renderPage() {
  return renderWithRouter(<BalanceSheetPage />);
}
```

- [ ] **Step 3: IncomeStatementPage.test.tsx**

Remove line 1 (`import { QueryClient, QueryClientProvider } from '@tanstack/react-query';`).
Change line 2 from `import { render, screen, waitFor } from '@testing-library/react';` to `import { screen, waitFor } from '@testing-library/react';`.
Add `import { renderWithRouter } from '@/test/renderWithRouter';`.
Replace:
```tsx
function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><IncomeStatementPage /></QueryClientProvider>);
}
```
with:
```tsx
function renderPage() {
  return renderWithRouter(<IncomeStatementPage />);
}
```

- [ ] **Step 4: CashFlowPage.test.tsx**

Remove line 1 (`import { QueryClient, QueryClientProvider } from '@tanstack/react-query';`).
Change line 2 from `import { render, screen } from '@testing-library/react';` to `import { screen } from '@testing-library/react';`.
Add `import { renderWithRouter } from '@/test/renderWithRouter';`.
Replace:
```tsx
function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><CashFlowPage /></QueryClientProvider>);
}
```
with:
```tsx
function renderPage() {
  return renderWithRouter(<CashFlowPage />);
}
```

- [ ] **Step 5: GeneralLedgerPage.test.tsx**

Remove line 1 (`import { QueryClient, QueryClientProvider } from '@tanstack/react-query';`).
Change line 2 from `import { render, screen, waitFor } from '@testing-library/react';` to `import { screen, waitFor } from '@testing-library/react';`.
Add `import { renderWithRouter } from '@/test/renderWithRouter';`.
Replace:
```tsx
function renderPage(initialAccountId?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><GeneralLedgerPage initialAccountId={initialAccountId} /></QueryClientProvider>);
}
```
with:
```tsx
function renderPage(initialAccountId?: string) {
  renderWithRouter(<GeneralLedgerPage initialAccountId={initialAccountId} />);
}
```

Also fix one synchronous assertion in this file: under `renderWithRouter`, `RouterProvider` mounts asynchronously (an internal transition), so a `getByText` immediately after render runs before the content is in the DOM. The `it('shows the select-account hint ...')` test (already `async`) has on its first assertion:
```tsx
expect(screen.getByText(/pilih akun/i)).toBeInTheDocument();
```
Change it to await the hint:
```tsx
expect(await screen.findByText(/pilih akun/i)).toBeInTheDocument();
```
(The later `expect(called).toBe(false)` assertion is unaffected.) This is the only report test with a synchronous post-render assertion; the others already use `findBy`/`waitFor` and tolerate the async mount.

- [ ] **Step 6: AgingPage.test.tsx**

Remove line 1 (`import { QueryClient, QueryClientProvider } from '@tanstack/react-query';`).
Change line 2 from `import { fireEvent, render, screen, waitFor } from '@testing-library/react';` to `import { fireEvent, screen, waitFor } from '@testing-library/react';`.
Add `import { renderWithRouter } from '@/test/renderWithRouter';`.
Replace:
```tsx
function renderPage(kind: 'AR' | 'AP') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><AgingPage kind={kind} /></QueryClientProvider>);
}
```
with:
```tsx
function renderPage(kind: 'AR' | 'AP') {
  renderWithRouter(<AgingPage kind={kind} />);
}
```

- [ ] **Step 7: Run the report tests + typecheck to verify all still pass**

Run: `pnpm test --run src/features/reports/`
Expected: PASS (all report tests green — same assertions, now inside a router).

Run: `pnpm exec tsc --noEmit`
Expected: clean (no unused `render`/`QueryClient` imports left).

- [ ] **Step 8: Commit**

```bash
git add src/features/reports/*.test.tsx
git commit -m "test(reports): render report pages via renderWithRouter (router context)"
```

---

## Task 4: Wire `BackLink` into the 6 report pages + back-link smoke

**Files:**
- Modify: `src/features/reports/BalanceSheetPage.tsx`, `IncomeStatementPage.tsx`, `CashFlowPage.tsx`, `TrialBalancePage.tsx`, `GeneralLedgerPage.tsx`, `AgingPage.tsx`
- Modify (smoke): `src/features/reports/TrialBalancePage.test.tsx`

- [ ] **Step 1: Add the back-link smoke test (red)**

In `src/features/reports/TrialBalancePage.test.tsx`, add this test after the existing one (the file already imports `http`, `HttpResponse`, `server`, `API`, `useSession`, and defines `fixture` + `renderPage`):

```tsx
it('shows a back link to the reports menu', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(http.get(`${API}/ledger/trial-balance`, ({ request }) =>
    HttpResponse.json(fixture(new URL(request.url).searchParams.get('asOf') ?? '')),
  ));
  renderPage();
  const link = await screen.findByRole('link', { name: 'Laporan' });
  expect(link).toHaveAttribute('href', '/reports');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test --run src/features/reports/TrialBalancePage.test.tsx`
Expected: FAIL on the new test — there is no `link` named "Laporan" yet (the page has no BackLink).

- [ ] **Step 3: Wire BackLink into each report page**

In each file, add the import `import { BackLink } from '@/components/common/BackLink';` (next to the existing `PageHeader` import) and add `back={<BackLink to="/reports" label={t.nav.reports} />}` to the page's single `<PageHeader>`.

`TrialBalancePage.tsx` (line 28):
```tsx
<PageHeader title={t.reports.trialBalance} back={<BackLink to="/reports" label={t.nav.reports} />} />
```
`BalanceSheetPage.tsx` (line 40):
```tsx
<PageHeader title={t.reports.balanceSheet} back={<BackLink to="/reports" label={t.nav.reports} />} />
```
`IncomeStatementPage.tsx` (line 42):
```tsx
<PageHeader title={t.reports.incomeStatement} back={<BackLink to="/reports" label={t.nav.reports} />} />
```
`CashFlowPage.tsx` (line 39):
```tsx
<PageHeader title={t.reports.cashFlow} back={<BackLink to="/reports" label={t.nav.reports} />} />
```
`GeneralLedgerPage.tsx` (line 34):
```tsx
<PageHeader title={t.reports.generalLedger} back={<BackLink to="/reports" label={t.nav.reports} />} />
```
`AgingPage.tsx` (line 51):
```tsx
<PageHeader title={title} back={<BackLink to="/reports" label={t.nav.reports} />} />
```

- [ ] **Step 4: Run the report tests to verify all pass**

Run: `pnpm test --run src/features/reports/`
Expected: PASS, including the new "shows a back link to the reports menu".

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/reports/*.tsx
git commit -m "feat(reports): back link to the Reports menu on every report page"
```

---

## Task 5: Wire `BackLink` into the 4 document editors

No editor-page tests exist, so verification is `tsc` + the full suite. Add the import to each file and a `back` prop to each `PageHeader` (both the `new` branch and the edit/view branch). Use each editor's own parent + nav label.

**Files:**
- Modify: `src/features/sales-invoices/InvoiceEditorPage.tsx`
- Modify: `src/features/purchase-bills/BillEditorPage.tsx`
- Modify: `src/features/payments/PaymentEditorPage.tsx`
- Modify: `src/features/journals/JournalEntryEditorPage.tsx`

- [ ] **Step 1: InvoiceEditorPage.tsx**

Add `import { BackLink } from '@/components/common/BackLink';` next to the `PageHeader` import.
Line 20: `<PageHeader title={t.salesInvoices.newInvoice} />` →
```tsx
<PageHeader title={t.salesInvoices.newInvoice} back={<BackLink to="/sales-invoices" label={t.nav.salesInvoices} />} />
```
Line 43: `<PageHeader title={readOnly ? t.salesInvoices.view : t.salesInvoices.editInvoice} />` →
```tsx
<PageHeader title={readOnly ? t.salesInvoices.view : t.salesInvoices.editInvoice} back={<BackLink to="/sales-invoices" label={t.nav.salesInvoices} />} />
```

- [ ] **Step 2: BillEditorPage.tsx**

Add `import { BackLink } from '@/components/common/BackLink';`.
Line 20: `<PageHeader title={t.purchaseBills.newBill} />` →
```tsx
<PageHeader title={t.purchaseBills.newBill} back={<BackLink to="/purchase-bills" label={t.nav.purchaseBills} />} />
```
Line 43: `<PageHeader title={readOnly ? t.purchaseBills.view : t.purchaseBills.editBill} />` →
```tsx
<PageHeader title={readOnly ? t.purchaseBills.view : t.purchaseBills.editBill} back={<BackLink to="/purchase-bills" label={t.nav.purchaseBills} />} />
```

- [ ] **Step 3: PaymentEditorPage.tsx**

Add `import { BackLink } from '@/components/common/BackLink';`.
Line 19 (new branch, inline): `<PageHeader title={title} />` →
```tsx
<PageHeader title={title} back={<BackLink to="/payments" label={t.nav.payments} />} />
```
Line 39: `<PageHeader title={readOnly ? t.payments.view : t.payments.editPayment} />` →
```tsx
<PageHeader title={readOnly ? t.payments.view : t.payments.editPayment} back={<BackLink to="/payments" label={t.nav.payments} />} />
```

- [ ] **Step 4: JournalEntryEditorPage.tsx**

Add `import { BackLink } from '@/components/common/BackLink';`.
Line 29 (new branch, inline): `<PageHeader title={t.journals.newEntry} />` →
```tsx
<PageHeader title={t.journals.newEntry} back={<BackLink to="/journals" label={t.nav.journals} />} />
```
Line 47: `<PageHeader title={`${t.journals.view}${je.entryRef ? ` · ${je.entryRef}` : ''}`} />` →
```tsx
<PageHeader title={`${t.journals.view}${je.entryRef ? ` · ${je.entryRef}` : ''}`} back={<BackLink to="/journals" label={t.nav.journals} />} />
```

- [ ] **Step 5: Typecheck + run the affected feature suites**

Run: `pnpm exec tsc --noEmit`
Expected: clean (a wrong `to` would be a `ParentRoute` compile error).

Run: `pnpm test --run src/features/sales-invoices/ src/features/purchase-bills/ src/features/payments/ src/features/journals/`
Expected: PASS (list-page tests unaffected; editors have no tests but must compile/render).

- [ ] **Step 6: Commit**

```bash
git add src/features/sales-invoices/InvoiceEditorPage.tsx src/features/purchase-bills/BillEditorPage.tsx src/features/payments/PaymentEditorPage.tsx src/features/journals/JournalEntryEditorPage.tsx
git commit -m "feat(editors): back link to the list on invoice/bill/payment/journal editors"
```

---

## Task 6: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `pnpm test --run`
Expected: all green (prior baseline + `BackLink` test + 3 `PageHeader` tests + the TrialBalance back-link test).

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `pnpm run lint`
Expected: no new warnings/errors (the pre-existing React-Compiler / react-hook-form warnings are expected per `CLAUDE.md` — do not "fix" them).

- [ ] **Step 4: Build**

Run: `pnpm run build`
Expected: succeeds.

- [ ] **Step 5: Commit (only if a lint autofix touched files; else skip)**

```bash
git add -A
git commit -m "chore(nav): back-link lint/build gate green" || echo "nothing to commit"
```

---

## Manual / visual verification (in `pnpm dev`)

- Each editor (new, edit, read-only view) and each report page shows "← <parent>" above the title; clicking lands on the parent list / Reports menu.
- Refresh a sub-page (deep link), then click back — still goes to the fixed parent.
- Top-level pages (dashboard, lists, accounts, partners, tax codes, periods, settings, audit) are unchanged (no back link).
- Toggle dark mode: the link uses `text-primary`, so it adapts; focus-tab shows a visible ring.

---

## Self-Review

**Spec coverage:**
- Labeled back link above title (Option B) → `BackLink` (Task 1) + `PageHeader` slot (Task 2). ✓
- Fixed-parent behavior via router `<Link>` → `BackLink` `to` (Task 1); wired per page (Tasks 4–5). ✓
- Scope = 4 editors + 6 report components, not top-level → Tasks 4 (reports) + 5 (editors); top-level pages untouched. ✓
- Reuse `t.nav.*` labels, no new i18n → all wirings use `t.nav.{salesInvoices,purchaseBills,payments,journals,reports}`. ✓
- `AgingPage` = one component, one back → Task 4 wires it once. ✓
- Editors' not-found surface unchanged → only the `new`/edit/view `PageHeader`s get `back`; not-found branch (NotFound, no PageHeader) is untouched. ✓
- Tests: BackLink unit (Task 1), PageHeader slot present/absent (Task 2), TrialBalance wiring smoke (Task 4). ✓
- Router-context fallout (discovered): report tests migrated to `renderWithRouter` (Task 3) so they stay green. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content. ✓

**Type consistency:** `BackLink` props `{ to: ParentRoute; label: string }` used identically in every wiring; `PageHeader` `back?: ReactNode` matches the `back={<BackLink .../>}` call sites; `renderWithRouter(ui)` signature matches all call sites; the five `ParentRoute` literals match the five `to=` values used. ✓

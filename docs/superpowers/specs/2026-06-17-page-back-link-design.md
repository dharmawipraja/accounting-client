# Back link on sub-pages — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming)
**Scope:** Add a labeled "back to parent" link to the app's sub-pages (document editors + report pages). A new `BackLink` component, an optional `back` slot on the shared `PageHeader`, and a one-line `back={...}` wiring on each of the 10 sub-page components. No routing changes, no behavior change beyond the new link, no new i18n strings.

## Goal

The app has a two-level structure: top-level pages reached from the sidebar, and sub-pages reached *from* another screen. The sub-pages (document editors, report detail pages) have no explicit "back" affordance at the top — editors only offer a Cancel button at the bottom of a long form, and report pages offer nothing (you must use the sidebar to return to the Reports menu). Add a small, consistent back link to those sub-pages so the way out is always visible.

## Decisions (from brainstorming)

- **Scope = sub-pages only.** Top-level sidebar destinations (Dashboard, the 4 lists, Accounts, Partners, Tax Codes, Periods, Settings, Audit) get **nothing** — the sidebar is their navigation and a "back" there is ambiguous.
- **Back behavior = fixed parent**, not browser history. Each sub-page returns to a known parent route, implemented as a normal TanStack Router `<Link to={parent}>`. This is predictable and survives page refresh / deep links. (History-back was rejected: empty history on a fresh load, can land off-app or somewhere unexpected.)
- **Appearance = labeled back link above the title** (chosen over an unlabeled icon and over a breadcrumb): an `ArrowLeft` icon + the parent's name, as a small primary-blue link sitting just above the `<h1>`. It names its destination ("← Faktur Penjualan"), which is the most discoverable option and matches the calm/institutional feel.
- **Labels reuse the existing `t.nav.*` strings**, so the link wording always matches the sidebar. **No new i18n.**

## Pages in scope (10 sub-page components)

| Page component | Parent route | Label (existing key) |
|---|---|---|
| `InvoiceEditorPage` (new + edit/view) | `/sales-invoices` | `t.nav.salesInvoices` ("Faktur Penjualan") |
| `BillEditorPage` (new + edit/view) | `/purchase-bills` | `t.nav.purchaseBills` ("Faktur Pembelian") |
| `PaymentEditorPage` (new + edit/view) | `/payments` | `t.nav.payments` ("Pembayaran") |
| `JournalEntryEditorPage` (new + view) | `/journals` | `t.nav.journals` ("Jurnal") |
| `BalanceSheetPage` | `/reports` | `t.nav.reports` ("Laporan") |
| `IncomeStatementPage` | `/reports` | `t.nav.reports` |
| `CashFlowPage` | `/reports` | `t.nav.reports` |
| `TrialBalancePage` | `/reports` | `t.nav.reports` |
| `GeneralLedgerPage` | `/reports` | `t.nav.reports` |
| `AgingPage` (AR + AP) | `/reports` | `t.nav.reports` |

(`AgingPage` backs the `reports.ar-aging` and `reports.ap-aging` routes; `ReportsIndexPage` is the parent menu and gets no back link.)

## Components

### New: `src/components/common/BackLink.tsx`

Owns the look and the routing. Keeps `PageHeader` route-agnostic.

```tsx
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

/** The five sub-page parents. Typed so a wrong route is a compile error. */
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

- The icon is `aria-hidden`; the link's accessible name is the visible label text.
- `focus-visible:ring-2 focus-visible:ring-ring` matches the app's custom-link a11y pattern (AppShell nav, dashboard draft link).
- No motion (a static link); nothing to gate on `prefers-reduced-motion`.

### Modified: `src/components/common/PageHeader.tsx`

Add an optional `back?: ReactNode` slot rendered above the title row. PageHeader does not import `BackLink` or know about routes — callers pass a `<BackLink/>`.

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

When `back` is omitted (every top-level page), the output is identical to today.

## Wiring

Each sub-page adds `back={<BackLink to="<parent>" label={t.nav.<key>} />}` to its existing `PageHeader`. Example (`InvoiceEditorPage`, both the `new` and the edit/view headers):

```tsx
<PageHeader
  title={readOnly ? t.salesInvoices.view : t.salesInvoices.editInvoice}
  back={<BackLink to="/sales-invoices" label={t.nav.salesInvoices} />}
/>
```

- The editors render `PageHeader` in their `new` branch and in their loaded edit/view branch — both get the same `back`.
- The editors' **not-found** branch renders a `NotFound` surface with its own "back to list" button and *no* `PageHeader`, so it is left unchanged (no duplication).
- Each report page renders a single `PageHeader` at the top (above the data-fetch); add `back` there. `AgingPage` is one component serving both the AR and AP aging routes, so it has a single `back={<BackLink to="/reports" .../>}`.

## Testing

1. **`BackLink` unit test** (`src/components/common/BackLink.test.tsx`) — render inside a memory router (the `AppShell.test` harness pattern: a root route whose component is the element under test). Assert: the rendered `link` role has the accessible name of the label, its `href` resolves to the parent path, and an `svg` icon is present.
2. **`PageHeader` test** (`src/components/common/PageHeader.test.tsx`) — no router needed (pass a plain node). Assert: when `back` is provided it renders above the title; when omitted, only the title (and any actions) render. Guards the slot and the "identical when omitted" guarantee.
3. **Wiring smoke** (`TrialBalancePage`) — render the page in the router + QueryClient harness (its `PageHeader` renders before the report data resolves) with a stub `onOpenAccount`; assert a `link` named "Laporan" with `href` `/reports` is present. This exercises the real `PageHeader → BackLink → Link` path inside a feature page.

The other 10 wirings are one-liners guarded by `tsc` (the typed `ParentRoute` rejects a wrong `to`) plus the manual check below; they are identical in shape to the smoke-tested one.

## Verification

- `pnpm test --run` green (existing + 3 new tests).
- `pnpm exec tsc --noEmit` clean (a wrong `to` is a compile error via `ParentRoute`).
- `pnpm run lint` — no new warnings (pre-existing React-Compiler/RHF warnings excepted).
- `pnpm run build` succeeds.
- Manual: each editor (new, edit, read-only view) and each report page shows "← <parent>" above the title; clicking it lands on the parent list/menu; refreshing a sub-page then clicking back still works (fixed parent); top-level pages are unchanged.

## Files

- **Create:** `src/components/common/BackLink.tsx`, `src/components/common/BackLink.test.tsx`.
- **Modify:** `src/components/common/PageHeader.tsx` (add `back` slot).
- **Create:** `src/components/common/PageHeader.test.tsx` (back slot present/absent).
- **Modify (one line each):** `InvoiceEditorPage`, `BillEditorPage`, `PaymentEditorPage`, `JournalEntryEditorPage`, `BalanceSheetPage`, `IncomeStatementPage`, `CashFlowPage`, `TrialBalancePage`, `GeneralLedgerPage`, `AgingPage`.

## Out of scope

- No back link on top-level/sidebar pages.
- No browser-history navigation, no breadcrumb system, no route restructuring.
- No new i18n strings (labels reuse `t.nav.*`).
- No change to the editors' Cancel buttons or not-found surfaces.

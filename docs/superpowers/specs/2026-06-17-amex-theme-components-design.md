# Amex Theme — Phase 2: Component Layer — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming)
**Scope:** Phase 2 of the American Express UI revamp (`/DESIGN.md`). Component-layer tuning: semantic status chips + light polish on Button/Card/Table. Builds on Phase 1 tokens (merged `6ce4e88`).

## Goal

Replace the app's scattered, non-semantic inline status badges with a unified **semantic status-chip system** (icon + text + semantic color, per the Amex/a11y rule "status conveyed with text *and* icon, never color alone"), and apply light Amex tuning to the shared Button/Card/Table components.

## Background — current state (audited)

- **Status rendering is the weak spot.** Every document status is an inline `<Badge variant={status === 'DRAFT' ? 'secondary' : 'default'}>{label}</Badge>` with a local `statusLabel(t, status)` helper, duplicated across ~6 `columns.tsx` files and several editor/period pages. Result: `POSTED` and `VOID` both render the **same blue "default" badge** (indistinguishable), no icons, no semantic color, and duplicated logic.
- `src/components/common/StatusBadge.tsx` is only an **active/inactive** badge (`{ active: boolean }`), used in accounts/partners/tax-codes columns.
- `ui/badge.tsx` (radix-nova) has variants `default | secondary | destructive | outline | ghost | link` — **no `success`/`warning`/`info`**. `destructive` already uses the tinted pattern `bg-destructive/10 text-destructive`.
- `ui/button.tsx` is token-driven with a press `active:…translate-y-px` and `hover:bg-primary/80`.
- `ui/card.tsx` uses `ring-1 ring-foreground/10` (not the Phase-1 navy shadow) and `--card-spacing: --spacing(4)` (16px).
- `ui/table.tsx`: `TableCell` `p-2`, `TableHead` `h-10` (short rows).
- Phase 1 added `--success`/`--warning` tokens + `--color-success`/`--color-warning` utilities + navy-tinted `--shadow-sm`.

## Decisions (from brainstorming)

**Approved tone mapping** (success=green `--success`, warning=amber `--warning`, error=red `--destructive`, neutral=grey `secondary`, info=blue `--primary`):

| Status | Tone | Variant | Icon (lucide) | Label source |
|---|---|---|---|---|
| POSTED | success | `success` | `CheckCircle2` | `*.statusPosted` |
| PAID (paymentStatus) | success | `success` | `CheckCircle2` | `*.paid` |
| OPEN (period) | success | `success` | `LockOpen` | `periods.open` |
| active | success | `success` | `CheckCircle2` | `crud.active` |
| PARTIAL (paymentStatus) | warning | `warning` | `CircleDashed` | `*.partial` |
| VOID | error | `destructive` | `Ban` | `*.statusVoid` |
| DRAFT | neutral | `secondary` | `PencilLine` | `*.statusDraft` |
| UNPAID (paymentStatus) | neutral | `secondary` | `Circle` | `*.unpaid` |
| CLOSED (period) | neutral | `secondary` | `Lock` | `periods.closed` |
| REVERSED (journal) | neutral | `secondary` | `RotateCcw` | `journals.statusReversed` |
| inactive | neutral | `secondary` | `CircleOff` | `crud.inactive` |
| RECEIPT (direction) | info | `info` | `ArrowDownLeft` | `payments.receipt` |
| DISBURSEMENT (direction) | info | `info` | `ArrowUpRight` | `payments.disbursement` |

(Exact i18n keys confirmed during plan-writing; add any missing label keys to `messages.id.ts`.) Other approved choices: REVERSED stays **neutral** (not red); active stays **green**; mappers are **centralized** (not per-feature); the 2B Button/Card/Table tweaks are **included**.

## 2A — Semantic status chips

### `ui/badge.tsx` — add semantic variants

Add to `badgeVariants`, mirroring the existing `destructive` tinted pattern:
```
success: "bg-success/10 text-success [a]:hover:bg-success/20",
warning: "bg-warning/10 text-warning [a]:hover:bg-warning/20",
info: "bg-primary/10 text-primary [a]:hover:bg-primary/20",
```
(error → existing `destructive`; neutral → existing `secondary`.) The badge base already renders child `svg` at `size-3` and is a pill, so icon + text "just works".

### `StatusChip` (new) — `src/components/common/StatusChip.tsx`

The primitive that maps tone → variant and renders icon + text:
```tsx
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type StatusTone = 'success' | 'warning' | 'error' | 'neutral' | 'info';
const VARIANT: Record<StatusTone, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  success: 'success', warning: 'warning', error: 'destructive', neutral: 'secondary', info: 'info',
};

export function StatusChip({ tone, icon: Icon, label }: { tone: StatusTone; icon: LucideIcon; label: string }) {
  return (
    <Badge variant={VARIANT[tone]}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
```
Icon is `aria-hidden` (decorative); the **text label is the accessible status** — satisfies "text + icon, never color alone".

### Domain mappers — `src/components/common/statusChips.tsx`

One tiny component per status family, each owning its status→{tone, icon, label} per the table above:
- `DocStatusChip({ status, t })` — DRAFT/POSTED/VOID (sales invoices, purchase bills, payments).
- `PaymentStatusChip({ status, t })` — UNPAID/PARTIAL/PAID (invoice/bill `paymentStatus`).
- `JournalStatusChip({ status, t })` — DRAFT/POSTED/REVERSED.
- `PeriodStatusChip({ status, t })` — OPEN/CLOSED.
- `DirectionChip({ direction, t })` — RECEIPT/DISBURSEMENT.
- `StatusBadge` is **re-implemented** in terms of `StatusChip` (active → success/`CheckCircle2`, inactive → neutral/`CircleOff`); its `{ active: boolean }` API is unchanged so the 3 existing call sites need no edit.

### Rollout

Replace every inline status `<Badge>` + local `statusLabel()` with the matching mapper:
- `src/features/sales-invoices/columns.tsx`, `purchase-bills/columns.tsx` → `DocStatusChip` (remove local `statusLabel`).
- `src/features/payments/columns.tsx` → `DocStatusChip` (status) + `DirectionChip` (direction).
- `src/features/journals/columns.tsx` + `JournalEntryEditorPage.tsx` → `JournalStatusChip`.
- `src/features/periods/PeriodsPage.tsx` → `PeriodStatusChip`.
- Editor pages that render a status (`InvoiceEditorPage`/`BillEditorPage`/`PaymentEditorPage` headers, if they show one) → the matching mapper.
- accounts/partners/tax-codes columns already use `StatusBadge` → no change (it's restyled internally).

## 2B — Component tuning (shared `ui/*`)

- **`ui/button.tsx`:** keep `active:…translate-y-px`; add a pressed tone to the `default` variant → `active:bg-primary/90` (Amex 120ms press feedback). One-line addition, applies to all primary buttons.
- **`ui/card.tsx`:** replace `ring-1 ring-foreground/10` with `border border-border shadow-sm` (Phase-1 navy-tinted shadow); change `[--card-spacing:--spacing(4)]` → `[--card-spacing:--spacing(6)]` (16px → 24px, Amex "24–32px inside cards"). `data-[size=sm]` stays at `--spacing(3)`.
- **`ui/table.tsx`:** `TableCell` `p-2` → `px-3 py-4`; `TableHead` `h-10 px-2` → `h-11 px-3` (≈56px rows, Amex "comfortably tall 56–64px").

## Testing

- **`StatusChip`** unit test: each tone → correct `Badge` variant; label text + an svg icon render.
- **Domain mappers** unit test (`statusChips.test.tsx`): each status value → correct tone/variant + the expected i18n label text + an icon. Covers DRAFT/POSTED/VOID, UNPAID/PARTIAL/PAID, REVERSED, OPEN/CLOSED, RECEIPT/DISBURSEMENT, active/inactive.
- **Existing column/page tests** stay green — they assert on the **label text**, which is unchanged. Update a test only if it asserts a specific old `Badge` variant class (none known to).
- **Button/Card/Table** are CSS-only → verified by `pnpm run build` + the suite staying green (259+).
- Full gate (`pnpm test --run && tsc && lint && build`) green; manual both-modes visual smoke on a list page + the chips.

## Files

- **New:** `src/components/common/StatusChip.tsx`, `src/components/common/statusChips.tsx`, `src/components/common/statusChips.test.tsx` (+ a `StatusChip` test).
- **Modify:** `src/components/ui/badge.tsx`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/table.tsx`, `src/components/common/StatusBadge.tsx`, and the status-rendering files: `features/{sales-invoices,purchase-bills,payments,journals}/columns.tsx`, `features/periods/PeriodsPage.tsx`, `features/journals/JournalEntryEditorPage.tsx`, plus any editor page header that shows a status. Possibly `src/lib/i18n/messages.id.ts` (add any missing label keys, e.g. `journals.statusReversed`, `payments.receipt/disbursement`, paymentStatus labels).

## Out of scope (Phase 3)

- Navy `AppShell` (sidebar + premium header), dashboard recomposition, Motion animations, 44px touch-target / a11y sweep, per-page polish.
- No routes / data / IA / form-field changes (redesign-preserve).
- No new status semantics beyond re-skinning existing statuses.

# Amex Theme Phase 2 (Component Layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scattered, non-semantic inline status badges with a unified semantic status-chip system (icon + text + color), and apply light Amex tuning to Button/Card/Table.

**Architecture:** Add `success`/`warning`/`info` variants to `ui/badge`; build a `StatusChip` primitive + per-domain mapper components (`DocStatusChip`, `JournalStatusChip`, `PeriodStatusChip`, `DirectionChip`, restyled `StatusBadge`); roll them out across the status-rendering columns/pages; tune `ui/button`/`card`/`table` classes.

**Tech Stack:** React 19, shadcn/ui (radix-nova) + Tailwind v4 tokens (Phase-1 `--success`/`--warning` + navy shadows), lucide-react, Vitest + RTL.

**Spec:** `docs/superpowers/specs/2026-06-17-amex-theme-components-design.md`

**Branch:** `feat/amex-theme-components` (already created; spec committed at `6a3f1a7`).

**Deviation from spec (intentional, YAGNI):** `PaymentStatusChip` is NOT built — `paymentStatus` is not displayed anywhere in the UI (verified by grep). The `warning` tone/variant is still added (it completes the token-backed palette and is covered by the `StatusChip` test), but no mapper wires it yet; it lands when Phase 3 surfaces `paymentStatus`.

---

## File Structure

- **New:** `src/components/common/StatusChip.tsx` (primitive), `src/components/common/StatusChip.test.tsx`, `src/components/common/statusChips.tsx` (domain mappers), `src/components/common/statusChips.test.tsx`.
- **Modify:** `src/components/ui/badge.tsx` (variants), `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/table.tsx`, `src/components/common/StatusBadge.tsx` (restyle), `src/lib/i18n/messages.id.ts` (add `journals.statusReversed`), and status-rendering sites: `features/{sales-invoices,purchase-bills,payments,journals}/columns.tsx`, `features/periods/PeriodsPage.tsx`, `features/journals/JournalEntryEditorPage.tsx`.

---

## Task 1: Add semantic variants to `ui/badge`

**Files:** Modify `src/components/ui/badge.tsx`

- [ ] **Step 1: Add the variants**

In `src/components/ui/badge.tsx`, inside the `variant: { … }` map (after the `destructive: …` entry), add:
```ts
        success:
          "bg-success/10 text-success [a]:hover:bg-success/20",
        warning:
          "bg-warning/10 text-warning [a]:hover:bg-warning/20",
        info:
          "bg-primary/10 text-primary [a]:hover:bg-primary/20",
```

- [ ] **Step 2: Verify build**

Run: `pnpm run build`
Expected: builds clean (the new variants are valid cva keys using Phase-1 `--success`/`--warning` + `--primary` tokens).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "feat(ui): add success/warning/info badge variants

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Add the missing `journals.statusReversed` i18n key

**Files:** Modify `src/lib/i18n/messages.id.ts`

- [ ] **Step 1: Add the key**

In `src/lib/i18n/messages.id.ts`, in the `journals` block, immediately after the line `statusPosted: 'Diposting',` (around line 327), add:
```ts
    statusReversed: 'Dibalik',
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (the `Messages` type now includes `journals.statusReversed`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat(i18n): add journals.statusReversed label

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `StatusChip` primitive

**Files:** Create `src/components/common/StatusChip.tsx`, `src/components/common/StatusChip.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/StatusChip.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { CheckCircle2 } from 'lucide-react';
import { expect, it } from 'vitest';
import { StatusChip } from './StatusChip';

it('renders the label text and an icon', () => {
  const { container } = render(<StatusChip tone="success" icon={CheckCircle2} label="Lunas" />);
  expect(screen.getByText('Lunas')).toBeInTheDocument();
  expect(container.querySelector('svg')).toBeInTheDocument();
});

it('maps tone to the matching badge variant', () => {
  const cases = [
    ['success', 'success'], ['warning', 'warning'], ['error', 'destructive'],
    ['neutral', 'secondary'], ['info', 'info'],
  ] as const;
  for (const [tone, variant] of cases) {
    const { container, unmount } = render(<StatusChip tone={tone} icon={CheckCircle2} label="x" />);
    expect(container.querySelector('[data-slot="badge"]')).toHaveAttribute('data-variant', variant);
    unmount();
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run src/components/common/StatusChip.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `StatusChip`**

Create `src/components/common/StatusChip.tsx`:
```tsx
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type StatusTone = 'success' | 'warning' | 'error' | 'neutral' | 'info';

const VARIANT: Record<StatusTone, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  success: 'success',
  warning: 'warning',
  error: 'destructive',
  neutral: 'secondary',
  info: 'info',
};

/** Semantic status pill: tinted fill + matching text + a decorative icon. The
 *  text label is the accessible status (icon is aria-hidden) — never colour alone. */
export function StatusChip({ tone, icon: Icon, label }: { tone: StatusTone; icon: LucideIcon; label: string }) {
  return (
    <Badge variant={VARIANT[tone]}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec vitest run src/components/common/StatusChip.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/common/StatusChip.tsx src/components/common/StatusChip.test.tsx
git commit -m "feat(common): StatusChip primitive (icon + text + semantic tone)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Domain mappers + restyle `StatusBadge`

**Files:** Create `src/components/common/statusChips.tsx`, `src/components/common/statusChips.test.tsx`; Modify `src/components/common/StatusBadge.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/statusChips.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { DocStatusChip, JournalStatusChip, PeriodStatusChip, DirectionChip } from './statusChips';
import { StatusBadge } from './StatusBadge';

const variantOf = (c: HTMLElement) => c.querySelector('[data-slot="badge"]')?.getAttribute('data-variant');

it('DocStatusChip: POSTED=success, VOID=destructive, DRAFT=secondary', () => {
  expect(variantOf(render(<DocStatusChip status="POSTED" label="P" />).container)).toBe('success');
  expect(variantOf(render(<DocStatusChip status="VOID" label="V" />).container)).toBe('destructive');
  expect(variantOf(render(<DocStatusChip status="DRAFT" label="D" />).container)).toBe('secondary');
});

it('JournalStatusChip: REVERSED is neutral with its own label', () => {
  const { container } = render(<JournalStatusChip status="REVERSED" t={id} />);
  expect(screen.getByText(id.journals.statusReversed)).toBeInTheDocument();
  expect(variantOf(container)).toBe('secondary');
});

it('PeriodStatusChip: open=success, closed=secondary', () => {
  expect(variantOf(render(<PeriodStatusChip closed={false} t={id} />).container)).toBe('success');
  expect(screen.getByText(id.periods.open)).toBeInTheDocument();
  expect(variantOf(render(<PeriodStatusChip closed t={id} />).container)).toBe('secondary');
});

it('DirectionChip: both directions are info', () => {
  expect(variantOf(render(<DirectionChip direction="RECEIPT" t={id} />).container)).toBe('info');
  expect(variantOf(render(<DirectionChip direction="DISBURSEMENT" t={id} />).container)).toBe('info');
});

it('StatusBadge: active=success, inactive=secondary', () => {
  expect(variantOf(render(<StatusBadge active />).container)).toBe('success');
  expect(variantOf(render(<StatusBadge active={false} />).container)).toBe('secondary');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run src/components/common/statusChips.test.tsx`
Expected: FAIL — `statusChips` module does not exist (and `StatusBadge` not yet chip-based).

- [ ] **Step 3: Implement the mappers**

Create `src/components/common/statusChips.tsx`:
```tsx
import { CheckCircle2, Ban, PencilLine, RotateCcw, Lock, LockOpen, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { Messages } from '@/lib/i18n/messages.id';
import { StatusChip } from './StatusChip';

/** Invoice / bill / payment status (DRAFT | POSTED | VOID). Label is passed in
 *  because the three features keep it in their own i18n namespaces. */
export function DocStatusChip({ status, label }: { status: string; label: string }) {
  if (status === 'POSTED') return <StatusChip tone="success" icon={CheckCircle2} label={label} />;
  if (status === 'VOID') return <StatusChip tone="error" icon={Ban} label={label} />;
  return <StatusChip tone="neutral" icon={PencilLine} label={label} />;
}

/** Journal status (DRAFT | POSTED | REVERSED) — single i18n namespace, owns its label. */
export function JournalStatusChip({ status, t }: { status: string; t: Messages }) {
  if (status === 'POSTED') return <StatusChip tone="success" icon={CheckCircle2} label={t.journals.statusPosted} />;
  if (status === 'REVERSED') return <StatusChip tone="neutral" icon={RotateCcw} label={t.journals.statusReversed} />;
  return <StatusChip tone="neutral" icon={PencilLine} label={t.journals.statusDraft} />;
}

/** Fiscal period: open = success, closed = neutral. */
export function PeriodStatusChip({ closed, t }: { closed: boolean; t: Messages }) {
  return closed
    ? <StatusChip tone="neutral" icon={Lock} label={t.periods.closed} />
    : <StatusChip tone="success" icon={LockOpen} label={t.periods.open} />;
}

/** Payment direction (RECEIPT | DISBURSEMENT) — informational, info tone. */
export function DirectionChip({ direction, t }: { direction: string; t: Messages }) {
  return direction === 'DISBURSEMENT'
    ? <StatusChip tone="info" icon={ArrowUpRight} label={t.payments.directionDisbursement} />
    : <StatusChip tone="info" icon={ArrowDownLeft} label={t.payments.directionReceipt} />;
}
```

- [ ] **Step 4: Restyle `StatusBadge` to use `StatusChip`**

Replace the entire contents of `src/components/common/StatusBadge.tsx`:
```tsx
import { CheckCircle2, CircleOff } from 'lucide-react';
import { StatusChip } from './StatusChip';
import { useT } from '@/lib/i18n/useT';

/** Active / inactive status for accounts, partners, tax codes. */
export function StatusBadge({ active }: { active: boolean }) {
  const t = useT();
  return active
    ? <StatusChip tone="success" icon={CheckCircle2} label={t.crud.active} />
    : <StatusChip tone="neutral" icon={CircleOff} label={t.crud.inactive} />;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm exec vitest run src/components/common/statusChips.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/common/statusChips.tsx src/components/common/statusChips.test.tsx src/components/common/StatusBadge.tsx
git commit -m "feat(common): status-chip domain mappers; StatusBadge as chip

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Roll out the chips across columns + pages

**Files:** Modify `features/{sales-invoices,purchase-bills,payments,journals}/columns.tsx`, `features/periods/PeriodsPage.tsx`, `features/journals/JournalEntryEditorPage.tsx`

- [ ] **Step 1: `sales-invoices/columns.tsx`**

Remove `import { Badge } from '@/components/ui/badge';` and add `import { DocStatusChip } from '@/components/common/statusChips';`. Replace the `status` cell:
```tsx
      cell: (c) => <Badge variant={c.getValue() === 'DRAFT' ? 'secondary' : 'default'}>{statusLabel(t, c.getValue())}</Badge>,
```
with:
```tsx
      cell: (c) => <DocStatusChip status={c.getValue()} label={statusLabel(t, c.getValue())} />,
```
(Keep the local `statusLabel` helper.)

- [ ] **Step 2: `purchase-bills/columns.tsx`**

Same transform: remove the `Badge` import, add `import { DocStatusChip } from '@/components/common/statusChips';`, and replace the `status` cell:
```tsx
    col.accessor('status', { header: t.purchaseBills.status, cell: (c) => <Badge variant={c.getValue() === 'DRAFT' ? 'secondary' : 'default'}>{statusLabel(t, c.getValue())}</Badge> }),
```
with:
```tsx
    col.accessor('status', { header: t.purchaseBills.status, cell: (c) => <DocStatusChip status={c.getValue()} label={statusLabel(t, c.getValue())} /> }),
```

- [ ] **Step 3: `payments/columns.tsx`**

Remove the `Badge` import and the `directionLabel` helper (lines 20-22). Add `import { DocStatusChip, DirectionChip } from '@/components/common/statusChips';`. Replace the `direction` cell:
```tsx
    col.accessor('direction', { header: t.payments.direction, cell: (c) => <Badge variant="outline">{directionLabel(t, c.getValue())}</Badge> }),
```
with:
```tsx
    col.accessor('direction', { header: t.payments.direction, cell: (c) => <DirectionChip direction={c.getValue()} t={t} /> }),
```
and replace the `status` cell:
```tsx
    col.accessor('status', { header: t.payments.status, cell: (c) => <Badge variant={c.getValue() === 'DRAFT' ? 'secondary' : 'default'}>{statusLabel(t, c.getValue())}</Badge> }),
```
with:
```tsx
    col.accessor('status', { header: t.payments.status, cell: (c) => <DocStatusChip status={c.getValue()} label={statusLabel(t, c.getValue())} /> }),
```
(Keep the `statusLabel` helper.)

- [ ] **Step 4: `journals/columns.tsx`**

Keep the `Badge` import (still used for `sourceType`). Remove the local `statusLabel` helper (lines 13-15). Add `import { JournalStatusChip } from '@/components/common/statusChips';`. Replace the `status` cell:
```tsx
    col.accessor('status', { header: t.journals.status, cell: (c) => <Badge variant={c.getValue() === 'DRAFT' ? 'secondary' : 'default'}>{statusLabel(t, c.getValue())}</Badge> }),
```
with:
```tsx
    col.accessor('status', { header: t.journals.status, cell: (c) => <JournalStatusChip status={c.getValue()} t={t} /> }),
```

- [ ] **Step 5: `periods/PeriodsPage.tsx`**

Remove `import { Badge } from '@/components/ui/badge';` (only used for the status cell). Add `import { PeriodStatusChip } from '@/components/common/statusChips';`. Replace the status `<Badge>` (the `variant={c ? 'destructive' : 'default'}` one, where `c` is the closed boolean for the row):
```tsx
<Badge variant={c ? 'destructive' : 'default'}>{c ? t.periods.closed : t.periods.open}</Badge>
```
with:
```tsx
<PeriodStatusChip closed={c} t={t} />
```

- [ ] **Step 6: `journals/JournalEntryEditorPage.tsx`**

Remove `import { Badge } from '@/components/ui/badge';` (only used for the status badge). Add `import { JournalStatusChip } from '@/components/common/statusChips';`. Replace the status badge:
```tsx
<Badge variant={je.status === 'DRAFT' ? 'secondary' : 'default'}>{je.status === 'DRAFT' ? t.journals.statusDraft : t.journals.statusPosted}</Badge>
```
with:
```tsx
<JournalStatusChip status={je.status} t={t} />
```

- [ ] **Step 7: Run affected tests + typecheck**

Run: `pnpm exec vitest run src/features/sales-invoices src/features/purchase-bills src/features/payments src/features/journals src/features/periods && pnpm exec tsc --noEmit`
Expected: PASS. (Existing tests assert on status *label text*, which is unchanged — e.g. "Draf"/"Diposting" still render. If a test asserts an old `Badge` `data-variant`, update it to the chip's variant.)

- [ ] **Step 8: Commit**

```bash
git add src/features/sales-invoices/columns.tsx src/features/purchase-bills/columns.tsx src/features/payments/columns.tsx src/features/journals/columns.tsx src/features/periods/PeriodsPage.tsx src/features/journals/JournalEntryEditorPage.tsx
git commit -m "feat(status): roll out semantic status chips across columns + pages

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Component tuning (Button / Card / Table)

**Files:** Modify `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/table.tsx`

- [ ] **Step 1: Button pressed tone**

In `src/components/ui/button.tsx`, change the `default` variant from:
```ts
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
```
to:
```ts
        default: "bg-primary text-primary-foreground hover:bg-primary/80 active:bg-primary/90",
```

- [ ] **Step 2: Card navy shadow + 24px padding**

In `src/components/ui/card.tsx`, in the `Card` function's className, change `ring-1 ring-foreground/10` to `border border-border shadow-sm`, and change `[--card-spacing:--spacing(4)]` to `[--card-spacing:--spacing(6)]`. (Leave the `data-[size=sm]:[--card-spacing:--spacing(3)]` as-is.)

- [ ] **Step 3: Table taller rows**

In `src/components/ui/table.tsx`:
- `TableHead`: change `"h-10 px-2 text-left …"` → `"h-11 px-3 text-left …"` (keep the rest of the class string).
- `TableCell`: change `"p-2 align-middle …"` → `"px-3 py-4 align-middle …"` (keep the rest).

- [ ] **Step 4: Verify build + tests**

Run: `pnpm run build && pnpm test --run`
Expected: build clean; all tests pass (CSS-only changes).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/card.tsx src/components/ui/table.tsx
git commit -m "feat(ui): Amex button press tone, navy card shadow + padding, taller table rows

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full gate**

Run: `pnpm test --run && pnpm exec tsc --noEmit && pnpm run lint && pnpm run build`
Expected: all tests pass (259 + the new StatusChip/mapper tests), tsc 0 errors, lint 0 errors (pre-existing React-Compiler/RHF warnings only), build succeeds.

- [ ] **Step 2: Grep for leftover inline status badges**

Run: `grep -rn "variant={c.getValue() === 'DRAFT'\|variant={je.status\|variant={c ? 'destructive'" src/features`
Expected: no matches (all status badges migrated to chips).

- [ ] **Step 3: Manual both-modes visual smoke**

`pnpm dev`, in light + dark: a list page (sales invoices) shows green ✓ "Diposting" vs red ⊘ "Batal" vs grey "Draf" chips (distinct), payments show blue direction chips, periods show green "Terbuka"/grey "Tertutup", an accounts row shows the active/inactive chip. Cards have a soft navy shadow + roomier padding; table rows are taller; pressing a primary button shows the pressed tone.

- [ ] **Step 4: Commit any smoke fixes** (skip if none)

```bash
git add -A
git commit -m "fix(theme): Phase 2 visual smoke adjustments

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- `PaymentStatusChip` is intentionally NOT built (paymentStatus isn't displayed anywhere). Don't add it.
- The `warning` badge variant/tone exists for the palette but no mapper uses it yet — that's expected, don't remove it.
- Editing `src/components/ui/*` is in scope for this phase (Phase 1 forbade it; Phase 2 explicitly tunes them).
- Do NOT touch `AppShell`, the dashboard, add Motion, or do per-page polish — those are Phase 3.
- Keep `sourceType` in journals columns as its `variant="outline"` badge (it's a category, not a status).

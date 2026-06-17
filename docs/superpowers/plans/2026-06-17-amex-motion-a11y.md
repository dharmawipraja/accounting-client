# Amex Theme Phase 3c (Motion + a11y) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reduced-motion-aware dashboard entrance animation (Motion) and focus-visible rings on the custom nav/draft links — the final polish of the Amex revamp.

**Architecture:** Install `motion`; add a small `Reveal` entrance primitive (fade+rise, honors `prefers-reduced-motion`) used to wrap the dashboard hero + cards; add `focus-visible` ring classes to the custom `<Link>`s. A `matchMedia` jsdom shim keeps Motion working in tests.

**Tech Stack:** React 19, `motion@12` (`motion/react`), TanStack Router `<Link>`, Tailwind v4 focus tokens, Vitest + RTL.

**Spec:** `docs/superpowers/specs/2026-06-17-amex-motion-a11y-design.md`

**Branch:** `feat/amex-motion-a11y` (already created; spec committed at `ef7daa8`).

---

## File Structure

- **New:** `src/components/common/Reveal.tsx`, `src/components/common/Reveal.test.tsx`.
- **Modify:** `src/test/setup.ts` (matchMedia shim), `src/features/dashboard/DashboardPage.tsx` (wrap in `Reveal` + draft-link focus ring), `src/components/common/AppShell.tsx` (nav-link focus rings), `package.json` (add `motion`).

---

## Task 1: Install `motion` + `matchMedia` test shim

**Files:** Modify `package.json` (via pnpm), `src/test/setup.ts`

- [ ] **Step 1: Install motion**

```bash
pnpm add motion
```

- [ ] **Step 2: Add the `matchMedia` shim**

In `src/test/setup.ts`, immediately after the `ResizeObserver` shim block (the `if (typeof globalThis.ResizeObserver === 'undefined') { … }` ending around line 30), add:
```ts
// jsdom lacks matchMedia, which Motion's useReducedMotion() calls.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
```

- [ ] **Step 3: Verify install + typecheck + build**

Run: `pnpm exec tsc --noEmit && pnpm run build`
Expected: PASS. `motion` resolves; `package.json` lists `motion`.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/test/setup.ts
git commit -m "build(motion): add motion dependency + jsdom matchMedia shim

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `Reveal` entrance primitive

**Files:** Create `src/components/common/Reveal.tsx`, `src/components/common/Reveal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/Reveal.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Reveal } from './Reveal';

it('renders its children', () => {
  render(<Reveal><p>revealed</p></Reveal>);
  expect(screen.getByText('revealed')).toBeInTheDocument();
});

it('passes className through to the wrapper', () => {
  const { container } = render(<Reveal className="grid"><span>x</span></Reveal>);
  expect(container.firstChild).toHaveClass('grid');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run src/components/common/Reveal.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `Reveal`**

Create `src/components/common/Reveal.tsx`:
```tsx
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/** Fade + rise entrance. Honors prefers-reduced-motion (renders a plain div,
 *  no animation). `index` staggers siblings by 50ms each. */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1], delay: index * 0.05 }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec vitest run src/components/common/Reveal.test.tsx`
Expected: PASS (2 tests). (With the `matchMedia` shim returning `matches:false`, the animated `motion.div` branch renders and carries the `className`.)

- [ ] **Step 5: Commit**

```bash
git add src/components/common/Reveal.tsx src/components/common/Reveal.test.tsx
git commit -m "feat(common): Reveal entrance primitive (motion, reduced-motion aware)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Dashboard entrance animation

**Files:** Modify `src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Import `Reveal`**

Add next to the other `@/components/common` imports in `src/features/dashboard/DashboardPage.tsx`:
```tsx
import { Reveal } from '@/components/common/Reveal';
```

- [ ] **Step 2: Wrap the hero + cards in `Reveal`**

Replace the loaded branch's content (the `<div className="space-y-6"> … </div>` inside the `: (` of the `allPending` ternary) with the same structure, each element wrapped in a `Reveal`:
```tsx
        <div className="space-y-6">
          <Reveal index={0}>
            <DashboardHero
              assets={bs.data?.totalAssets}
              liabilities={bs.data?.totalLiabilities}
              equity={bs.data?.totalEquity}
              loading={bs.isLoading}
              error={bs.isError}
              onRetry={() => void bs.refetch()}
              asOf={asOfHint}
            />
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal index={1}>
              <SummaryCard title={t.dashboard.revenue} value={money(is.data?.revenue)} loading={is.isLoading} error={is.isError} onRetry={() => void is.refetch()} hint={rangeHint} />
            </Reveal>
            <Reveal index={2}>
              <SummaryCard title={t.dashboard.netIncome} value={money(is.data?.netIncome)} loading={is.isLoading} error={is.isError} onRetry={() => void is.refetch()} hint={rangeHint} />
            </Reveal>
            <Reveal index={3}>
              <SummaryCard title={t.dashboard.endingCash} value={money(cf.data?.kasAkhir)} loading={cf.isLoading} error={cf.isError} onRetry={() => void cf.refetch()} hint={rangeHint} />
            </Reveal>
            <Reveal index={4}>
              <Link to="/journals" search={{ status: 'DRAFT' }} className="block rounded-xl transition-opacity hover:opacity-90">
                <SummaryCard title={t.dashboard.draftEntries} value={drafts.data?.total ?? '—'} loading={drafts.isLoading} error={drafts.isError} onRetry={() => void drafts.refetch()} />
              </Link>
            </Reveal>
          </div>
        </div>
```
(The `Reveal` divs become the grid items — the `grid-cols` apply to them — so the layout is unchanged. The `allPending` skeleton branch is untouched.)

- [ ] **Step 3: Run the dashboard tests + typecheck**

Run: `pnpm exec vitest run src/features/dashboard && pnpm exec tsc --noEmit`
Expected: PASS. Motion renders the wrapped children into the DOM synchronously, so every figure assertion still resolves (the `matchMedia` shim from Task 1 is required and present).

- [ ] **Step 4: Commit**

```bash
git add src/features/dashboard/DashboardPage.tsx
git commit -m "feat(dashboard): fade+rise entrance for hero and cards

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Focus rings on custom links

**Files:** Modify `src/components/common/AppShell.tsx`, `src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Sidebar nav links (both occurrences)**

In `src/components/common/AppShell.tsx`, the nav `<Link>` base className appears **twice** (mapped links + audit link). Replace **all** occurrences of:
```tsx
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
```
with:
```tsx
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
```

- [ ] **Step 2: Dashboard draft link**

In `src/features/dashboard/DashboardPage.tsx`, change the draft `<Link>`'s className:
```tsx
className="block rounded-xl transition-opacity hover:opacity-90"
```
to:
```tsx
className="block rounded-xl transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- [ ] **Step 3: Verify build + AppShell/dashboard tests**

Run: `pnpm exec vitest run src/components/common/AppShell.test.tsx src/features/dashboard && pnpm run build`
Expected: PASS (focus classes don't change structure/labels; build clean).

- [ ] **Step 4: Commit**

```bash
git add src/components/common/AppShell.tsx src/features/dashboard/DashboardPage.tsx
git commit -m "feat(a11y): focus-visible rings on sidebar nav + dashboard draft links

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full gate**

Run: `pnpm test --run && pnpm exec tsc --noEmit && pnpm run lint && pnpm run build`
Expected: all tests pass (269 + 2 new Reveal tests = 271), tsc 0 errors, lint 0 errors (pre-existing React-Compiler/RHF warnings only), build succeeds.

- [ ] **Step 2: Manual smoke** (human; the subagent cannot do this)

`pnpm dev`:
- On the dashboard load, the hero then the four cards **fade + rise in** with a subtle stagger (~50ms apart, 240ms eased), in both light and dark.
- Enable the OS "Reduce Motion" setting and reload → the dashboard appears **instantly** (no fade/rise).
- **Tab** through the **sidebar nav links** (navy sidebar) and the **dashboard draft card** → each shows a clearly visible focus ring (light-blue on navy; the accent ring on the draft card).

- [ ] **Step 3: Commit any smoke fixes** (skip if none)

```bash
git add -A
git commit -m "fix(theme): Phase 3c motion/a11y smoke adjustments

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Motion only on the dashboard entrance — do NOT animate overlays (already animated) or list pages (out of scope).
- Do NOT change control sizes (density kept by decision); 3c only adds focus rings.
- The `matchMedia` shim (Task 1) is required for any test that renders a `Reveal`/`motion` component — keep it.
- This is the final sub-phase; after merge, the Amex revamp is complete.

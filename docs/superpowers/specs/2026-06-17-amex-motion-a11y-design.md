# Amex Theme — Phase 3c: Motion + a11y Polish — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming)
**Scope:** Phase 3c (the finale) of the Amex revamp. Add a tasteful dashboard entrance animation (Motion) and a focused accessibility pass (focus rings on custom links).

## Goal

Finish the revamp with restrained, motivated motion — a reduced-motion-aware fade+rise entrance on the dashboard — and close the keyboard-a11y gaps on the few custom links the shadcn focus styles don't cover. Per the Amex motion spec (120–240ms eased, never bouncy, reduced-motion respected).

## Background (audited)

- **Overlays already animate:** every Radix surface (`dialog`, `dropdown-menu`, `tooltip`, `popover`, `sheet`, `select`, `alert-dialog`) already has open/close `animate-in`/`fade`/`zoom` via `tw-animate-css`. Motion is therefore only for **content entrance**, not overlays.
- **Focus is mostly covered:** the shadcn controls (`button`, `input`, `select`, `checkbox`, `switch`, `textarea`, `badge`, `input-group`) all carry `focus-visible:ring`. The gaps are the **custom `<Link>`s**: the `AppShell` sidebar nav links + audit link, and the dashboard draft-count link, which rely on the faint base `outline-ring/50`.
- **Controls are `h-8` (32px):** below the 44px touch minimum, but this is a **dense desktop** app — blanket 44px would bloat tables/forms. Decision: keep density, win a11y via focus.
- `motion` is **not yet installed** (decided in Phase 1, reaffirmed for 3c).

## Decisions (from brainstorming)

- **Motion: dashboard entrance only** — hero + summary cards fade+rise on load with a subtle stagger. No list-page or overlay motion.
- **a11y: focus rings + keep current control density** — add `focus-visible` rings to the custom links; do NOT enlarge controls to 44px.

## 1. Motion — `Reveal` primitive

New `src/components/common/Reveal.tsx`, built on `motion/react`:
```tsx
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/** Fade + rise entrance. Honors prefers-reduced-motion (renders a plain div,
 *  no animation). `index` staggers siblings by 50ms each. */
export function Reveal({ children, index = 0, className }: { children: ReactNode; index?: number; className?: string }) {
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

**Dashboard usage** (`DashboardPage.tsx`, the loaded branch only): wrap the hero in `<Reveal index={0}>` and each of the four secondary cards in `<Reveal index={1..4}>`, so the content fades + rises in with a ~50ms stagger (240ms eased), or appears instantly under reduced-motion. The `allPending` skeleton branch is untouched. The grid wrappers keep their layout classes (pass `className` through `Reveal` where a card needs grid placement, or wrap the card content inside the existing grid cell).

## 2. a11y — focus rings on custom links

- **`AppShell` nav links + audit link:** append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring` to the link base class (light-blue ring reads on the navy sidebar).
- **Dashboard draft `<Link>`** (currently `className="block rounded-xl transition-opacity hover:opacity-90"`): append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.
- No control-size changes; shadcn controls already have focus rings.

## 3. Test shim

`motion`'s `useReducedMotion` calls `window.matchMedia`, which jsdom does not implement. Add a `matchMedia` shim to `src/test/setup.ts` (alongside the existing ResizeObserver / pointer-capture shims) returning a stub with `matches: false` and no-op `addEventListener`/`removeEventListener`, so `Reveal` and the dashboard tests run.

## Testing

- **`Reveal` smoke test:** renders its children (e.g. `<Reveal><p>x</p></Reveal>` → "x" present). With the `matchMedia` shim returning `matches:false`, the animated branch renders the children into the DOM.
- **Existing `DashboardPage` tests stay green:** Motion renders children synchronously into the DOM, so the figure assertions still pass once the `matchMedia` shim is present.
- **`AppShell` test unaffected:** link structure/labels unchanged; only focus classes added.
- Full gate (`pnpm test --run && tsc && lint && build`) green.
- **Manual smoke:** dashboard hero + cards fade/rise in on load (and appear instantly with OS "reduce motion" on); Tab through the sidebar nav + the draft card shows a clearly visible focus ring in both light and dark.

## Files

- **New:** `src/components/common/Reveal.tsx`, `src/components/common/Reveal.test.tsx`.
- **Modify:** `src/features/dashboard/DashboardPage.tsx`, `src/components/common/AppShell.tsx`, `src/test/setup.ts`, `package.json` (add `motion`).

## Out of scope (completes Phase 3 / the revamp)

- No list-page or overlay motion (overlays already animate; list motion declined).
- No control-size / 44px changes (density kept by decision).
- `PaymentStatusChip` remains deferred (paymentStatus still not displayed).
- This is the final sub-phase — after it, the Amex revamp (P1 tokens → P2 chips → 3a shell → 3b dashboard → 3c motion/a11y) is complete.

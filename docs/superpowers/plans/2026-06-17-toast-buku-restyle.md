# Toast (sonner) Buku Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the sonner toast so it follows the in-app dark-mode toggle and matches the Buku "calm card + colour accent" language (neutral popover card, semantic colour only on the lucide icon + a 3px left-bar, navy-tinted elevated shadow).

**Architecture:** Two small edits plus one test. (1) `src/components/ui/sonner.tsx` reads `theme` from the app's zustand store (`@/stores/theme`) instead of the unused `next-themes`, and replaces the dead `cn-toast` class with real Buku classes + per-type accent `classNames`. (2) `src/app/providers.tsx` drops the `richColors` prop. (3) A new test mocks the `sonner` library and asserts the props our `<Providers>` composition passes (theme from store, no richColors, the accent classNames).

**Tech Stack:** React 19, TypeScript strict, sonner `^2.0.7`, zustand theme store, Tailwind v4 semantic tokens (`--color-success/-warning/-destructive/-primary`, `--shadow-lg`), lucide-react icons, Vitest 4 + RTL.

---

## Spec

Reference: `docs/superpowers/specs/2026-06-17-toast-buku-restyle-design.md`

## File Structure

- `src/components/ui/sonner.tsx` — the custom `Toaster` wrapper. Owns theme source, lucide icons, base CSS vars, and per-type accent `classNames`. **Modify.**
- `src/app/providers.tsx` — the single `<Toaster>` mount. **Modify** (drop `richColors`).
- `src/components/ui/sonner.test.tsx` — **Create.** Mocks `sonner`, renders `<Providers>`, asserts the toaster props.

No new files beyond the test; no shared CSS added (per-type styling rides on existing Tailwind token utilities).

---

## Task 1: Test — toaster theme + styling contract (TDD red)

**Files:**
- Create: `src/components/ui/sonner.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/sonner.test.tsx` with exactly this content:

```tsx
import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useTheme } from '@/stores/theme';

// Spy on the props our composition passes to the underlying sonner Toaster.
// vi.hoisted lets the hoisted vi.mock factory reference the spy safely.
const { sonnerSpy } = vi.hoisted(() => ({ sonnerSpy: vi.fn() }));
vi.mock('sonner', () => ({
  Toaster: (props: Record<string, unknown>) => {
    sonnerSpy(props);
    return null;
  },
}));

// Imported after vi.mock so Providers -> our Toaster wrapper -> mocked sonner.
import { Providers } from '@/app/providers';

function lastProps() {
  return sonnerSpy.mock.calls.at(-1)![0] as {
    theme?: string;
    richColors?: unknown;
    toastOptions?: { classNames?: Record<string, string> };
  };
}

afterEach(() => {
  sonnerSpy.mockClear();
  useTheme.setState({ theme: 'light' });
});

it('drives the toaster theme from the app store, not next-themes', () => {
  useTheme.setState({ theme: 'dark' });
  render(
    <Providers>
      <div />
    </Providers>,
  );
  expect(sonnerSpy).toHaveBeenCalled();
  expect(lastProps()).toMatchObject({ theme: 'dark' });
});

it('does not enable sonner richColors (Buku uses semantic per-type classes)', () => {
  render(
    <Providers>
      <div />
    </Providers>,
  );
  expect(lastProps().richColors).toBeFalsy();
});

it('applies the Buku semantic per-type accent classNames', () => {
  render(
    <Providers>
      <div />
    </Providers>,
  );
  const cn = lastProps().toastOptions?.classNames ?? {};
  expect(cn.success).toContain('border-l-success');
  expect(cn.error).toContain('border-l-destructive');
  expect(cn.warning).toContain('border-l-warning');
  expect(cn.info).toContain('border-l-primary');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test --run src/components/ui/sonner.test.tsx`

Expected: FAIL.
- Test 1 fails: the current `sonner.tsx` imports `useTheme` from `next-themes` (no provider mounted), so the captured `theme` is `'system'`, not `'dark'`.
- Test 3 fails: the current `toastOptions.classNames` is `{ toast: 'cn-toast' }` — no `success`/`error`/`warning`/`info` keys.
- (Test 2 may already pass or fail depending on prop forwarding; the suite as a whole is RED.)

- [ ] **Step 3: Commit the failing test**

```bash
git add src/components/ui/sonner.test.tsx
git commit -m "test: pin toaster theme-from-store + Buku accent classNames (red)"
```

---

## Task 2: Rewire `sonner.tsx` — theme source + accent classNames (TDD green)

**Files:**
- Modify: `src/components/ui/sonner.tsx`

- [ ] **Step 1: Replace the file contents**

Overwrite `src/components/ui/sonner.tsx` with exactly:

```tsx
import { useTheme } from "@/stores/theme"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "shadow-lg border-border",
          success: "border-l-[3px] border-l-success [&_[data-icon]]:text-success",
          error: "border-l-[3px] border-l-destructive [&_[data-icon]]:text-destructive",
          warning: "border-l-[3px] border-l-warning [&_[data-icon]]:text-warning",
          info: "border-l-[3px] border-l-primary [&_[data-icon]]:text-primary",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
```

Notes:
- `theme` from the store is typed `'light' | 'dark'`, both valid `ToasterProps["theme"]` values — no cast needed (drops the old `as ToasterProps["theme"]`).
- `useTheme()` with no selector returns the whole store object `{ theme, setTheme, toggle }`; destructuring `theme` is correct and re-renders on toggle.
- Each per-type class string adds a 3px semantic left-bar and colours the lucide icon via the `[data-icon]` slot (icons use `currentColor`). `shadow-lg` resolves to the Buku navy elevated shadow (`--shadow-lg` in `src/index.css`).
- The dead `cn-toast` class is gone.

- [ ] **Step 2: Run the test to verify tests 1 and 3 pass**

Run: `pnpm test --run src/components/ui/sonner.test.tsx`

Expected: PASS for "drives the toaster theme from the app store" and "applies the Buku semantic per-type accent classNames". Test 2 ("does not enable sonner richColors") may still FAIL because `providers.tsx` still forwards `richColors` via `{...props}` — that is fixed in Task 3.

- [ ] **Step 3: Verify typecheck is clean**

Run: `pnpm exec tsc --noEmit`
Expected: no errors (the `theme` prop no longer needs a cast; `next-themes` import removed).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/sonner.tsx
git commit -m "feat(toast): theme from app store + Buku per-type accent classNames"
```

---

## Task 3: Drop `richColors` at the mount (TDD green)

**Files:**
- Modify: `src/app/providers.tsx:11`

- [ ] **Step 1: Remove the `richColors` prop**

In `src/app/providers.tsx`, change the Toaster mount line from:

```tsx
        <Toaster richColors position="top-right" />
```

to:

```tsx
        <Toaster position="top-right" />
```

(Leave everything else in the file unchanged.)

- [ ] **Step 2: Run the full toaster test to verify all three pass**

Run: `pnpm test --run src/components/ui/sonner.test.tsx`
Expected: PASS (all 3 tests). With `richColors` no longer forwarded, `lastProps().richColors` is `undefined` (falsy).

- [ ] **Step 3: Commit**

```bash
git add src/app/providers.tsx
git commit -m "feat(toast): drop sonner richColors so Buku semantic styling applies"
```

---

## Task 4: Full gate — tests, typecheck, lint, build

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `pnpm test --run`
Expected: all tests green (the prior baseline plus the 3 new toaster tests). No existing `toast.*` caller test (e.g. `src/lib/api/toastApiError.test.ts`) changes behaviour — those mock `sonner.toast` and are unaffected by the styling/mount change.

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `pnpm run lint`
Expected: no new warnings/errors. (Pre-existing React-Compiler / react-hook-form warnings are expected per `CLAUDE.md` — do not "fix" them.)

- [ ] **Step 4: Build**

Run: `pnpm run build`
Expected: succeeds.

- [ ] **Step 5: Commit (only if any lint autofix touched files; otherwise skip)**

```bash
git add -A
git commit -m "chore(toast): lint/build gate green" || echo "nothing to commit"
```

---

## Manual / visual verification (post-merge or in dev)

Not automated (jsdom can't render a live styled toast faithfully). In `pnpm dev`:

- Toggle the in-app dark mode: toasts flip light/dark with the rest of the app (the bug fix).
- Trigger each variant (e.g. save success, an API error, a closed-period 409 warning, an info toast): each shows a neutral card with the semantic **lucide icon + 3px left-bar** — success green (`#00875A`), error red (`#C52720`), warning amber (`#B95000`), info blue (`#006FCF`) — on the navy-tinted elevated shadow, 8px radius, Public Sans.
- No fully tinted (richColors) backgrounds remain.

---

## Self-Review

**Spec coverage:**
- Theme sync fix → Task 2 (import swap) + Task 1 test 1. ✓
- Drop `richColors` → Task 3 + Task 1 test 2. ✓
- Per-type "calm card + accent" classNames → Task 2 + Task 1 test 3. ✓
- Navy elevated shadow / 8px radius → Task 2 (`shadow-lg`, existing `--border-radius`). ✓
- Remove dead `cn-toast` → Task 2 (file overwrite no longer contains it). ✓
- Keep `position="top-right"`, lucide icons, base popover vars → Task 2/Task 3 preserve them. ✓
- Leave `next-themes` dep in place → no package.json/lockfile task (out of scope). ✓
- Callers unchanged → Task 4 step 1 confirms `toastApiError` tests stay green. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content. ✓

**Type consistency:** `theme` (`'light' | 'dark'`) passed to `theme` prop without cast; `useTheme` imported from `@/stores/theme` in both `sonner.tsx` and the test; classNames keys `success/error/warning/info` match between Task 1 assertions and Task 2 implementation; class strings (`border-l-success`, `border-l-destructive`, `border-l-warning`, `border-l-primary`) match between test `toContain` checks and implementation. ✓

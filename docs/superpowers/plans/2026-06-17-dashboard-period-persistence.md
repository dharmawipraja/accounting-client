# Persist Dashboard Period Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the dashboard's period selection across reloads — relative presets (`month`/`quarter`/`year`) recompute to today, a `custom` range restores exactly.

**Architecture:** A new persisted `usePreferences` zustand store (`buku.prefs`) holds `dashboardPeriod`; a pure `resolveStoredPeriod` helper resolves a stored selection for display; `DashboardPage` swaps its local `useState` for the store + helper.

**Tech Stack:** React 19, zustand + persist (matching `src/stores/session.ts`/`theme.tsx`), date-fns, Vitest 4 + RTL + MSW.

**Spec:** `docs/superpowers/specs/2026-06-17-dashboard-period-persistence-design.md`

**Branch:** `feat/dashboard-period-persistence` (already created; spec committed at `24f8f41`).

---

## File Structure

**New**
- `src/stores/preferences.ts` — `usePreferences` store: `{ dashboardPeriod, setDashboardPeriod }`, persisted as `buku.prefs`.
- `src/stores/preferences.test.ts` — default + persistence.

**Modified**
- `src/features/dashboard/period.ts` — add `resolveStoredPeriod(stored, today)`.
- `src/features/dashboard/period.test.ts` — tests for `resolveStoredPeriod`.
- `src/features/dashboard/DashboardPage.tsx` — read/write the store instead of local state.
- `src/features/dashboard/DashboardPage.test.tsx` — reset the store between tests + assert a selection persists.

**Unchanged:** `DashboardFilters.tsx` (already takes `period` + the two callbacks as props).

---

## Task 1: `resolveStoredPeriod` helper

**Files:**
- Modify: `src/features/dashboard/period.ts`
- Test: `src/features/dashboard/period.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/features/dashboard/period.test.ts`, change the import line and append a new describe block. The file already defines `const today = new Date(2026, 5, 13);`.

Change the first import line from:
```ts
import { computePeriod, periodValid } from './period';
```
to:
```ts
import { computePeriod, periodValid, resolveStoredPeriod, type Period } from './period';
```

Append at the end of the file:
```ts
describe('resolveStoredPeriod', () => {
  it('recomputes a relative preset to today, ignoring stale stored dates', () => {
    const stale: Period = { preset: 'month', from: '2025-01-01', to: '2025-01-31' };
    expect(resolveStoredPeriod(stale, today)).toEqual({ preset: 'month', from: '2026-06-01', to: '2026-06-13' });
  });

  it('returns a custom range verbatim', () => {
    const custom: Period = { preset: 'custom', from: '2026-02-01', to: '2026-02-28' };
    expect(resolveStoredPeriod(custom, today)).toEqual(custom);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/features/dashboard/period.test.ts`
Expected: FAIL — `resolveStoredPeriod` is not exported.

- [ ] **Step 3: Implement the helper**

Append to `src/features/dashboard/period.ts`:
```ts
/** Resolve a stored selection for display: relative presets recompute to
 *  `today`; a custom range is returned verbatim. */
export function resolveStoredPeriod(stored: Period, today: Date): Period {
  return stored.preset === 'custom' ? stored : computePeriod(stored.preset, today);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/features/dashboard/period.test.ts`
Expected: PASS (all `computePeriod`/`periodValid`/`resolveStoredPeriod` tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/period.ts src/features/dashboard/period.test.ts
git commit -m "feat(dashboard): resolveStoredPeriod — recompute presets, keep custom

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `usePreferences` store

**Files:**
- Create: `src/stores/preferences.ts`
- Test: `src/stores/preferences.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stores/preferences.test.ts`:
```ts
import { afterEach, expect, it } from 'vitest';
import { computePeriod } from '@/features/dashboard/period';
import { usePreferences } from './preferences';

// The store is a module singleton; reset it (and its persisted copy) per test.
afterEach(() => {
  usePreferences.setState({ dashboardPeriod: computePeriod('year', new Date()) });
  localStorage.clear();
});

it('defaults dashboardPeriod to a year preset', () => {
  expect(usePreferences.getState().dashboardPeriod.preset).toBe('year');
});

it('persists a set dashboardPeriod to localStorage', () => {
  usePreferences.getState().setDashboardPeriod({ preset: 'custom', from: '2026-02-01', to: '2026-02-28' });
  expect(usePreferences.getState().dashboardPeriod).toEqual({ preset: 'custom', from: '2026-02-01', to: '2026-02-28' });
  expect(localStorage.getItem('buku.prefs')).toContain('"preset":"custom"');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/stores/preferences.test.ts`
Expected: FAIL — `./preferences` module does not exist.

- [ ] **Step 3: Implement the store**

Create `src/stores/preferences.ts`:
```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computePeriod, type Period } from '@/features/dashboard/period';

/** Persisted client UI preferences. Ships with the dashboard period; new
 *  preferences (page size, locale, …) get fields here as features need them. */
export interface PreferencesState {
  dashboardPeriod: Period;
  setDashboardPeriod(p: Period): void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      dashboardPeriod: computePeriod('year', new Date()),
      setDashboardPeriod: (dashboardPeriod) => set({ dashboardPeriod }),
    }),
    { name: 'buku.prefs' },
  ),
);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/stores/preferences.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stores/preferences.ts src/stores/preferences.test.ts
git commit -m "feat(stores): usePreferences store with persisted dashboardPeriod

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Wire the store into `DashboardPage`

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Test: `src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Update the test (reset the store + assert persistence)**

In `src/features/dashboard/DashboardPage.test.tsx`:

(a) Add two imports near the other imports:
```ts
import { computePeriod } from './period';
import { usePreferences } from '@/stores/preferences';
```

(b) Replace the existing `afterEach` line:
```ts
afterEach(() => useSession.getState().clear());
```
with:
```ts
afterEach(() => {
  useSession.getState().clear();
  usePreferences.setState({ dashboardPeriod: computePeriod('year', new Date()) });
});
```

(c) Append a new test at the end of the file:
```ts
it('persists the selected period preset to buku.prefs', async () => {
  const user = userEvent.setup();
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  renderPage();
  await screen.findByText('Rp 1.500.000'); // initial (year) load settled
  await user.click(screen.getByRole('button', { name: 'Bulan Ini' })); // "This month"
  await waitFor(() => expect(localStorage.getItem('buku.prefs')).toContain('"preset":"month"'));
});
```
(`userEvent`, `screen`, `waitFor` are already imported in this file.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/features/dashboard/DashboardPage.test.tsx`
Expected: FAIL — `DashboardPage` still uses local `useState`, so nothing is written to `buku.prefs`.

- [ ] **Step 3: Implement the integration**

In `src/features/dashboard/DashboardPage.tsx`:

(a) Change the React import from:
```ts
import { useState } from 'react';
```
to:
```ts
import { useMemo } from 'react';
```

(b) Change the period import from:
```ts
import { computePeriod, periodValid, type Period, type PeriodPreset } from './period';
```
to:
```ts
import { computePeriod, periodValid, resolveStoredPeriod, type PeriodPreset } from './period';
```

(c) Add the store import (next to the other `@/` imports):
```ts
import { usePreferences } from '@/stores/preferences';
```

(d) Replace the period state line:
```ts
const [period, setPeriod] = useState<Period>(() => computePeriod('year', new Date()));
```
with:
```ts
const stored = usePreferences((s) => s.dashboardPeriod);
const setPeriod = usePreferences((s) => s.setDashboardPeriod);
const period = useMemo(() => resolveStoredPeriod(stored, new Date()), [stored]);
```

The `DashboardFilters` props are unchanged — `onSelectPreset` still calls `setPeriod(computePeriod(preset, new Date()))` and `onCustomChange` still calls `setPeriod({ preset: 'custom', from, to })`; `setPeriod` is now the store setter with the same `(p: Period) => void` signature.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/features/dashboard/DashboardPage.test.tsx`
Expected: PASS (existing card/render tests + the new persistence test).

- [ ] **Step 5: Full verification**

Run: `pnpm test --run && pnpm exec tsc --noEmit && pnpm run lint`
Expected: all tests pass; tsc 0 errors; lint 0 errors (pre-existing React-Compiler / react-hook-form warnings are fine). Confirm `Period` is no longer imported in `DashboardPage.tsx` (it would be an unused-import lint error if left).

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard/DashboardPage.tsx src/features/dashboard/DashboardPage.test.tsx
git commit -m "feat(dashboard): persist period selection via usePreferences

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- No new dependencies (zustand/persist already used by `session.ts`/`theme.tsx`).
- The store is a module singleton — any test touching it must reset it in `afterEach` (Tasks 2 and 3 do this) so state doesn't bleed across tests.
- Don't add other preference fields (page size, locale, sidebar) — out of scope; the store ships with `dashboardPeriod` only.
- `DashboardFilters.tsx` must not change.

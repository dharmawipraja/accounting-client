# Collapsible Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the navy app-shell sidebar collapse to an animated icon rail, with the collapsed state persisted, toggled by a chevron in the sidebar's brand row.

**Architecture:** A persisted `sidebarCollapsed` flag is added to the existing `preferences` zustand store. `AppShell` reads it and conditionally renders an expanded (`w-60`) or collapsed (`w-16`) rail, with a CSS width/opacity/rotate transition (reduced-motion-safe). Two i18n strings back the toggle's a11y label. All UI changes live in `AppShell.tsx`.

**Tech Stack:** React 19, TypeScript strict, zustand + persist, TanStack Router (`<Link>`), Tailwind v4 (sidebar tokens, `cn` from `@/lib/utils`), lucide-react (`ChevronLeft`), Vitest 4 + RTL + userEvent.

---

## Spec

Reference: `docs/superpowers/specs/2026-06-17-collapsible-sidebar-design.md`

## File Structure

- `src/stores/preferences.ts` — **Modify.** Add `sidebarCollapsed` + `toggleSidebar`/`setSidebarCollapsed` to the persisted store.
- `src/stores/preferences.test.ts` — **Modify.** Assertions for the new state.
- `src/lib/i18n/messages.id.ts` — **Modify.** Two `nav` strings (`collapseSidebar`, `expandSidebar`).
- `src/components/common/AppShell.tsx` — **Modify.** Collapsible rail, brand-row toggle, animated labels, a11y.
- `src/components/common/AppShell.test.tsx` — **Modify.** Toggle behavior assertions.

---

## Task 1: Persist `sidebarCollapsed` in the preferences store

**Files:**
- Modify: `src/stores/preferences.ts`
- Modify: `src/stores/preferences.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/stores/preferences.test.ts`, update the `afterEach` to also reset the new field, and append three tests.

Change the existing `afterEach` from:
```ts
afterEach(() => {
  usePreferences.setState({ dashboardPeriod: computePeriod('year', new Date()) });
  localStorage.clear();
});
```
to:
```ts
afterEach(() => {
  usePreferences.setState({ dashboardPeriod: computePeriod('year', new Date()), sidebarCollapsed: false });
  localStorage.clear();
});
```

Append at the end of the file:
```ts
it('defaults sidebarCollapsed to false', () => {
  expect(usePreferences.getState().sidebarCollapsed).toBe(false);
});

it('toggleSidebar flips sidebarCollapsed', () => {
  usePreferences.getState().toggleSidebar();
  expect(usePreferences.getState().sidebarCollapsed).toBe(true);
  usePreferences.getState().toggleSidebar();
  expect(usePreferences.getState().sidebarCollapsed).toBe(false);
});

it('persists sidebarCollapsed to localStorage', () => {
  usePreferences.getState().setSidebarCollapsed(true);
  expect(usePreferences.getState().sidebarCollapsed).toBe(true);
  expect(localStorage.getItem('buku.prefs')).toContain('"sidebarCollapsed":true');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test --run src/stores/preferences.test.ts`
Expected: FAIL — `sidebarCollapsed` / `toggleSidebar` / `setSidebarCollapsed` do not exist (TS error / undefined is not a function).

- [ ] **Step 3: Add the state and actions**

Replace the entire contents of `src/stores/preferences.ts` with:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computePeriod, type Period } from '@/features/dashboard/period';

/** Persisted client UI preferences. Ships with the dashboard period; new
 *  preferences (page size, locale, …) get fields here as features need them. */
export interface PreferencesState {
  dashboardPeriod: Period;
  setDashboardPeriod(p: Period): void;
  sidebarCollapsed: boolean;
  toggleSidebar(): void;
  setSidebarCollapsed(collapsed: boolean): void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      dashboardPeriod: computePeriod('year', new Date()),
      setDashboardPeriod: (dashboardPeriod) => set({ dashboardPeriod }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    { name: 'buku.prefs' },
  ),
);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test --run src/stores/preferences.test.ts`
Expected: PASS (existing 2 + new 3 = 5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stores/preferences.ts src/stores/preferences.test.ts
git commit -m "feat(prefs): persist sidebarCollapsed flag"
```

---

## Task 2: Collapsible sidebar in `AppShell` + i18n

**Files:**
- Modify: `src/lib/i18n/messages.id.ts`
- Modify: `src/components/common/AppShell.tsx`
- Modify: `src/components/common/AppShell.test.tsx`

- [ ] **Step 1: Add the i18n strings**

In `src/lib/i18n/messages.id.ts`, in the `nav` block, change:
```ts
    settings: 'Pengaturan',
  },
```
to:
```ts
    settings: 'Pengaturan',
    collapseSidebar: 'Ciutkan menu',
    expandSidebar: 'Lebarkan menu',
  },
```

- [ ] **Step 2: Write the failing AppShell test**

In `src/components/common/AppShell.test.tsx`:

Add `usePreferences` to the imports (next to the `useSession` import):
```ts
import { usePreferences } from '@/stores/preferences';
```

Change the existing `afterEach` from:
```ts
afterEach(() => useSession.getState().clear());
```
to:
```ts
afterEach(() => {
  useSession.getState().clear();
  usePreferences.setState({ sidebarCollapsed: false });
});
```

Append this test at the end of the file:
```ts
it('toggles the sidebar collapsed state and persists it', async () => {
  useSession.getState().setUser({ id: '1', email: 'admin@buku.id', role: 'ADMIN' });
  renderInRouter(<AppShell><div>content</div></AppShell>);

  const toggle = await screen.findByRole('button', { name: 'Ciutkan menu' });
  expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await userEvent.click(toggle);

  expect(usePreferences.getState().sidebarCollapsed).toBe(true);
  const expandBtn = screen.getByRole('button', { name: 'Lebarkan menu' });
  expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
  // labels stay in the DOM when collapsed, so links keep their accessible names
  expect(screen.getByRole('link', { name: /dasbor/i })).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test --run src/components/common/AppShell.test.tsx`
Expected: FAIL — there is no button named "Ciutkan menu" yet (and `t.nav.collapseSidebar` is referenced by the not-yet-written shell).

- [ ] **Step 4: Implement the collapsible shell**

Replace the entire contents of `src/components/common/AppShell.tsx` with:

```tsx
import type { ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  BookText,
  CalendarCheck,
  FileChartColumn,
  LayoutDashboard,
  NotebookText,
  Users,
  Receipt,
  ReceiptText,
  Percent,
  Wallet,
  LogOut,
  ScrollText,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHydrateSession } from '@/features/auth/useHydrateSession';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/utils';
import { useSession } from '@/stores/session';
import { usePreferences } from '@/stores/preferences';
import { ThemeToggle } from './ThemeToggle';

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const clear = useSession((s) => s.clear);
  const collapsed = usePreferences((s) => s.sidebarCollapsed);
  const toggleSidebar = usePreferences((s) => s.toggleSidebar);

  // Hydrate user from /auth/me on mount/reload if token exists but no user yet.
  useHydrateSession();

  const nav = [
    { to: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/accounts', label: t.nav.accounts, icon: BookText },
    { to: '/journals', label: t.nav.journals, icon: NotebookText },
    { to: '/reports', label: t.nav.reports, icon: FileChartColumn },
    { to: '/periods', label: t.nav.periods, icon: CalendarCheck },
    { to: '/partners', label: t.nav.partners, icon: Users },
    { to: '/tax-codes', label: t.nav.taxCodes, icon: Percent },
    { to: '/sales-invoices', label: t.nav.salesInvoices, icon: Receipt },
    { to: '/purchase-bills', label: t.nav.purchaseBills, icon: ReceiptText },
    { to: '/payments', label: t.nav.payments, icon: Wallet },
    { to: '/settings', label: t.nav.settings, icon: Settings },
  ] as const;

  const navLinkClass =
    'flex items-center gap-2 overflow-hidden rounded-md px-3 py-2.5 text-sm whitespace-nowrap text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring';
  const activeLinkClass =
    'bg-sidebar-accent font-medium text-sidebar-foreground shadow-[inset_3px_0_0_var(--sidebar-ring)]';
  const labelClass = cn(
    'transition-opacity duration-200 motion-reduce:transition-none',
    collapsed && 'opacity-0',
  );

  return (
    <div className="flex min-h-svh">
      <aside
        className={cn(
          'flex shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out motion-reduce:transition-none',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className="flex items-center gap-2 px-3 py-4">
          {!collapsed && (
            <>
              <BookText className="size-5 shrink-0 text-sidebar-foreground" />
              <span className="whitespace-nowrap text-lg font-semibold">{t.app.name}</span>
            </>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
            className={cn(
              'flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              collapsed ? 'mx-auto' : 'ml-auto',
            )}
          >
            <ChevronLeft
              className={cn(
                'size-4 transition-transform duration-200 motion-reduce:transition-none',
                collapsed && 'rotate-180',
              )}
            />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={navLinkClass}
              activeProps={{ className: activeLinkClass }}
            >
              <item.icon className="size-4 shrink-0" />
              <span className={labelClass}>{item.label}</span>
            </Link>
          ))}
          {user?.role === 'ADMIN' && (
            <Link
              to="/audit"
              title={collapsed ? t.nav.audit : undefined}
              className={navLinkClass}
              activeProps={{ className: activeLinkClass }}
            >
              <ScrollText className="size-4 shrink-0" />
              <span className={labelClass}>{t.nav.audit}</span>
            </Link>
          )}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b px-6">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.auth.signOut}
            onClick={() => {
              clear();
              void navigate({ to: '/login' });
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

Notes:
- The brand cluster (logo + wordmark) is conditionally rendered so the toggle centers (`mx-auto`) cleanly in the collapsed 64px rail; when expanded the toggle sits at `ml-auto`.
- Nav-row labels stay mounted (preserving each link's accessible name) and fade via `labelClass`; the row + aside `overflow-hidden` clip them as the rail narrows. Icons use `shrink-0` so they hold a stable position.
- Width, label opacity, and chevron rotation all transition at 200ms and collapse to instant under `motion-reduce`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test --run src/components/common/AppShell.test.tsx`
Expected: PASS (existing app-name / sign-out tests + the new toggle test).

- [ ] **Step 6: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: clean. (`t.nav.collapseSidebar`/`expandSidebar` now exist on the `Messages` type; `cn` and `ChevronLeft` resolve.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/i18n/messages.id.ts src/components/common/AppShell.tsx src/components/common/AppShell.test.tsx
git commit -m "feat(shell): collapsible sidebar with animated icon rail"
```

---

## Task 3: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `pnpm test --run`
Expected: all green (prior baseline + 3 new preferences tests + 1 new AppShell test).

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
git commit -m "chore(shell): collapsible-sidebar lint/build gate green" || echo "nothing to commit"
```

---

## Manual / visual verification (in `pnpm dev`)

- Click the brand-row chevron: the sidebar animates to a 64px icon rail over ~200ms; labels fade out; the chevron rotates 180°.
- Hover a collapsed icon: a native tooltip shows its label. The active item keeps its blue left-bar.
- Reload the page: the collapsed/expanded state is preserved (persisted in `buku.prefs`).
- Turn on OS "reduce motion": toggling snaps instantly (no animation).
- Dark mode: the rail stays navy; nothing else changes. The header and content are unaffected; collapsing widens the content area.

---

## Self-Review

**Spec coverage:**
- Icon-rail collapse (`w-60`↔`w-16`) → Task 2 aside classes. ✓
- Toggle = chevron in the brand row, « / », `aria-expanded` + switching `aria-label` → Task 2 brand-row button. ✓
- Persisted in `preferences` (`buku.prefs`) → Task 1 store field + actions, Task 2 reads it. ✓
- Animation (width + label opacity + chevron rotate, 200ms, reduced-motion-safe) → Task 2 `transition-*` + `motion-reduce:*`. ✓
- a11y: `aria-expanded`/`aria-label`, focus ring, labels in DOM as accessible names, `title` tooltip when collapsed → Task 2. ✓
- i18n: 2 new `nav` strings → Task 2 Step 1. ✓
- Brand cluster hidden when collapsed (toggle centers) → Task 2 implementation note. ✓
- Mobile/responsive out of scope; header/content/nav unchanged → no tasks touch them. ✓
- Tests: store defaults/toggle/persist (Task 1), shell toggle aria + persist + labels-in-DOM (Task 2). ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content. ✓

**Type consistency:** `sidebarCollapsed: boolean`, `toggleSidebar()`, `setSidebarCollapsed(collapsed: boolean)` are defined in Task 1 and used identically in Task 2 (`usePreferences((s) => s.sidebarCollapsed)`, `(s) => s.toggleSidebar`) and the tests; `t.nav.collapseSidebar`/`t.nav.expandSidebar` added in Task 2 Step 1 match their use in the AppShell button and the test's button names ("Ciutkan menu" / "Lebarkan menu"). ✓

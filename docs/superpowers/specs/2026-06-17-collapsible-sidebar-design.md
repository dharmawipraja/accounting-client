# Collapsible Sidebar — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming)
**Scope:** Make the app shell's navy sidebar collapsible to an icon rail, with the collapsed state persisted and an animated transition. Touches `AppShell.tsx`, the `preferences` store, and two i18n strings. No routing, nav, or content changes.

## Goal

Let the user collapse the 240px sidebar to a narrow icon rail to reclaim horizontal space for dense tables, then expand it back. The choice persists across reloads. The transition is smooth and reduced-motion-safe.

## Decisions (from brainstorming)

- **Collapse mode = icon rail**, not fully hidden. Collapsed = a ~64px navy rail showing icons only (labels hidden); nav stays one click away. (Full-hide was rejected — switching sections constantly in an accounting app makes a hidden nav costly.)
- **Toggle = a chevron in the sidebar's brand row** (top of the sidebar), not a header hamburger or a bottom control. Reads as « collapse / » expand and lives with the thing it controls.
- **Persist** the collapsed flag in the existing `preferences` store (`buku.prefs`), same mechanism as the dashboard period.
- **Animate** with pure CSS (width + label opacity + chevron rotation), ~200ms eased, honoring `prefers-reduced-motion`. No new animation library.
- **Mobile/responsive is out of scope** — the app is desktop-only today (the shell has no responsive handling); this change keeps that unchanged.

## State — `src/stores/preferences.ts`

Add a persisted boolean and a toggle to the existing store:

```ts
export interface PreferencesState {
  dashboardPeriod: Period;
  setDashboardPeriod(p: Period): void;
  sidebarCollapsed: boolean;
  toggleSidebar(): void;
  setSidebarCollapsed(collapsed: boolean): void;
}
```

- Default `sidebarCollapsed: false` (expanded).
- `toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }))`.
- `setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed })`.
- Persisted automatically (the store is already wrapped in `persist({ name: 'buku.prefs' })`), so the flag survives reloads.

## Markup & animation — `src/components/common/AppShell.tsx`

`AppShell` reads `sidebarCollapsed` and `toggleSidebar` from `usePreferences`. All changes are within this one file.

**The `<aside>`** gets a conditional width and a width transition:
- `w-60` (expanded) ↔ `w-16` (collapsed, 64px).
- Add `overflow-hidden` (so labels clip as the rail narrows) and `transition-[width] duration-200 ease-out motion-reduce:transition-none`.
- Everything else (navy bg, border, `shrink-0`, flex-col) is unchanged.

**Brand / toggle row** (fixed height, top of the sidebar):
- **Expanded:** `[BookText logo] [ "Buku" wordmark ] [chevron toggle, pushed right]`.
- **Collapsed:** the wordmark is hidden and the **chevron toggle is centered** in the rail; the logo is not shown when collapsed (the toggle takes the top slot). The toggle is always rendered and always reachable in both states.
- The toggle is a real `<button>` rendering a single `ChevronLeft` (lucide) that rotates 180° when collapsed: `className={cn('size-4 transition-transform duration-200 motion-reduce:transition-none', collapsed && 'rotate-180')}`.
- Toggle a11y: `aria-expanded={!collapsed}`, `aria-label={collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}`, plus the sidebar focus-visible ring (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring`) and a hover tint (`hover:bg-sidebar-accent`).

**Nav rows** (the 11 links + the conditional Audit link): structure is unchanged (`<Link>` with icon + label). Two additions:
- The label `<span>` keeps the text in the DOM always, and fades on collapse: `className={cn('transition-opacity duration-200 motion-reduce:transition-none', collapsed && 'opacity-0')}`. Combined with the rail's `overflow-hidden` and the row's `whitespace-nowrap`, the label slides-and-fades out behind the edge as the rail narrows. The **icon keeps a stable left position** (no horizontal jump).
- Each link gets `title={collapsed ? item.label : undefined}` for a native hover tooltip when collapsed. Because the label text stays in the DOM, the link's screen-reader accessible name is preserved in both states (no separate `aria-label` needed).
- Active styling (blue left-bar `shadow-[inset_3px_0_0_var(--sidebar-ring)]` + `bg-sidebar-accent`) is identical in both states and reads correctly on the rail.

The brand cluster (logo + "Buku" wordmark) is conditionally rendered — present when expanded, omitted when collapsed — so the toggle centers cleanly in the 64px rail without the wordmark pushing it out of the clipped area. The animated fade applies to the **nav-row labels** (the bulk of the motion); the brand swap is a hard cut hidden behind the simultaneous width animation.

**Header bar and content** (`<header>`, `<main>`) are unchanged.

A `cn` helper (clsx/tailwind-merge) is already used across the codebase (`@/lib/utils`) for conditional classes; use it here.

## i18n — `src/lib/i18n/messages.id.ts`

Add two strings to the `nav` block (a11y labels for the toggle, not visible copy):

```ts
collapseSidebar: 'Ciutkan menu',
expandSidebar: 'Lebarkan menu',
```

## Testing

1. **`preferences` store** (`src/stores/preferences.test.ts`, extend) —
   - defaults `sidebarCollapsed` to `false`;
   - `toggleSidebar()` flips it true then false;
   - `setSidebarCollapsed(true)` persists (`localStorage.getItem('buku.prefs')` contains `"sidebarCollapsed":true`).
   - Extend the existing `afterEach` reset to also reset `sidebarCollapsed: false`.

2. **`AppShell`** (`src/components/common/AppShell.test.tsx`, extend the existing router harness) —
   - the toggle button renders with `aria-label` "Ciutkan menu" and `aria-expanded="true"` when expanded (default);
   - clicking it sets `usePreferences.getState().sidebarCollapsed === true`, and the button's `aria-label` becomes "Lebarkan menu" with `aria-expanded="false"`;
   - nav links remain in the document when collapsed (labels stay in the DOM) — e.g. the "Dasbor" link is still queryable. Reset the store in `afterEach`.
   - The existing AppShell tests (app name, user email, sign-out) stay green (default is expanded; nothing removed from the DOM).

## Verification

- `pnpm test --run` green (existing + new store/shell assertions).
- `pnpm exec tsc --noEmit` clean.
- `pnpm run lint` — no new warnings (pre-existing React-Compiler/RHF warnings excepted).
- `pnpm run build` succeeds.
- Manual: toggle collapses to a 64px icon rail with a smooth ~200ms width animation; labels fade out; chevron rotates; hovering a collapsed icon shows its label tooltip; active item keeps its blue bar; reload preserves the collapsed state; with OS "reduce motion" on, the change is instant. Dark mode unaffected (sidebar is navy in both themes).

## Files

- **Modify:** `src/stores/preferences.ts` (add `sidebarCollapsed` + actions), `src/stores/preferences.test.ts` (assertions).
- **Modify:** `src/components/common/AppShell.tsx` (collapsible rail, toggle, animation, a11y), `src/components/common/AppShell.test.tsx` (toggle assertions).
- **Modify:** `src/lib/i18n/messages.id.ts` (2 `nav` strings).

## Out of scope

- Mobile/responsive behavior (off-canvas drawer, auto-collapse at a breakpoint) — the app is desktop-only and stays so.
- Adopting the unused shadcn `ui/sidebar` primitive — keep the lightweight hand-rolled shell.
- Per-route or remembered-width behavior, resizable drag handle, keyboard shortcut — YAGNI.
- Any change to nav items, routes, the header bar, or content layout.

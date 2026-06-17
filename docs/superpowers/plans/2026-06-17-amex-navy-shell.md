# Amex Theme Phase 3a (Navy Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the `AppShell` sidebar to premium navy using the Phase-1 `--sidebar-*` tokens, with a blue left-bar active state.

**Architecture:** Single-file class swap in `AppShell.tsx` — no new tokens, components, structure, or routes. The navy `--sidebar-*` tokens already exist; this wires the sidebar to them. Header/content/`<main>` unchanged.

**Tech Stack:** React 19, TanStack Router (`activeProps`), Tailwind v4 sidebar tokens, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-17-amex-navy-shell-design.md`

**Branch:** `feat/amex-navy-shell` (already created; spec committed at `1bfabc7`).

**Note:** CSS-only class swaps — no new unit tests; verified by the existing `AppShell.test.tsx` staying green (it asserts on "Buku"/email/content/sign-out, not sidebar classes) + build + a manual both-modes visual smoke.

---

## File Structure

- **Modify:** `src/components/common/AppShell.tsx` (only).

---

## Task 1: Restyle the sidebar to navy

**Files:** Modify `src/components/common/AppShell.tsx`

- [ ] **Step 1: Navy sidebar container**

Change the `<aside>` className:
```tsx
      <aside className="flex w-60 flex-col border-r bg-muted/30">
```
to:
```tsx
      <aside className="flex w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
```

- [ ] **Step 2: White brand icon**

Change the brand icon (the one inside the brand `<div>`, currently `text-primary`):
```tsx
          <BookText className="size-5 text-primary" />
```
to:
```tsx
          <BookText className="size-5 text-sidebar-foreground" />
```
(Leave the `<BookText>` import and the `accounts` nav icon usage untouched — only the brand icon has `text-primary`.)

- [ ] **Step 3: Nav link base class (both occurrences)**

The nav `<Link>` base className appears **twice** — on the mapped links and on the ADMIN audit link, identical strings. Replace **all** occurrences of:
```tsx
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
```
with:
```tsx
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
```

- [ ] **Step 4: Active state (both occurrences)**

The `activeProps` also appears **twice** (mapped links + audit link), identical. Replace **all** occurrences of:
```tsx
              activeProps={{ className: 'bg-primary/10 font-medium text-primary' }}
```
with:
```tsx
              activeProps={{ className: 'bg-sidebar-accent font-medium text-sidebar-foreground shadow-[inset_3px_0_0_var(--sidebar-ring)]' }}
```

- [ ] **Step 5: Verify the existing test + typecheck**

Run: `pnpm exec vitest run src/components/common/AppShell.test.tsx && pnpm exec tsc --noEmit`
Expected: PASS (2 AppShell tests green; 0 tsc errors). The structure/links/email/sign-out are unchanged, so the test is unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/components/common/AppShell.tsx
git commit -m "feat(shell): premium-navy sidebar with blue left-bar active state

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full gate**

Run: `pnpm test --run && pnpm exec tsc --noEmit && pnpm run lint && pnpm run build`
Expected: all tests pass (266), tsc 0 errors, lint 0 errors (pre-existing React-Compiler/RHF warnings only), build succeeds.

- [ ] **Step 2: Manual both-modes visual smoke** (human; the subagent cannot do this)

`pnpm dev`, in **light then dark**:
- Sidebar is navy (`#00175A`); brand "Buku" + icon are white; inactive links are muted light-blue (`#B7C3D9`-ish); hover lightens to a slightly lighter navy.
- The **active** item (the current route) shows the lighter-navy fill **plus a 3px blue bar on its left edge**, with no horizontal shift versus inactive items.
- Header (email, theme toggle, logout) and the content area stay bright; cards/tables look unchanged.
- In **dark mode**, the navy sidebar sits on the navy-deep page cleanly (subtle contrast); nav focus rings are still visible when tabbing.

- [ ] **Step 3: Commit any smoke fixes** (skip if none)

```bash
git add -A
git commit -m "fix(shell): navy sidebar visual smoke adjustments

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Only `AppShell.tsx` changes. Do NOT touch the dashboard, install Motion, or do the 44px/focus a11y sweep — those are sub-phases 3b/3c.
- The `--sidebar-*` tokens already exist (Phase 1); do not redefine them.
- Steps 3 and 4 each replace **two identical occurrences** — use a replace-all so both the mapped nav links and the audit link get the new styling.

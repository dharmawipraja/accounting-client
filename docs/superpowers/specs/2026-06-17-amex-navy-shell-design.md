# Amex Theme — Phase 3a: Navy Shell — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming)
**Scope:** Phase 3a of the Amex revamp (`/DESIGN.md`). Restyle the app shell's sidebar to premium navy. Single-file component change.

## Goal

Turn the `AppShell` sidebar into Amex's premium-navy nav (the most recognizable Amex moment) by wiring it to the navy `--sidebar-*` tokens set in Phase 1, with a blue left-bar active state. Content/header stay bright.

## Background

- `src/components/common/AppShell.tsx` renders a custom sidebar: `<aside className="flex w-60 flex-col border-r bg-muted/30">` with nav `<Link>`s styled `text-muted-foreground hover:bg-muted hover:text-foreground` and `activeProps={{ className: 'bg-primary/10 font-medium text-primary' }}`. Brand = `BookText` (`text-primary`) + "Buku". A right-aligned `h-14` header holds the user email + `ThemeToggle` + logout. `<main className="p-6">` holds content on the `--background` soft-grey.
- Phase 1 already set the navy `--sidebar*` tokens (`--sidebar: #00175A`, `--sidebar-foreground: #FFFFFF`, `--sidebar-accent: #12306F`, `--sidebar-ring: #4DA3E8`, `--sidebar-border: rgba(255,255,255,0.10)`), **but `AppShell` doesn't use them** — it uses generic `muted` utilities. So this is purely a class swap.

## Decisions (from brainstorming)

- **Active-link style: B — blue left-bar** (lighter-navy fill + a 3px Amex-blue inset bar, no layout shift).
- Header + content + `<main>` **unchanged** (Amex keeps content bright beside premium-navy nav).
- Brand icon → white (no blue chip).
- Nav rows bumped toward ~40px now; the full 44px touch-target audit lands in **3c**.
- Dark mode needs nothing mode-specific (the `--sidebar*` tokens are navy in both modes).

## Changes — `src/components/common/AppShell.tsx`

- **`<aside>`:** `"flex w-60 flex-col border-r bg-muted/30"` → `"flex w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"`.
- **Brand icon:** `<BookText className="size-5 text-primary" />` → `<BookText className="size-5 text-sidebar-foreground" />`. The `<span>` "Buku" already inherits text color (now white).
- **Nav `<Link>` base class** (both the mapped links and the audit link): `"flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"` → `"flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"`.
- **Active state** (both `activeProps`): `{ className: 'bg-primary/10 font-medium text-primary' }` → `{ className: 'bg-sidebar-accent font-medium text-sidebar-foreground shadow-[inset_3px_0_0_var(--sidebar-ring)]' }`.

No other lines change. The nav array, links, hydration, header, and `<main>` stay identical.

## Dark mode

Free: `--sidebar*` tokens are navy in both light and dark, so the navy sidebar (`#00175A`) sits on the navy-deep page (`#000C3D`) in dark mode — a subtle on-brand contrast. Nothing mode-specific to add.

## Testing

CSS-only class swaps; logic and structure untouched.
- `src/components/common/AppShell.test.tsx` stays green (it asserts on nav links/structure, not sidebar classes).
- `pnpm test --run` + `tsc` + `lint` + `build` all green.
- **Manual both-modes visual smoke:** navy sidebar with white brand + `#B7C3D9`-ish inactive links; the active item shows the lighter-navy fill + 3px blue left bar; hover lightens; header/content stay bright; dark mode reads navy-on-navy-deep cleanly; focus rings on nav links remain visible.

## Files

- **Modify:** `src/components/common/AppShell.tsx` (only).

## Out of scope (later sub-phases)

- **3b:** dashboard recomposition (financial prominence, layout rhythm).
- **3c:** Motion (install `motion` + subtle animations + reduced-motion), full 44px touch-target / focus a11y sweep, per-page polish.
- No nav/route/IA changes; no header redesign; no new tokens or components.

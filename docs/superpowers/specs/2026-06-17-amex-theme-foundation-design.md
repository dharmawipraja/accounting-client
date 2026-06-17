# Amex Theme — Phase 1: Foundation (Tokens + Type + CLAUDE.md) — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming)
**Scope:** Phase 1 of a multi-phase UI revamp to the American Express visual language defined in `/DESIGN.md`. This phase is the **token foundation only**.

## Goal

Re-skin the entire app to the Amex visual language by swapping the design-token layer (colors, type, radius, shadows) in `src/index.css`, switching the typeface to Public Sans, and creating a `CLAUDE.md` that makes every future AI session aware of `DESIGN.md`. Because every shadcn/ui component reads these CSS variables, this single change visibly transforms the whole app (buttons, cards, inputs, dialogs, tables, focus rings) without touching component code.

## Background & framing

- `/DESIGN.md` contains two parts: (1) an **American Express design system** (Amex Blue `#006FCF`, deep navy `#00175A`, Benton Sans, tokens, a11y) — the real reference; and (2) a generic **"anti-slop frontend" skill** that **explicitly excludes dashboards, data tables, and multi-step product UI** (its own Section 13). Our app is exactly that excluded class, so only the skill's token/a11y/interactive-state/form/consistency/em-dash/reduced-motion guidance applies; its hero/marquee/GSAP/bento/image rules do not.
- Treat this as a **redesign-preserve**: keep IA, routes, nav labels, and form fields stable (DESIGN.md §11). This is a re-skin, not a rebuild.
- Current state: shadcn/ui + Tailwind v4 with OKLCH CSS variables in `src/index.css` (`:root` light, `.dark` dark), `@theme inline` mapping `--color-*` → `var(--*)`, `--radius: 0.625rem`, Geist Variable font, JetBrains Mono for money. A working theme toggle (`useTheme`, `.dark` class) exists.

## Decisions (from brainstorming)

1. **Typeface:** Public Sans (free, Franklin-Gothic lineage, self-hosted via `@fontsource-variable/public-sans`). Replaces Geist.
2. **Dark mode:** keep it, re-themed as Amex **premium navy** (navy-deep page bg, navy cards, Amex-blue accents, white/`#B7C3D9` text).
3. **Icons:** keep `lucide-react` (no switch to Phosphor).
4. **Animation:** add the **Motion** library (`motion`) for subtle, motivated motion — but in a **later phase**, not Phase 1.
5. **Navy sidebar:** confirmed as the shell treatment, but implemented in **Phase 3** (`AppShell` uses utility classes, not the `--sidebar` tokens).
6. **Money figures:** move from `font-mono` (JetBrains Mono) to the body font (Public Sans) at weight 600 with tabular figures, per Amex typography.

## A. Typeface

- Add dependency `@fontsource-variable/public-sans`.
- In `src/index.css`: replace `@import "@fontsource-variable/geist";` with `@import "@fontsource-variable/public-sans";`, and set `--font-sans: 'Public Sans Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif;` in the `@theme inline` block. `--font-heading` already inherits from `--font-sans`. Leave `--font-mono` as-is (still used by code/refs, not money).
- Money components use Public Sans + tabular figures (see §D).

## B. Color tokens → `src/index.css`

Rewrite `:root` and `.dark` to the Amex palette (hex; valid in Tailwind v4). New `--success` / `--warning` tokens are added (the app's `StatusBadge` needs them; wired in Phase 2). `--radius: 0.5rem` (Amex md = 8px).

### `:root` (light)

```
--radius: 0.5rem;
--background: #F7F8F9;            --foreground: #1A1A1A;
--card: #FFFFFF;                  --card-foreground: #1A1A1A;
--popover: #FFFFFF;              --popover-foreground: #1A1A1A;
--primary: #006FCF;              --primary-foreground: #FFFFFF;
--secondary: #ECEDEE;           --secondary-foreground: #1A1A1A;
--muted: #ECEDEE;               --muted-foreground: #53565A;
--accent: #EAF3FC;              --accent-foreground: #00509E;
--destructive: #C52720;         --destructive-foreground: #FFFFFF;
--success: #00875A;             --success-foreground: #FFFFFF;     /* new */
--warning: #B95000;             --warning-foreground: #FFFFFF;     /* new */
--border: #D5D9DC;              --input: #D5D9DC;                  --ring: #006FCF;
--sidebar: #00175A;             --sidebar-foreground: #FFFFFF;
--sidebar-primary: #1374D4;     --sidebar-primary-foreground: #FFFFFF;
--sidebar-accent: #12306F;      --sidebar-accent-foreground: #FFFFFF;
--sidebar-border: rgba(255,255,255,0.10);  --sidebar-ring: #4DA3E8;
--chart-1: #006FCF; --chart-2: #1374D4; --chart-3: #00175A; --chart-4: #53565A; --chart-5: #86888C;
```

### `.dark` (premium navy)

```
--background: #000C3D;           --foreground: #FFFFFF;
--card: #00175A;                 --card-foreground: #FFFFFF;
--popover: #00175A;             --popover-foreground: #FFFFFF;
--primary: #1374D4;             --primary-foreground: #FFFFFF;
--secondary: #0A2466;           --secondary-foreground: #FFFFFF;
--muted: #0A2466;               --muted-foreground: #B7C3D9;
--accent: #12306F;              --accent-foreground: #FFFFFF;
--destructive: #E5685F;         --destructive-foreground: #1A1A1A;
--success: #2FA37A;             --success-foreground: #00130C;
--warning: #D9772E;             --warning-foreground: #1A1A1A;
--border: rgba(255,255,255,0.12);  --input: rgba(255,255,255,0.15);  --ring: #4DA3E8;
--sidebar: #00175A;             --sidebar-foreground: #FFFFFF;
--sidebar-primary: #1374D4;     --sidebar-primary-foreground: #FFFFFF;
--sidebar-accent: #12306F;      --sidebar-accent-foreground: #FFFFFF;
--sidebar-border: rgba(255,255,255,0.10);  --sidebar-ring: #4DA3E8;
--chart-1: #4DA3E8; --chart-2: #1374D4; --chart-3: #B7C3D9; --chart-4: #86888C; --chart-5: #53565A;
```

**Contrast note (verify in implementation, DESIGN.md §Accessibility):** white-on-`#006FCF` = 4.6:1 (AA); white-on-navy = 15.4:1 (AAA); ink-on-surface = 17:1 (AAA). For solid semantic fills the foreground (`--*-foreground`) is chosen for AA — confirm `--warning-foreground`/`--destructive-foreground` against their dark-mode fills during build and adjust if a pairing dips below 4.5:1.

## C. `@theme` additions (Tailwind utilities)

In the `@theme inline` block add:
```
--color-success: var(--success);  --color-success-foreground: var(--success-foreground);
--color-warning: var(--warning);  --color-warning-foreground: var(--warning-foreground);
```
so `bg-success` / `text-warning` etc. exist for `StatusBadge` (Phase 2). Add navy-tinted shadow tokens and map Tailwind's shadow scale to them:
```
--shadow-2xs: 0 1px 2px rgba(0,23,90,0.06);
--shadow-xs:  0 1px 3px rgba(0,23,90,0.08);
--shadow-sm:  0 1px 4px rgba(0,23,90,0.10);   /* Amex card */
--shadow:     0 1px 4px rgba(0,23,90,0.10);
--shadow-md:  0 4px 14px rgba(0,23,90,0.12);
--shadow-lg:  0 6px 24px rgba(0,23,90,0.16);  /* Amex elevated */
```
(Shadows are primarily a light-mode depth device; in dark navy they recede, which is correct — dark depth comes from surface lightness steps.)

## D. Money components (tabular figures, body font)

- `src/components/common/MoneyText.tsx`: change `className="font-mono tabular-nums"` → `className="tabular-nums font-semibold"` (Public Sans, weight 600, tabular — per Amex). Logic unchanged.
- `src/components/common/MoneyInput.tsx`: apply `tabular-nums` to the input text (drop any `font-mono`), keep behavior.

## E. `CLAUDE.md` (new, repo root)

Create `CLAUDE.md` so every future session auto-loads design intent. Contents:
- **Project one-liner** + stack (React 19/TS strict, TanStack Router+Query, shadcn/ui, Tailwind v4, zod, decimal.js, Vitest/RTL/MSW).
- **Design system:** "Follow `/DESIGN.md` (American Express visual language). Apply the Amex **design tokens** — colors live as CSS variables in `src/index.css`, type is Public Sans, 8px radius, navy-tinted shadows, money uses tabular figures."
- **Critical caveat (verbatim intent):** "`DESIGN.md` bundles a generic 'anti-slop frontend' skill scoped to landing pages/portfolios. This app is a **data-dense accounting product** (dashboards, data tables, multi-step forms) — that skill's Section 13 lists it as out of scope. Apply only its **tokens, accessibility, interactive-states, form/table, color/shape-consistency, em-dash ban, and reduced-motion** guidance. **Ignore** its hero / marquee / GSAP / bento / image-strategy / landing-page rules."
- **Non-negotiables already in the app:** money via decimal.js (never float); all UI strings via `useT` (Indonesian); status via icon+text, never color alone; `QueryState` for loading/error/not-found; pre-existing React-Compiler/RHF lint warnings are expected.
- **Commands:** `pnpm test --run`, `pnpm exec tsc --noEmit`, `pnpm run lint`, `pnpm run build`.

## What re-skins automatically vs. deferred

- **Automatic (token-driven, no component edits):** buttons, cards, dialogs, inputs, selects, popovers, dropdowns, tabs, separators, table borders, focus rings, skeleton/muted surfaces → all shift to Amex blue / navy / Public Sans immediately, in both modes.
- **Deferred:** navy sidebar + premium header → **Phase 2/3** (`AppShell`); `StatusBadge` semantic-chip tuning to `--success`/`--warning` with icon+text → **Phase 2**; Motion animations → **Phase 3**; per-page polish (dashboard prominence, 44px targets, spacing rhythm) → **Phase 3**.

## Files

- **Modify:** `src/index.css` (tokens, radius, shadows, `@theme`, font import), `src/components/common/MoneyText.tsx`, `src/components/common/MoneyInput.tsx`, `package.json` (`@fontsource-variable/public-sans`).
- **Create:** `CLAUDE.md`.

## Testing / verification

Token changes are CSS-only; application logic is untouched, so **no new unit tests**. Verification:
- Existing suite green (`pnpm test --run` — 259 passing), `tsc` clean, `lint` 0 errors, `build` succeeds.
- **Manual visual smoke in BOTH light and dark** (DESIGN.md mandates checking both modes): a list page, a detail/editor, a dialog, the dashboard, and a status chip — confirm Amex blue primary, navy dark surfaces, Public Sans, tabular money, visible focus rings.
- One optional guard test asserting `index.css` exposes `--primary: #006FCF` is low-value and omitted unless requested.

## Out of scope (later phases)

- **Phase 2:** component tuning (`Button` press states, `StatusBadge` semantic chips, `Card`/`Table` spacing to Amex rhythm).
- **Phase 3:** navy `AppShell` (sidebar + header), dashboard recomposition, Motion animations, 44px touch-target/a11y sweep, per-page polish.
- No IA / route / nav-label / form-field changes (redesign-preserve).
- No icon-library or font-beyond-Public-Sans changes.

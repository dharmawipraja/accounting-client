# Amex Theme Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the whole app to the American Express visual language by swapping the design-token layer in `src/index.css`, switching to Public Sans, and creating `CLAUDE.md`.

**Architecture:** Pure token-layer change. shadcn/ui components read CSS variables, so rewriting `:root` / `.dark` / `@theme` re-skins every component at once with no component-code changes (light + premium-navy dark). Money components switch from mono to Public-Sans tabular figures.

**Tech Stack:** Tailwind v4 + shadcn/ui CSS variables, `@fontsource-variable/public-sans`, Vite 8/Rolldown.

**Spec:** `docs/superpowers/specs/2026-06-17-amex-theme-foundation-design.md`

**Branch:** `feat/amex-theme-foundation` (already created; spec committed at `29b08ad`).

**Note on testing:** This phase is CSS-only — application logic is untouched, so most tasks verify via `pnpm run build` (Tailwind compiles tokens) + the existing suite staying green, not new unit tests. Final task includes a manual both-modes visual smoke.

---

## File Structure

- **Modify:** `src/index.css` (font import, `:root`, `.dark`, `@theme inline`), `src/components/common/MoneyText.tsx`, `src/components/common/MoneyInput.tsx`, `package.json` (add Public Sans, remove Geist).
- **Create:** `CLAUDE.md` (repo root).

---

## Task 1: Install + wire Public Sans

**Files:**
- Modify: `package.json` (via pnpm)
- Modify: `src/index.css:4` (import) and the `--font-sans` line in `@theme`

- [ ] **Step 1: Install Public Sans, remove Geist**

```bash
pnpm add @fontsource-variable/public-sans
pnpm remove @fontsource-variable/geist
```

- [ ] **Step 2: Swap the font import**

In `src/index.css`, replace line 4:
```css
@import "@fontsource-variable/geist";
```
with:
```css
@import "@fontsource-variable/public-sans";
```

- [ ] **Step 3: Point `--font-sans` at Public Sans**

In `src/index.css`, in the `@theme inline` block, replace:
```css
  --font-sans: 'Geist Variable', sans-serif;
```
with:
```css
  --font-sans: 'Public Sans Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif;
```

- [ ] **Step 4: Verify build + font**

Run: `pnpm run build`
Expected: builds clean. Then `pnpm dev` and confirm body text renders in Public Sans (a humanist grotesque, distinct from Geist). If text falls back to Helvetica/Arial, the family name is wrong — check `node_modules/@fontsource-variable/public-sans/index.css` for the exact `font-family` and match it.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/index.css
git commit -m "feat(theme): switch typeface to Public Sans

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Light tokens (`:root`)

**Files:**
- Modify: `src/index.css` (the `:root { … }` block)

- [ ] **Step 1: Replace the `:root` block**

In `src/index.css`, replace the entire `:root { … }` block (starts at line ~8, ends at the closing `}` before `.dark`) with:

```css
:root {
  --radius: 0.5rem;
  --background: #F7F8F9;
  --foreground: #1A1A1A;
  --card: #FFFFFF;
  --card-foreground: #1A1A1A;
  --popover: #FFFFFF;
  --popover-foreground: #1A1A1A;
  --primary: #006FCF;
  --primary-foreground: #FFFFFF;
  --secondary: #ECEDEE;
  --secondary-foreground: #1A1A1A;
  --muted: #ECEDEE;
  --muted-foreground: #53565A;
  --accent: #EAF3FC;
  --accent-foreground: #00509E;
  --destructive: #C52720;
  --destructive-foreground: #FFFFFF;
  --success: #00875A;
  --success-foreground: #FFFFFF;
  --warning: #B95000;
  --warning-foreground: #FFFFFF;
  --border: #D5D9DC;
  --input: #D5D9DC;
  --ring: #006FCF;
  --sidebar: #00175A;
  --sidebar-foreground: #FFFFFF;
  --sidebar-primary: #1374D4;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #12306F;
  --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: rgba(255, 255, 255, 0.10);
  --sidebar-ring: #4DA3E8;
  --chart-1: #006FCF;
  --chart-2: #1374D4;
  --chart-3: #00175A;
  --chart-4: #53565A;
  --chart-5: #86888C;
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm run build`
Expected: builds clean. `pnpm dev` → light mode shows Amex blue primary buttons, white cards on `#F7F8F9`, blue focus rings.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): Amex light color tokens

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Dark tokens (`.dark`) — premium navy

**Files:**
- Modify: `src/index.css` (the `.dark { … }` block)

- [ ] **Step 1: Replace the `.dark` block**

In `src/index.css`, replace the entire `.dark { … }` block with:

```css
.dark {
  --background: #000C3D;
  --foreground: #FFFFFF;
  --card: #00175A;
  --card-foreground: #FFFFFF;
  --popover: #00175A;
  --popover-foreground: #FFFFFF;
  --primary: #1374D4;
  --primary-foreground: #FFFFFF;
  --secondary: #0A2466;
  --secondary-foreground: #FFFFFF;
  --muted: #0A2466;
  --muted-foreground: #B7C3D9;
  --accent: #12306F;
  --accent-foreground: #FFFFFF;
  --destructive: #E5685F;
  --destructive-foreground: #1A1A1A;
  --success: #2FA37A;
  --success-foreground: #00130C;
  --warning: #D9772E;
  --warning-foreground: #1A1A1A;
  --border: rgba(255, 255, 255, 0.12);
  --input: rgba(255, 255, 255, 0.15);
  --ring: #4DA3E8;
  --sidebar: #00175A;
  --sidebar-foreground: #FFFFFF;
  --sidebar-primary: #1374D4;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #12306F;
  --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: rgba(255, 255, 255, 0.10);
  --sidebar-ring: #4DA3E8;
  --chart-1: #4DA3E8;
  --chart-2: #1374D4;
  --chart-3: #B7C3D9;
  --chart-4: #86888C;
  --chart-5: #53565A;
}
```

- [ ] **Step 2: Verify build + dark mode**

Run: `pnpm run build`
Expected: builds clean. `pnpm dev`, toggle dark mode → page is deep navy (`#000C3D`), cards are navy (`#00175A`), text white, primary a brighter blue.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): premium-navy dark color tokens

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `@theme` — semantic utilities + navy-tinted shadows

**Files:**
- Modify: `src/index.css` (the `@theme inline { … }` block)

- [ ] **Step 1: Add `success`/`warning` color utilities**

In `src/index.css`, inside `@theme inline`, immediately after the line:
```css
  --color-destructive-foreground: var(--destructive-foreground);
```
insert:
```css
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
```

- [ ] **Step 2: Add navy-tinted shadow scale**

In `src/index.css`, inside `@theme inline`, immediately before its closing `}` (after the last `--radius-*` line), insert:
```css
  --shadow-2xs: 0 1px 2px rgba(0, 23, 90, 0.06);
  --shadow-xs: 0 1px 3px rgba(0, 23, 90, 0.08);
  --shadow-sm: 0 1px 4px rgba(0, 23, 90, 0.10);
  --shadow: 0 1px 4px rgba(0, 23, 90, 0.10);
  --shadow-md: 0 4px 14px rgba(0, 23, 90, 0.12);
  --shadow-lg: 0 6px 24px rgba(0, 23, 90, 0.16);
  --shadow-xl: 0 12px 32px rgba(0, 23, 90, 0.18);
```

- [ ] **Step 3: Verify the new utilities compile**

Run: `pnpm run build`
Expected: builds clean. Sanity-check that `bg-success` / `text-warning` resolve: temporarily add `<div className="bg-success text-warning">x</div>` somewhere, run `pnpm dev`, confirm green bg + orange text, then remove it. (Or trust the build — `@theme` color vars always generate utilities.)

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): success/warning utilities + navy-tinted shadow scale

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Money figures → Public Sans tabular

**Files:**
- Modify: `src/components/common/MoneyText.tsx`
- Modify: `src/components/common/MoneyInput.tsx`

- [ ] **Step 1: `MoneyText` — drop mono, weight 600**

Replace the `<span>` line in `src/components/common/MoneyText.tsx`:
```tsx
    <span className="font-mono tabular-nums">{Money.from(value).toRupiah()}</span>
```
with:
```tsx
    <span className="tabular-nums font-semibold">{Money.from(value).toRupiah()}</span>
```

- [ ] **Step 2: `MoneyInput` — drop mono**

In `src/components/common/MoneyInput.tsx`, change the `Input` className:
```tsx
      className="text-right font-mono tabular-nums"
```
to:
```tsx
      className="text-right tabular-nums"
```

- [ ] **Step 3: Run the money tests**

Run: `pnpm exec vitest run src/components/common/MoneyText.test.tsx src/components/common/MoneyInput.test.tsx`
Expected: PASS. If a test asserts the `font-mono` class specifically (it shouldn't — these tests check formatting/filtering behavior), update that assertion to `tabular-nums`; do NOT weaken behavior assertions.

- [ ] **Step 4: Commit**

```bash
git add src/components/common/MoneyText.tsx src/components/common/MoneyInput.tsx
git commit -m "feat(theme): money figures use Public Sans tabular (per Amex)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Create `CLAUDE.md`

**Files:**
- Create: `CLAUDE.md` (repo root)

- [ ] **Step 1: Write the file**

Create `CLAUDE.md` with exactly this content:

```markdown
# Buku — Indonesian Accounting Client

React 19 (+ React Compiler) · TypeScript strict · TanStack Router (file-based) + Query v5 · shadcn/ui · Tailwind v4 · zod v4 · decimal.js · Vitest 4 + RTL + MSW v2. Package manager: pnpm.

## Design system

Follow **`/DESIGN.md`** (American Express visual language). Apply the Amex **design tokens**: colors are CSS variables in `src/index.css` (`:root` light, `.dark` premium-navy); the typeface is **Public Sans**; radius is 8px; shadows are navy-tinted; money uses **tabular figures** at weight 600. Amex Blue `#006FCF` is the single action/accent color; deep navy `#00175A` is the premium surface (sidebar, dark mode). Use the semantic tokens (`--success`, `--warning`, `--destructive`) — never raw hex in components.

### CRITICAL caveat about DESIGN.md

`DESIGN.md` bundles a generic "anti-slop frontend" skill **scoped to landing pages and portfolios**. This app is a **data-dense accounting product** (dashboards, data tables, multi-step forms) — that skill's own Section 13 lists this app type as **out of scope**. Apply only its **design tokens, accessibility, interactive states, form/table patterns, color/shape-consistency, the em-dash ban, and reduced-motion** guidance. **Ignore** its hero / marquee / GSAP / bento / image-strategy / centered-hero / landing-page rules — they do not apply here.

## Non-negotiable conventions

- **Money:** decimal.js via `Money` (`src/lib/money/money.ts`); never JavaScript floats. Display with `MoneyText` / `MoneyInput` (tabular figures).
- **i18n:** every user-facing string goes through `useT()` (`src/lib/i18n/messages.id.ts`, Indonesian). No hardcoded copy. No em-dashes in UI strings.
- **Status:** convey state with icon + text, never color alone (a11y).
- **Async UI:** wrap query rendering in `QueryState` (loading → not-found → error → data); use the composed skeletons + `ErrorState` + `NotFound`. See `src/components/common/`.
- **Motion:** the `motion` library is used for subtle, motivated animation only (120–240ms eased, respect `prefers-reduced-motion`). Icons stay on `lucide-react`.
- **Redesign-preserve:** do not change routes, nav labels, or form-field names as part of styling work.
- Pre-existing ESLint warnings about React Compiler / react-hook-form incompatibility are expected — do not "fix" them.

## Commands

- Tests: `pnpm test --run` · Typecheck: `pnpm exec tsc --noEmit` · Lint: `pnpm run lint` · Build: `pnpm run build`
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md referencing DESIGN.md with data-app caveat

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full quality gate**

Run: `pnpm test --run && pnpm exec tsc --noEmit && pnpm run lint && pnpm run build`
Expected: all tests pass (259+), tsc 0 errors, lint 0 errors (pre-existing React-Compiler/RHF warnings only), build succeeds.

- [ ] **Step 2: Manual both-modes visual smoke** (DESIGN.md mandates checking both)

Run `pnpm dev` and, in **light then dark**, verify on: a list page (e.g. Faktur Penjualan), a detail/editor, an open dialog, the dashboard, and a status chip —
- Light: Amex-blue primary buttons, white cards on `#F7F8F9`, Public Sans, tabular money, 2px blue focus ring on inputs.
- Dark: deep-navy page, navy cards, white text, brighter-blue primary, focus ring visible.
- No element is unreadable (low contrast) in either mode; fix any `--*-foreground` pairing that looks washed out.

- [ ] **Step 3: Commit any smoke fixes**

```bash
git add -A
git commit -m "fix(theme): contrast/visual adjustments from both-modes smoke

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
(Skip if no fixes were needed.)

---

## Notes for the implementer

- This is the **foundation phase**. Do NOT restyle `AppShell` (navy sidebar), `StatusBadge`, add Motion, or polish individual pages — those are Phases 2/3.
- Keep all changes token-level; do not edit shadcn component files in `src/components/ui/`.
- The whole-app re-skin is expected to "just happen" from the token swap — that's the design, not a surprise.

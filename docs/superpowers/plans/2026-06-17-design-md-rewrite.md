# Rewrite DESIGN.md as the Buku Design System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Amex-brand `DESIGN.md` (+ bundled landing-page skill) with a focused Buku Design System doc accurate to what's shipped, and update `CLAUDE.md`'s reference.

**Architecture:** Documentation only. Overwrite `DESIGN.md` with the content below (token frontmatter mirrors `src/index.css`); make two edits to `CLAUDE.md`. No application code changes.

**Tech Stack:** Markdown docs (no build/test impact).

**Spec:** `docs/superpowers/specs/2026-06-17-design-md-rewrite-design.md`

**Branch:** `docs/design-md-rewrite` (already created; spec committed at `edfb944`).

---

## File Structure

- **Modify (full rewrite):** `DESIGN.md` (repo root).
- **Modify:** `CLAUDE.md` (repo root).

---

## Task 1: Rewrite `DESIGN.md`

**Files:** Overwrite `DESIGN.md` (repo root)

- [ ] **Step 1: Overwrite `DESIGN.md` with exactly this content**

```markdown
# Buku Design System

> Design reference for **Buku**, a single-company Indonesian accounting web client (SAK/PSAK). This is the source of truth for all UI in this app. Tokens mirror `src/index.css`; components live in `src/components/**`. When in doubt, the code is canonical.

<design-tokens>
name: Buku Design System
description: "A calm, institutional financial UI: institutional blue for action, deep navy for premium surfaces and dark mode, Public Sans for legible figures, generous restrained spacing, and absolute clarity for high-stakes accounting data."

colors:
  light:
    primary: "#006FCF"            # action + accent (the sole accent colour)
    primary-foreground: "#FFFFFF"
    background: "#F7F8F9"          # page (soft grey)
    foreground: "#1A1A1A"         # ink
    card: "#FFFFFF"
    muted: "#ECEDEE"
    muted-foreground: "#53565A"
    accent: "#EAF3FC"             # blue-tinted hover
    accent-foreground: "#00509E"
    border: "#D5D9DC"
    ring: "#006FCF"               # focus
    success: "#00875A"
    warning: "#B95000"
    destructive: "#C52720"        # error
    sidebar: "#00175A"            # navy nav surface
    sidebar-foreground: "#FFFFFF"
    sidebar-accent: "#12306F"     # active/hover fill
    sidebar-ring: "#4DA3E8"       # active left-bar + focus on navy
  dark:                           # premium navy (not a grey inversion)
    background: "#000C3D"
    foreground: "#FFFFFF"
    card: "#00175A"
    primary: "#1374D4"
    muted: "#0A2466"
    muted-foreground: "#B7C3D9"
    success: "#2FA37A"
    warning: "#D9772E"
    destructive: "#E5685F"
    ring: "#4DA3E8"
    sidebar: "#00175A"            # navy in both modes

typography:
  fontFamily: "Public Sans Variable, Helvetica Neue, Helvetica, Arial, sans-serif"
  mono: "JetBrains Mono, ui-monospace, monospace"
  body: { size: 16px, weight: 400, lineHeight: 1.55 }
  display: { size: 28-40px, weight: 600, letterSpacing: -0.01em }
  money: { weight: 600, figures: tabular }     # via MoneyText / MoneyInput

spacing: { base: 8px, scale: [4, 8, 12, 16, 24, 32, 48, 64] }
radius: { base: 8px, sm: 4px, md: 6px, lg: 8px }     # --radius: 0.5rem
shadows:
  card: "0 1px 4px rgba(0,23,90,0.10)"             # navy-tinted
  elevated: "0 6px 24px rgba(0,23,90,0.16)"
motion: { duration: 120-240ms, easing: "cubic-bezier(0.4,0,0.2,1)" }   # never bouncy; honor prefers-reduced-motion
</design-tokens>

Use this design system for all UI in this app.

---

## 1. Atmosphere

Buku is the accounting system of record for a single company. It feels composed, institutional, and premium, not startup-loud. Institutional **blue** (`#006FCF`) is the one action and identity colour; deep **navy** (`#00175A`) is the premium surface, carrying the sidebar and the entire dark mode. Content sits in clean white cards on a soft grey page, with generous, restrained spacing. Restraint is the point: high-value financial decisions deserve calm, legible, unambiguous screens, not ornament. The institutional-blue palette follows the long lineage of finance brand equity.

## 2. Colour

Use the **semantic tokens** in components (`bg-primary`, `text-muted-foreground`, `bg-success/10`, ...), never raw hex. Tokens are CSS variables in `src/index.css` (`:root` light, `.dark` premium-navy), exposed as Tailwind utilities via `@theme`.

- **Primary** `#006FCF`: buttons, links, focus rings, the brand mark. The sole accent; do not introduce a second.
- **Navy** `#00175A` / deep `#000C3D`: the sidebar, premium surfaces, and the dark-mode page and cards. White and `#B7C3D9` text on navy.
- **Surfaces**: page `#F7F8F9`, cards `#FFFFFF`, nested/muted `#ECEDEE`, borders `#D5D9DC`.
- **Semantic**: success `#00875A`, warning `#B95000`, error `#C52720`, info = primary blue. Each pairs with an icon and text, never colour alone.
- **Dark mode** is premium navy, not a grey inversion: navy-deep page, navy cards, brighter-blue primary, lighter semantic tones for contrast.

## 3. Typography

**Public Sans**, a free open Franklin-gothic grotesque self-hosted via `@fontsource-variable/public-sans`: measured, highly legible, institutional. Body 16px / 1.55; display 28-40px, weight 600, slightly tight tracking. **Monetary figures and account numbers use weight 600 with tabular figures** so amounts align in tables and summaries, always via `MoneyText` / `MoneyInput`, never raw floats.

## 4. Spacing & layout

An 8px base grid with generous spacing. The **app shell** is a fixed **navy sidebar beside bright content**: the navy `#00175A` left nav (active item = a lighter-navy fill plus a 3px blue left-bar, no layout shift) next to a white header and a soft-grey content area holding white cards. Cards use roughly 24px padding, an 8px radius, and a soft navy-tinted shadow. Data-table rows are comfortably tall (~56px) with right-aligned tabular amounts. Whitespace signals quality; screens never feel crowded.

## 5. Components & patterns

- **Sidebar nav**: navy surface, white brand, muted-blue links; active = blue left-bar (from the `--sidebar-*` tokens).
- **Dashboard hero**: a navy premium panel showing the financial position, with Total Aset dominant and `Kewajiban = Ekuitas` (the accounting equation) as supporting figures.
- **Summary cards**: title + tabular figure + hint, each with its own loading and error/retry state.
- **Status chips** (`StatusChip` + the domain mappers in `src/components/common/statusChips.tsx`): pill chips that always pair an **icon and text** with a semantic tone, never colour alone:
  - Document (invoice/bill/payment): DRAFT → neutral, POSTED → success, VOID → error.
  - Payment status: UNPAID → neutral, PARTIAL → warning, PAID → success.
  - Journal (incl. REVERSED), period (OPEN → success / CLOSED → neutral), payment direction → info, active/inactive.
- **Data tables** (`DataTable`): taller rows, tabular money, `EmptyState` when empty.
- **Forms**: label above input, helper/error text below, inline field errors mapped from the API (`applyApiErrorToForm`); action errors as toasts (`toastApiError`). Never placeholder-as-label.
- **Dialogs / overlays**: shadcn + Radix, with built-in open/close animations.
- **Async states**: wrap query rendering in **`QueryState`** (loading → record-not-found → error+retry → data) using the composed shimmer skeletons + `ErrorState` + `NotFound`.
- **Buttons**: blue primary (white text, restrained radius, a darker pressed tone on `:active`); blue-outline ghost for secondary; one primary action per screen.

## 6. Motion

Calm and motivated only. Overlays (dialogs, menus, tooltips) animate open/close via `tw-animate-css`. Content entrance is a subtle fade and rise (the `Reveal` primitive, used on the dashboard). All motion is 120-240ms eased, never bouncy, and **collapses to instant under `prefers-reduced-motion`**.

## 7. Accessibility

- **Contrast**: white-on-`#006FCF` 4.6:1 (AA), white-on-navy 15.4:1 (AAA), ink-on-surface ~17:1 (AAA). Prefer blue for fills and large text; use the darker `#00509E` where small blue text is unavoidable.
- **Focus**: a visible focus ring on every control and custom link (blue on light, light-blue `--sidebar-ring` on navy).
- **Status**: conveyed with icon and text, never colour alone.
- **Touch targets**: 32px controls exceed WCAG 2.2 AA (24px minimum); 44px (AAA) is intentionally not pursued for this dense desktop tool.
- **Motion**: `prefers-reduced-motion` is always honoured.

## 8. Principles for future UI work

- **Full interactive states.** Every data view handles loading, empty, error, and not-found, via `QueryState` + the composed skeletons. Never a bare spinner or a success-only screen.
- **Consistency locks.** One accent colour (blue), one radius scale (8px). Do not add a second accent or mixed corner radii.
- **No em-dashes** in user-facing copy; use a comma, period, or parentheses.
- **Real components, real data.** No `<div>` fake screenshots, no placeholder/lorem text, no fake-precise numbers in shipped UI.
- **Motion must be motivated** (feedback, hierarchy, or a state change) and reduced-motion-safe. No animation for its own sake.
- **YAGNI.** Build the state or variant a screen actually needs.
- **i18n and money discipline.** Every string via `useT()` (Indonesian); every amount via decimal.js (`Money`) and `MoneyText`.
- **Redesign-preserve.** Styling work must not change routes, nav labels, or form-field names.
```

- [ ] **Step 2: Verify the token values match `src/index.css`**

Open `src/index.css` and confirm the frontmatter values are accurate (e.g. `--primary: #006FCF`, `--sidebar: #00175A`, `--sidebar-ring: #4DA3E8`, `.dark --background: #000C3D`, `--radius: 0.5rem`, `--shadow-sm: 0 1px 4px rgba(0,23,90,0.10)`, `--font-sans: 'Public Sans Variable'…`). Fix any drift.

- [ ] **Step 3: Commit**

```bash
git add DESIGN.md
git commit -m "docs: rewrite DESIGN.md as the Buku design system

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Update `CLAUDE.md`

**Files:** Modify `CLAUDE.md` (repo root)

- [ ] **Step 1: Reframe the design-system reference**

Replace the design-system paragraph:
```markdown
Follow **`/DESIGN.md`** (American Express visual language). Apply the Amex **design tokens**: colors are CSS variables in `src/index.css` (`:root` light, `.dark` premium-navy); the typeface is **Public Sans**; radius is 8px; shadows are navy-tinted; money uses **tabular figures** at weight 600. Amex Blue `#006FCF` is the single action/accent color; deep navy `#00175A` is the premium surface (sidebar, dark mode). Use the semantic tokens (`--success`, `--warning`, `--destructive`) — never raw hex in components.
```
with:
```markdown
Follow **`/DESIGN.md`** (the Buku design system). Apply the **design tokens**: colors are CSS variables in `src/index.css` (`:root` light, `.dark` premium-navy); the typeface is **Public Sans**; radius is 8px; shadows are navy-tinted; money uses **tabular figures** at weight 600. Primary blue `#006FCF` is the single action/accent color; deep navy `#00175A` is the premium surface (sidebar, dark mode). Use the semantic tokens (`--success`, `--warning`, `--destructive`) — never raw hex in components.
```

- [ ] **Step 2: Delete the obsolete caveat section**

Remove the entire section (heading + paragraph):
```markdown
### CRITICAL caveat about DESIGN.md

`DESIGN.md` bundles a generic "anti-slop frontend" skill **scoped to landing pages and portfolios**. This app is a **data-dense accounting product** (dashboards, data tables, multi-step forms) — that skill's own Section 13 lists this app type as **out of scope**. Apply only its **design tokens, accessibility, interactive states, form/table patterns, color/shape-consistency, the em-dash ban, and reduced-motion** guidance. **Ignore** its hero / marquee / GSAP / bento / image-strategy / centered-hero / landing-page rules — they do not apply here.
```
(The "## Non-negotiable conventions" and "## Commands" sections stay unchanged.)

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): point at the Buku design system; drop obsolete caveat

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Verify

**Files:** none (verification only).

- [ ] **Step 1: No leftover removed concepts**

Run: `grep -niE "american express|amex|benton|membership|centurion|marquee|gsap|bento|anti-slop|out of scope" DESIGN.md CLAUDE.md`
Expected: **no matches** (the rewrite scrubs all Amex-brand and landing-page-skill references; the heritage line says "finance brand equity", not "American Express").

- [ ] **Step 2: Docs-only sanity**

Run: `pnpm test --run && pnpm run build`
Expected: still green (272 tests, build OK) — no code imports `DESIGN.md`, so nothing changed functionally.

- [ ] **Step 3: Commit (if any verify fixes were needed)**

```bash
git add -A
git commit -m "docs: DESIGN.md/CLAUDE.md verification fixes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
(Skip if nothing needed fixing.)

---

## Notes for the implementer

- This is documentation only — do NOT change `src/index.css`, components, or any application code.
- The `DESIGN.md` content above is the full deliverable; write it verbatim, then verify the token values against `src/index.css` (the canonical source).
- The new `DESIGN.md` intentionally contains no "American Express"/"Amex"/"Benton Sans" references — the palette's heritage is acknowledged only as generic "finance brand equity".

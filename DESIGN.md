---
name: Buku Design System
description: "A calm, institutional financial UI: institutional blue for action, deep navy for premium surfaces and dark mode, Public Sans for legible figures, generous restrained spacing, and absolute clarity for high-stakes accounting data."
colors:
  primary: "#006FCF"
  primary-foreground: "#FFFFFF"
  background: "#F7F8F9"
  foreground: "#1A1A1A"
  card: "#FFFFFF"
  muted: "#ECEDEE"
  muted-foreground: "#53565A"
  accent: "#EAF3FC"
  accent-foreground: "#00509E"
  border: "#D5D9DC"
  ring: "#006FCF"
  success: "#00875A"
  warning: "#B95000"
  destructive: "#C52720"
  success-strong: "#007A51"
  warning-strong: "#B24D00"
  info-strong: "#006BC7"
  destructive-strong: "#C52720"
  sidebar: "#00175A"
  sidebar-foreground: "#FFFFFF"
  sidebar-accent: "#12306F"
  sidebar-ring: "#4DA3E8"
typography:
  display:
    fontFamily: "Public Sans Variable, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Public Sans Variable, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  money:
    fontFamily: "Public Sans Variable, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    fontFeature: "tabular-nums"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "11px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-strong}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "4px 10px"
  status-chip:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "9999px"
    height: "20px"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
  nav-item:
    textColor: "{colors.sidebar-foreground}"
    rounded: "{rounded.md}"
    padding: "8px"
  nav-item-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.sidebar-foreground}"
    rounded: "{rounded.md}"
    padding: "8px"
---

# Design System: Buku Design System

> Design reference for **Buku**, a single-company Indonesian accounting web client (SAK/PSAK). This is the source of truth for all UI in this app. The tokens above mirror `src/index.css` (hex is canonical); components live in `src/components/**`. When in doubt, the code wins. OKLCH tonal ramps, motion, breakpoints, and drop-in component snippets live in the `.impeccable/design.json` sidecar.

## 1. Overview

**Creative North Star: "The Institutional Ledger"**

Buku is the accounting system of record for a single company. It feels composed, institutional, and premium, not startup-loud. Institutional **blue** (`#006FCF`) is the one action and identity colour; deep **navy** (`#00175A`) is the premium surface, carrying the sidebar and the entire dark mode. Content sits in clean white cards on a soft grey page, with generous, restrained spacing.

Restraint is the point. High-value financial decisions deserve calm, legible, unambiguous screens, not ornament. The institutional-blue palette follows the long lineage of finance brand equity; the navy surface reads as premium rather than as an inverted grey. Every figure aligns, every status is spelled out, every screen accounts for its loading, empty, error, and not-found states.

This system explicitly rejects the startup-loud register: no second accent colour competing with the blue, no colour-only status, no decorative shadows or gradients, no fake-precise numbers or placeholder screenshots, and no em-dashes in prose. Ornament that does not clarify is removed.

**Key Characteristics:**
- One accent only: institutional blue for every action, link, and focus ring.
- Premium navy is a surface, not a grey inversion: it carries the sidebar and the whole dark mode.
- Public Sans throughout; money and account numbers are weight 600 with tabular figures so columns align.
- 8px spacing grid, generous and restrained; 8px radius; navy-tinted soft shadows.
- State is icon + text, never colour alone; every data view handles loading, empty, error, and not-found.
- Indonesian-first copy (SAK/PSAK domain); no em-dashes in UI prose.

## 2. Colors

A disciplined institutional palette: one confident blue for action, a premium navy for identity surfaces, muted greys for structure, and a restrained semantic trio reserved for state. Components consume **semantic tokens** (`bg-primary`, `text-muted-foreground`, `bg-success/10`), which are CSS variables in `src/index.css` exposed as Tailwind utilities via `@theme`. Raw hex in a component is forbidden.

### Primary
- **Institutional Blue** (`#006FCF`): the sole accent. Buttons, links, focus rings, the brand mark, selected states, info. On white it clears AA at 4.6:1; where small blue text is unavoidable, use the deeper `#00509E` (`accent-foreground`).

### Secondary
- **Premium Navy** (`#00175A`, deep `#000C3D`): the sidebar surface, premium panels (the dashboard hero), and the dark-mode page and cards. Text on navy is white or `#B7C3D9`.
- **Blue-Tinted Wash** (`#EAF3FC`, `accent`): the quiet blue hover fill for rows and subtle surfaces.

### Tertiary (semantic state, used sparingly)
- **Ledger Green** (`success` `#00875A`): posted, paid, open period.
- **Amber Alert** (`warning` `#B95000`): partial payment, attention-needed.
- **Error Red** (`destructive` `#C52720`): void, delete, validation failure.
- **Strong foregrounds** (`success-strong` `#007A51`, `warning-strong` `#B24D00`, `info-strong` `#006BC7`, `destructive-strong` `#C52720`): AA-safe text/icon shades for use on the 10%-tint fills of status chips and soft buttons, where the base tones would fall under 4.5:1.

### Neutral
- **Ink** (`foreground` `#1A1A1A`): body text, ~17:1 on the page surface (AAA).
- **Quiet Slate** (`muted-foreground` `#53565A`): secondary text, hints, disabled labels.
- **Soft Grey Page** (`background` `#F7F8F9`) and **white cards** (`card` `#FFFFFF`): the two base surfaces.
- **Muted Fill** (`muted` `#ECEDEE`) and **Hairline** (`border` `#D5D9DC`): nested fills and 1px dividers.

### Dark Mode
Dark mode is **premium navy, not a grey inversion**: a navy-deep page (`#000C3D`), navy cards (`#00175A`), a brighter-blue primary (`#1374D4`), and lightened semantic tones (`success` `#2FA37A`, `warning` `#D9772E`, `destructive` `#E5685F`) for contrast on the dark tints.

### Named Rules
**The One Accent Rule.** Institutional blue is the only accent. Never introduce a second accent colour. The rarity of a single action colour is what makes the primary action legible.

**The Premium Navy Rule.** Navy is a premium surface, not a grey inversion. It carries the sidebar and the full dark mode with white / `#B7C3D9` text. Dark mode is navy-on-navy, never grey-on-grey.

**The Semantic Token Rule.** Components use semantic tokens (`bg-primary`, `text-muted-foreground`, `bg-success/10`). Raw hex in a component is forbidden; the tokens live in `src/index.css`.

## 3. Typography

**Display / Body Font:** Public Sans (Public Sans Variable, self-hosted via `@fontsource-variable/public-sans`), with Helvetica Neue / Helvetica / Arial fallback.
**Mono Font:** JetBrains Mono (rare; for code-like or technical strings only).

**Character:** Public Sans is a free, open Franklin-gothic grotesque: measured, highly legible, institutional. One family in multiple weights carries the whole system, never a second competing sans. Money does **not** use mono; it uses tabular Public Sans at weight 600 so figures align without changing typeface.

### Hierarchy
- **Display** (600, `clamp(1.75rem, 3vw, 2.5rem)` ≈ 28-40px, line-height 1.15, tracking -0.01em): page and section headings.
- **Title** (500, 16px, leading-snug): card titles, dialog titles, sub-section heads.
- **Body** (400, 16px, line-height 1.55): default UI text and prose; cap prose measure at 65-75ch.
- **Label** (500, 14px): form labels above their field, table headers, chip text.
- **Money** (600, tabular figures): every monetary figure and account number, via `MoneyText` / `MoneyInput`.

### Named Rules
**The Tabular Money Rule.** Every monetary figure and account number renders through `MoneyText` / `MoneyInput` at weight 600 with tabular figures, computed with decimal.js (`Money`). Never a raw JavaScript float, never a mono one-off.

**The No-Em-Dash Rule.** No em-dashes in user-facing copy; use a comma, period, or parentheses. The sole exception is a lone em-dash (`—`) as a null-value placeholder in data displays (a missing figure or field), which is a conventional table glyph, not prose.

## 4. Elevation

Surfaces are **flat at rest with a single soft, navy-tinted shadow**, layered by tone rather than by heavy drop shadows. Every shadow is tinted with the navy `rgba(0, 23, 90, ...)`, never neutral grey or black; depth reads as the brand's own colour catching light. Motion is treated here too: surfaces do not animate for decoration, only in response to state.

### Shadow Vocabulary
- **Card** (`0 1px 4px rgba(0, 23, 90, 0.10)`): default resting elevation for cards and panels.
- **Elevated** (`0 6px 24px rgba(0, 23, 90, 0.16)`): lifted surfaces (the navy dashboard hero, popovers, raised cards).
- **Mid** (`0 4px 14px rgba(0, 23, 90, 0.12)`): menus, sticky bars.
- **Modal** (`0 12px 32px rgba(0, 23, 90, 0.18)`): dialogs over the scrim.

### Named Rules
**The Flat-Until-Motivated Rule.** Surfaces rest flat with the single card shadow. Motion is 120-240ms on the one easing curve (`cubic-bezier(0.4, 0, 0.2, 1)`), never bouncy or elastic, and always motivated by feedback, hierarchy, or a state change. Overlays animate open/close (`tw-animate-css`); content entrance is a subtle fade-and-rise (the `Reveal` primitive, used on the dashboard). All motion collapses to instant under `prefers-reduced-motion`.

## 5. Components

Every data view wraps its query rendering in **`QueryState`** (loading → record-not-found → error+retry → data), using the composed shimmer skeletons + `ErrorState` + `NotFound`. Never a bare spinner or a success-only screen. The app shell is a fixed navy sidebar beside bright content: the navy left nav next to a white header and a soft-grey content area holding white cards, on an 8px spacing grid.

### Buttons
- **Shape:** gently rounded (8px, `rounded-lg`), 32px tall, 14px medium label; presses down 1px on `:active`.
- **Primary:** solid `#006FCF` with white text; hover drops to 80% opacity, active to 90%. One primary action per screen.
- **Outline (secondary):** hairline `#D5D9DC` border on the card/page surface, ink text; fills to `muted` on hover.
- **Ghost:** no border or fill until hover (fills `muted`).
- **Destructive (soft):** deliberately not a solid red slab — a soft `destructive/10` tint with AA-safe `destructive-strong` text, so danger reads without shouting.
- **Focus:** blue border plus a soft 3px `ring/50` glow on every button (destructive uses the red ring).

### Chips (StatusChip)
- **Style:** a pill (`rounded-full`, 20px tall, 12px medium text) that always pairs a tinted `/10` fill, an AA-safe strong foreground, AND an icon with a text label.
- **State:** the text label is the accessible status; the icon is `aria-hidden`. Never colour alone. Tones and their domain mappings (`src/components/common/statusChips.tsx`): document DRAFT → neutral, POSTED → success, VOID → error; payment UNPAID → neutral, PARTIAL → warning, PAID → success; journal (incl. REVERSED), period (OPEN → success / CLOSED → neutral), payment direction → info, active/inactive.

### Cards / Containers
- **Corner Style:** gently rounded (~11px, `rounded-xl`).
- **Background:** white (`card`), on the soft-grey page.
- **Shadow Strategy:** the resting **Card** shadow only (see Elevation); flat by default.
- **Border:** 1px hairline `#D5D9DC`.
- **Internal Padding:** roughly 24px (`--card-spacing`). Data-table rows are comfortably tall (~56px) with right-aligned tabular amounts. Whitespace signals quality; screens never feel crowded. **Never nest a card inside another card.**

### Inputs / Fields
- **Style:** hairline `#D5D9DC` border on a transparent fill, 8px radius, 32px tall, 14px text. Label sits **above** the field; helper/error text below.
- **Focus:** blue border plus a soft 3px blue ring (`ring/50`).
- **Error / Disabled:** inline field errors mapped from the API (`applyApiErrorToForm`); action errors surface as toasts (`toastApiError`). Disabled fields dim and drop pointer events. Never placeholder-as-label.

### Navigation
- **Style:** navy sidebar surface, white brand, muted-blue links (white at 70%). Rounded 6px items on an 8px pad.
- **Active / Hover:** a filled lighter-navy pill in `--sidebar-accent` (`#12306F`) with full-white text; medium weight on the active item. (The 3px blue left-bar was retired with the shell migration to the shadcn `@efferd` sidebar; the active state is the filled pill.)
- **Focus:** a 2px light-blue `--sidebar-ring` (`#4DA3E8`) ring, legible on navy.
- **Mobile:** the sidebar collapses via `SidebarProvider`.

### Dashboard Hero (signature)
A navy premium panel stating the company's financial position: **Total Aset** dominant (36px tabular 600), with the accounting equation `Kewajiban = Ekuitas` as supporting figures beneath a hairline divider. Carries its own loading (pulse skeletons on the navy) and error/retry states.

## 6. Do's and Don'ts

### Do:
- **Do** use the semantic tokens (`bg-primary`, `text-muted-foreground`, `bg-success/10`) for every colour; never raw hex in a component.
- **Do** keep one primary action per screen in solid blue; secondary actions are outline or ghost.
- **Do** render all money through `MoneyText` / `MoneyInput` at weight 600 tabular figures, computed with `Money` (decimal.js).
- **Do** pair every status with an icon **and** a text label using a semantic tone (`StatusChip`).
- **Do** wrap query rendering in `QueryState` so loading, empty, error, and not-found are all handled.
- **Do** route every user-facing string through `useT()` (Indonesian) and keep the 8px spacing grid.
- **Do** keep motion 120-240ms on the standard easing curve and honour `prefers-reduced-motion`.
- **Do** keep controls at the 32px density (exceeds WCAG 2.2 AA's 24px target); a visible focus ring on every control and custom link.

### Don't:
- **Don't** introduce a second accent colour or mix corner radii; blue and 8px are locked.
- **Don't** convey state with colour alone, and don't ship a bare spinner or a success-only screen.
- **Don't** render money as a raw JavaScript float or in a mono one-off font.
- **Don't** use placeholder-as-label in forms; the label sits above the field.
- **Don't** nest a card inside another card, and don't add decorative shadows, glows, or gradients.
- **Don't** use em-dashes in UI copy (except the lone null-value placeholder glyph in data displays).
- **Don't** use fake-precise numbers, placeholder/lorem text, or `<div>` fake screenshots in shipped UI.
- **Don't** change routes, nav labels, or form-field names as part of styling work.

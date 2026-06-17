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

# Rewrite DESIGN.md as the Buku Design System — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming)
**Scope:** Documentation only. Rewrite the root `DESIGN.md` to describe Buku's actual design system, and update `CLAUDE.md`'s reference. No application code changes.

## Goal

Replace the current `DESIGN.md` (an American Express *brand* document + a bundled ~1,970-line landing-page "anti-slop" skill) with a focused, ~200-line **Buku Design System** that accurately documents the visual language we actually shipped, plus a curated set of forward-looking design principles. Update `CLAUDE.md` so its reference and caveat stay correct.

## Background

- Root `DESIGN.md` is 2,297 lines: (1) an Amex `<design-context>` (good tokens, but Amex consumer-product framing — card-art tiles, membership rewards, Centurion tiers, payment flows, Benton Sans); (2) accessibility guidance; (3) a `<skill-context>` "anti-slop frontend" skill (~1,970 lines) scoped to landing pages/portfolios, which its own Section 13 lists as **out of scope** for a data app like ours.
- The Amex visual language was adapted and shipped across the revamp (P1 tokens → P2 chips → 3a navy shell → 3b dashboard hero → 3c motion/a11y). The real source of truth for tokens is now `src/index.css`; for components, `src/components/**` and the feature columns/pages.
- `CLAUDE.md` references `DESIGN.md` as "American Express visual language" and includes a "CRITICAL caveat about DESIGN.md" warning that the bundled landing-page skill is out of scope. Removing that skill makes the caveat obsolete.

## Decisions (from brainstorming)

- Reframe as **Buku Design System** (our app), not American Express. Keep a single brief heritage line (institutional-blue finance lineage), not Amex branding.
- **Keep** a machine-readable token frontmatter (useful for AI/devs) mirroring `src/index.css` exactly.
- **Keep** a curated "Principles for future UI work" section (the genuinely-applicable general guidance).
- **Remove** the Amex consumer-product component patterns and the entire landing-page "anti-slop" skill.
- **Update** `CLAUDE.md` accordingly.

## New `DESIGN.md` structure

1. **Frontmatter (machine-readable tokens)** — `name: Buku Design System`, short description, then the tokens **mirrored exactly from `src/index.css`**: light (`:root`) + premium-navy dark (`.dark`) colors, typography (Public Sans, mono fallback), 8px spacing scale, radius (8px / `--radius: 0.5rem`), navy-tinted shadows (`0 1px 4px rgba(0,23,90,.10)` card / `0 6px 24px rgba(0,23,90,.16)` elevated), motion (120–240ms, `cubic-bezier(0.4,0,0.2,1)`). End with "Use this design system for all UI in this app."
2. **Overview & atmosphere** — Buku = single-company Indonesian accounting product (SAK/PSAK). Calm, institutional, premium: institutional-blue authority, deep-navy gravitas for the shell + dark mode, generous restrained spacing, absolute clarity for high-stakes financial figures. One heritage line on the institutional-blue palette's finance lineage.
3. **Color system** — the semantic tokens: primary Amex-blue `#006FCF` (sole action/accent), deep navy `#00175A` (sidebar + premium/dark surfaces), surfaces/neutrals, semantic `success`/`warning`/`error`/`info`, and the premium-navy dark mode. Note: use semantic tokens in components, never raw hex.
4. **Typography** — Public Sans (free Franklin-gothic grotesque, self-hosted); display vs body scale; **money uses tabular figures at weight 600** (`MoneyText`/`MoneyInput`).
5. **Spacing & layout** — 8px grid; the app shell = **navy sidebar (blue left-bar active) + bright white-on-soft-grey content/header**; cards (≈24px padding, navy-tinted shadow, 8px radius); data tables (≈56px rows, right-aligned tabular amounts).
6. **Components & patterns** — Buku's real components: navy sidebar nav; the dashboard **financial-position hero** (navy, Total Aset dominant + the accounting equation); summary cards; **semantic status chips** (`StatusChip` + domain mappers — the full status→tone/icon mapping: doc DRAFT/POSTED/VOID, payment UNPAID/PARTIAL/PAID, journal incl. REVERSED, period OPEN/CLOSED, direction, active/inactive — icon + text, never colour alone); data tables; document forms (label-above-input, inline errors, mutation toasts via `toastApiError`/`applyApiErrorToForm`); dialogs/overlays; async states via **`QueryState`** (loading skeletons → record-not-found → error+retry → data) + `EmptyState`; buttons (blue primary with press tone, blue-outline ghost secondary, one primary per screen).
7. **Motion** — subtle, motivated only: the `Reveal` fade+rise dashboard entrance, Radix overlay open/close animations; 120–240ms eased, never bouncy; always honor `prefers-reduced-motion`.
8. **Accessibility** — real contrast ratios (white-on-`#006FCF` 4.6:1 AA, white-on-navy 15.4:1 AAA, ink-on-surface ≈17:1 AAA); visible focus rings on all controls *and* custom links; status conveyed with icon + text (never colour alone); touch targets (32px controls exceed WCAG 2.2 AA's 24px minimum — 44px AAA intentionally not pursued for a dense desktop tool); reduced-motion respected.
9. **Principles for future UI work** (curated) — full interactive-state cycles (use `QueryState`: loading/empty/error/not-found); one accent colour locked (Amex blue); one radius scale (8px); **em-dash ban in UI copy**; no fake/placeholder data, real components over div-mockups; motion must be motivated; YAGNI; every string via `useT` (Indonesian), money via decimal.js; redesign-preserve (don't change IA/routes/field names for styling).

The doc references `src/index.css` and `src/components/common/` as the living source of truth, so it stays a guide, not a second copy to drift.

## `CLAUDE.md` changes

- In the "Design system" paragraph: "Follow `/DESIGN.md` (**American Express visual language**)" → "Follow `/DESIGN.md` (**the Buku design system**)"; keep the rest (tokens in `index.css`, Public Sans, 8px radius, navy shadows, tabular money, semantic tokens).
- **Delete** the entire "### CRITICAL caveat about DESIGN.md" section (no longer applicable once the landing-page skill is gone).
- Leave "Non-negotiable conventions" and "Commands" unchanged.

## Verification

- Token frontmatter values match `src/index.css` (`:root` + `.dark`) exactly — no transcription drift.
- `DESIGN.md` mentions no removed concepts (no "American Express"/"Amex" as the brand, no "Benton Sans", no membership/Centurion/marquee/GSAP/bento), except the single intentional heritage line.
- `CLAUDE.md` no longer references the deleted caveat; its DESIGN.md pointer is accurate.
- Docs-only: `pnpm test --run` + `build` unaffected (still green); no code imports `DESIGN.md`.

## Files

- **Modify (rewrite):** `DESIGN.md` (repo root).
- **Modify:** `CLAUDE.md` (repo root).

## Out of scope

- No application/component/token code changes (the system is already built; this documents it).
- No new design decisions — the doc reflects what's shipped.

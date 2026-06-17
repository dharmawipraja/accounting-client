# Buku — Indonesian Accounting Client

React 19 (+ React Compiler) · TypeScript strict · TanStack Router (file-based) + Query v5 · shadcn/ui · Tailwind v4 · zod v4 · decimal.js · Vitest 4 + RTL + MSW v2. Package manager: pnpm.

## Design system

Follow **`/DESIGN.md`** (the Buku design system). Apply the **design tokens**: colors are CSS variables in `src/index.css` (`:root` light, `.dark` premium-navy); the typeface is **Public Sans**; radius is 8px; shadows are navy-tinted; money uses **tabular figures** at weight 600. Primary blue `#006FCF` is the single action/accent color; deep navy `#00175A` is the premium surface (sidebar, dark mode). Use the semantic tokens (`--success`, `--warning`, `--destructive`) — never raw hex in components.

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

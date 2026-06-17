# Persist Dashboard Period — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming)
**Scope:** One small, isolated feature — remember the dashboard's period selection across reloads/sessions.

## Goal

The dashboard's period filter (`month` / `quarter` / `year` / `custom`) currently resets to "This year" on every reload because it lives in local `useState`. Persist the selection so a returning user sees their last-chosen period — with relative presets recomputed to *today* and custom ranges restored exactly.

## Background — current state (audited)

- `src/features/dashboard/DashboardPage.tsx` holds the period in `useState`:
  `const [period, setPeriod] = useState<Period>(() => computePeriod('year', new Date()));`
  Preset buttons call `setPeriod(computePeriod(preset, new Date()))`; custom calls `setPeriod({ preset: 'custom', from, to })`.
- `src/features/dashboard/period.ts` defines `Period = { preset: 'month'|'quarter'|'year'|'custom'; from: string; to: string }`, plus `computePeriod(preset, today)` (relative presets) and `periodValid(p)`.
- State-management baseline: server state in TanStack Query; two persisted zustand stores in `src/stores/` — `useSession` (`buku.session`) and `useTheme` (`buku.theme`). Ephemeral per-page UI is local `useState`. This feature adds the first *preferences* store.

## Decisions (from brainstorming)

1. **Restore behavior:** presets stay relative to today (a saved `month/quarter/year` recomputes to the current period on return); a saved `custom` restores the exact `from/to`.
2. **Store shape:** a new generic, persisted `usePreferences` store in `src/stores/preferences.ts` (not a one-off store), shipping with a single `dashboardPeriod` field — the natural future home for other preferences (rows-per-page, locale) without building them now (YAGNI).

## Architecture

### New store — `src/stores/preferences.ts`

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computePeriod, type Period } from '@/features/dashboard/period';

export interface PreferencesState {
  dashboardPeriod: Period;
  setDashboardPeriod(p: Period): void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      dashboardPeriod: computePeriod('year', new Date()),
      setDashboardPeriod: (dashboardPeriod) => set({ dashboardPeriod }),
    }),
    { name: 'buku.prefs' },
  ),
);
```

- Persisted under `buku.prefs` (whole `dashboardPeriod` value). Type-only import of `Period` from the dashboard feature — no runtime coupling.
- Default (nothing persisted) = a `year` preset, preserving today's behavior.

### New helper — in `src/features/dashboard/period.ts`

```ts
/** Resolve a stored selection for display: relative presets recompute to
 *  `today`; a custom range is returned verbatim. */
export function resolveStoredPeriod(stored: Period, today: Date): Period {
  return stored.preset === 'custom' ? stored : computePeriod(stored.preset, today);
}
```

### Integration — `src/features/dashboard/DashboardPage.tsx`

Replace the local `useState` with the store as the source of truth and a pure derivation for the effective period:

```ts
const stored = usePreferences((s) => s.dashboardPeriod);
const setPeriod = usePreferences((s) => s.setDashboardPeriod);
const period = useMemo(() => resolveStoredPeriod(stored, new Date()), [stored]);
```

- Preset buttons (via `DashboardFilters.onSelectPreset`): `setPeriod(computePeriod(preset, new Date()))`.
- Custom change (via `onCustomChange`): `setPeriod({ preset: 'custom', from, to })`.
- `period` flows unchanged into `useBalanceSheet`/`useIncomeStatement`/`useCashFlow` and `DashboardFilters`. `periodValid(period)` gating is unchanged.

`DashboardFilters.tsx` is **unchanged** (it already takes `period` + the two callbacks as props).

## Data flow

1. On mount, `usePreferences` rehydrates `dashboardPeriod` from `buku.prefs` (or the `year` default).
2. `period = resolveStoredPeriod(stored, new Date())` — a stale stored preset's dates are ignored and recomputed; custom passes through.
3. User changes the filter → handler writes the new selection to the store → persisted → `period` re-derives. No effects.

## Error handling / edge cases

- **Corrupt/invalid stored custom range:** `resolveStoredPeriod` returns it as-is; the dashboard already renders the invalid-range hint and disables the report queries (`periodValid` + the `enabled`-gated hooks), and `QueryState` renders nothing for those idle queries — no crash, no perpetual skeleton.
- **Midnight crossing in a long session:** the preset's dates are computed at mount/selection (same freshness as today's `useState` behavior) — acceptable, not a regression.

## Testing strategy

- **Store** (`src/stores/preferences.test.ts`): default `dashboardPeriod.preset === 'year'`; `setDashboardPeriod({preset:'custom',from,to})` updates state and writes `buku.prefs` to localStorage. (Mirror `session.test.ts` style; clear store + localStorage in `afterEach`.)
- **Helper** (`period.test.ts`): `resolveStoredPeriod` returns a custom range verbatim; recomputes a *stale* `month` selection so `from === toApiDate(startOfMonth(today))`.
- **Integration** (existing `DashboardPage` tests): stay green with the default `year`; add one case asserting that selecting a preset persists it to `buku.prefs`.
- Full suite + tsc + lint + build clean.

## Files

**New:** `src/stores/preferences.ts`, `src/stores/preferences.test.ts`
**Modified:** `src/features/dashboard/period.ts` (+ its test), `src/features/dashboard/DashboardPage.tsx`

## Out of scope / non-goals

- No other preferences (rows-per-page, sidebar, locale) — the store ships with `dashboardPeriod` only.
- No change to `DashboardFilters`, the report hooks, or the period model beyond adding `resolveStoredPeriod`.
- Not persisting list-page filters (those are better suited to URL search params — separate consideration).

# One query-key registry — design

**Date:** 2026-06-25
**Source:** Architecture-review card 5 (one query-key registry). Sibling of cards 1–4.
**Decided via:** brainstorming (converged directly — a registry already exists; this completes it and closes the drift seams).

## Summary

TanStack Query keys are *mostly* already centralized in `src/lib/query/keys.ts` (`queryKeys`). The card's "scattered literals" premise is only partly true; the inventory found four concrete gaps, all variations on one risk — **the same logical key written as two independent literals, where a rename of one silently breaks invalidation:**

1. **The factory drift seam.** Each factory resource's base string is typed twice: in the feature's `createResourceHooks({ key: 'salesInvoices' })` (query side) and again in `useDocumentAction({ key: 'salesInvoices' })` (post/void invalidation side). Worse, `keys.ts` *already* defines `queryKeys.salesInvoices = createResourceKeys('salesInvoices')` — but those 6 entries are **dead** (the factory re-mints internally; nothing reads the registry entries).
2. **`journalEntries`** hand-writes the factory key shape in `keys.ts` instead of using `createResourceKeys`, so it can drift from the factory shape.
3. **Two ad-hoc keys** bypass the registry: `['taxCalc', debounced]` (`useTaxPreview`) and `['report', path, params]` (`useReport`).
4. **Dead entry** `queryKeys.me` (auth hydration uses `apiFetch`, not Query).

**Decision (chosen approach): Full.** Make the registry the live single source — wire the existing resource entries into the factory and `useDocumentAction`, fold the stragglers in, drop the dead entry. Every key's *runtime value* is unchanged, so this is a **preventive, behavior-preserving refactor** (every current invalidation already works via prefix-matching).

## The seam

`createResourceKeys(key): ResourceKeys` (in `createResourceHooks.ts`) stays the single key-shape builder. `queryKeys` (in `keys.ts`) is the single registry that owns one `ResourceKeys` (or key-builder) per domain. The two factory-layer functions become **consumers** of the registry rather than re-minters:

### `lib/query/keys.ts` (the registry)
- The 6 resource entries stay `createResourceKeys('<base>')` (already present) and become *used*.
- `journalEntries`: `{ all, list, item }` hand-written → `createResourceKeys('journalEntries')` (identical runtime shape: `.all` = `['journalEntries']`, `.list(p)` = `['journalEntries','list',p]`, `.item(id)` = `['journalEntries','item',id]`).
- Add `taxCalc: (args: string) => ['taxCalc', args] as const` and `report: (path: string, params: unknown) => ['report', path, params] as const` (exact current shapes).
- Remove `me`.
- `reports`/`periods`/`yearEnd`/`audit`/`companySettings` unchanged (already used through the registry).

### `lib/crud/createResourceHooks.ts` (the factory)
- `ResourceConfig.key: string` → `keys: ResourceKeys`.
- Internals: `const keys = config.keys;` (drop the internal `createResourceKeys(config.key)` call).
- Still exports `createResourceKeys` + `ResourceKeys`, and still returns `keys` on the api object (so any `xApi.keys` consumer keeps working).

### `lib/crud/useDocumentAction.ts` (the lifecycle action)
- config `key: string` → `keys: { all: readonly unknown[] }` (only `.all` is needed to invalidate, so `periods` — which has no `.item` — still satisfies it without being forced into a full `ResourceKeys`).
- `onSuccess: () => qc.invalidateQueries({ queryKey: config.keys.all })`.

## Consumers updated (the churn — all mechanical, runtime-identical)

- **6 feature `hooks.ts`** (accounts, partners, tax-codes, sales-invoices, payments, purchase-bills): `createResourceHooks({ key: 'x', … })` → `{ keys: queryKeys.x, … }`.
- **10 lifecycle calls** `useDocumentAction({ key: 'x', … })` → `{ keys: queryKeys.x, … }`: sales-invoices (post/void), payments (post/void), purchase-bills (post/void), journals (post/reverse), periods (close/reopen). (`periods` passes `queryKeys.periods`, which has `.all`.)
- **`useTaxPreview`**: `['taxCalc', debounced]` → `queryKeys.taxCalc(debounced)`.
- **`useReport`**: `['report', path, params]` → `queryKeys.report(path, params)`.
- **2 synthetic test harnesses** (`DocumentListPage.test.tsx`, `DocumentEditor.test.tsx`) that build the factory with `key: 'test-docs'` → `keys: createResourceKeys('test-docs')` (import `createResourceKeys`). Harness setup only; assertions unchanged.

(`journals` `useCreateJournalEntry`/`useDeleteJournalEntry` already invalidate `queryKeys.journalEntries.all` directly — unchanged.)

## Why this is the deepening

Each resource base string lives **once**, in `keys.ts`. The factory (query keys) and `useDocumentAction` (invalidation) consume the **same** `ResourceKeys` object from the registry, so a query key and its invalidation provably cannot diverge — the silent-invalidation-break class the card names is structurally eliminated. `keys.ts` is the test surface: read one file to know every key.

## Testing

- **No behavior change** — every key's runtime value is identical (verified per entry above). The full existing suite is the regression net and stays green; cache invalidation continues to work as today.
- **`pnpm run build`** (`tsc -b && vite build`, the real typecheck) is the key gate: it proves the `ResourceConfig.key → keys` and `useDocumentAction key → keys` signature changes line up across all ~18 call sites (6 factory configs + 10 lifecycle + 2 test harnesses) with no stragglers.
- **Dependency category:** in-process; pure registry consolidation.

## Global constraints (carried into the plan)

- Pure, behavior-preserving refactor — runtime key values unchanged; no user-facing change.
- `pnpm run build` is the real typecheck (not `tsc --noEmit`); lint stays at 0 errors / the 8 pre-existing warnings.
- No new dependencies. Follow existing patterns.

## Out of scope

- The `useReport` `params`-object stability question (its key is preserved exactly as today; not "fixed" here).
- Folding `journalEntries` lifecycle into the factory (journals keep their bespoke create/delete + post/reverse hooks; only the *keys* are unified).
- The `test-docs` synthetic key entering the registry (it is test-only; the harnesses mint it via `createResourceKeys('test-docs')`).
- Any change to `apiFetch`, schemas, or endpoint paths.

# Split the resource-hooks factory by resource shape — design

**Date:** 2026-06-26
**Source:** Architecture-review card 6 (deepen the createResourceHooks factory). Last of the main cards; sibling of cards 1–5.
**Decided via:** brainstorming (converged directly; approach chosen: split only — lifecycle wrappers untouched).

## Summary

`createResourceHooks` is one interface stretched over two unrelated resource shapes, so each resource discards part of its output:

- **Master data** (accounts/partners/taxCodes) uses list/pagedList/create/update/**activate/deactivate/remove**, but `useItem` is dead (they edit in dialogs, no detail view) — 3 dead hooks.
- **Documents** (salesInvoices/payments/purchaseBills) use list/pagedList/item/create/update/remove, but `useActivate`/`useDeactivate` are dead (draft→posted→void lifecycle, not active/inactive toggles) — 6 dead hooks (+ payments doesn't use `useList`).
- ~10 generated-but-never-called hooks total. The cost is navigability: "which of these 8 apply to *this* resource?"

**Fix (chosen): partition the factory into two shape-matched factories over a shared CRUD core**, mirroring the Document vs master-data distinction the codebase already treats as first-class (CONTEXT.md; cards 1 & 2 split on this exact line). Document lifecycle (post/void via `useDocumentAction`) stays as-is — out of scope.

This is a **structural, behavior-preserving refactor**: the returned hook *names* are unchanged, so consumers of the api objects don't change; only which factory each feature calls, and the factory's own test, change.

## Architecture (`src/lib/crud/createResourceHooks.ts`)

`createResourceHooks` is removed and replaced by a private shared core + two exported factories. Filename is kept (renaming would ripple ~11 import paths for no structural gain).

- **`createCrudHooks(config)`** (internal, not exported) — builds the 5 common hooks + `keys`, plus the shared `listSchema`/`envelopeSchema` setup and the `invalidate` helper:
  - `useList` (bare array, or unwrapped envelope when `paginated`), `usePagedList`, `useCreate`, `useUpdate`, `useRemove`.
- **`createMasterDataHooks<TItem, TCreate, TUpdate>(config)`** → `{ ...core, useActivate, useDeactivate }` (no `useItem`). Consumers: accounts, partners, taxCodes.
- **`createDocumentHooks<TItem, TCreate, TUpdate>(config)`** → `{ ...core, useItem }` (no `useActivate`/`useDeactivate`). Consumers: salesInvoices, payments, purchaseBills.

Both take the existing `ResourceConfig<TItem>` (`{ keys: ResourceKeys; basePath: string; itemSchema; paginated? }`) and the same `<TItem, TCreate, TUpdate>` generics. `createResourceKeys` and the `ResourceKeys`/`ResourceConfig` types stay exported unchanged (card 5's registry + the test harnesses import `createResourceKeys` from here). Each factory still returns `keys`.

Hook bodies (queryFn, invalidation, endpoints, schemas) are moved verbatim from the current factory — no behavior change.

## Consumers / churn

- **6 feature `hooks.ts`** swap the factory call (one symbol each; the destructured/returned hook names are identical so nothing downstream changes):
  - `accounts/hooks.ts`, `partners/hooks.ts`, `tax-codes/hooks.ts`: `createResourceHooks` → `createMasterDataHooks`.
  - `sales-invoices/hooks.ts`, `payments/hooks.ts`, `purchase-bills/hooks.ts`: `createResourceHooks` → `createDocumentHooks`.
- **2 document test harnesses** that construct the synthetic `test-docs` resource via `createResourceHooks` → `createDocumentHooks`: `src/features/documents/DocumentEditor.test.tsx`, `src/features/documents/DocumentListPage.test.tsx`.
- **`src/lib/crud/createResourceHooks.test.tsx`** is rewritten to test the two factories (see Testing). This is the one genuine code change beyond mechanical swaps.
- **Unchanged:** every api-object consumer (e.g. `accountsApi.useDeactivate`, `salesInvoicesApi.useItem`, `usePagedList` callers), the `useDocumentAction` lifecycle wrappers, `keys.ts`/registry, the editorConfigs, and journals/periods/settings/dashboard (they never used the factory).

## Dead-hook outcome

After the split: master factory has **0 dead hooks** (accounts/partners/taxCodes use all 7); document factory has **0 dead** for invoices/bills and **1** for payments (`useList`, accepted — 2/3 documents use it via `useOpenDocuments`, and per-resource trimming would require a flag, which reintroduces the config-heavy shallowness this split removes). Net: ~10 dead hooks → 1.

## Testing

- **`createResourceHooks.test.tsx` rewrite** — preserve the existing assertions, routed through the right factory, and add the shape-distinguishing checks:
  - `createMasterDataHooks` (e.g. `createResourceKeys('widgets')`): `useList` bare array; `useCreate` + invalidation; `useDeactivate` → POST `/:id/deactivate`; `useRemove` → DELETE; `usePagedList` envelope + `limit`/`offset` query. Assert it exposes `useActivate`/`useDeactivate` and NOT `useItem`.
  - `createDocumentHooks`: core hooks behave identically; `useItem` → GET `/:id`. Assert it exposes `useItem` and NOT `useActivate`/`useDeactivate`.
  - (Filename kept; two `describe` blocks. Renaming/splitting the test file is optional and not required.)
- **Regression net:** the full existing suite stays green — behavior is unchanged and api-object hook names are identical. The per-feature hook tests (`purchase-bills/hooks.test`, etc.) and the document editor/list tests pass via the new factory.
- **Gate:** `pnpm run build` (real `tsc -b && vite build`) — proves every `createResourceHooks` call site moved to the right new factory (no straggler import of the removed symbol) and the two return shapes type-check at all consumers; `pnpm test --run`; `pnpm run lint` (0 errors / 8 pre-existing warnings).
- **Dependency category:** in-process; pure structural split.

## CONTEXT.md

Add a short note under the existing Document / master-data vocabulary: the resource-hooks factory is split along that line — `createMasterDataHooks` (activate/deactivate, no detail view) vs `createDocumentHooks` (item + draft/post/void lifecycle via `useDocumentAction`), over a shared `createCrudHooks` core.

## Global constraints (carried into the plan)

- Pure, behavior-preserving — hook behavior + api-object hook names unchanged. No user-facing change.
- `pnpm run build` is the real typecheck (not `tsc --noEmit`); lint stays at 0 errors / the 8 pre-existing warnings.
- No new dependencies. Follow existing patterns.

## Out of scope

- Folding document lifecycle (post/void) into the document factory (the "actions config" — explicitly not chosen).
- Absorbing journals/periods/settings/dashboard into the factory (genuinely different shapes; correctly factory-free).
- Removing payments' single dead `useList` (would require a per-resource flag, reintroducing config-heaviness).
- Renaming the factory file or `createResourceHooks.test.tsx`.
- Any change to `useDocumentAction`, `apiFetch`, schemas, endpoints, or `keys.ts`.

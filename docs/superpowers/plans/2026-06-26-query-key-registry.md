# One Query-Key Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `src/lib/query/keys.ts` the single live source of every TanStack Query key: wire the (currently dead) resource entries into `createResourceHooks` + `useDocumentAction` so a query key and its invalidation share one `ResourceKeys` object, fold the two ad-hoc keys + `journalEntries` shape into the registry, and drop the dead `me` entry.

**Architecture:** `createResourceKeys(key): ResourceKeys` stays the one key-shape builder; `queryKeys` is the one registry. The factory and the lifecycle-action hook stop re-minting keys and instead **consume** `ResourceKeys` from the registry. Pure, behavior-preserving — every key's runtime value is unchanged.

**Tech Stack:** TypeScript (strict), TanStack Query v5, Vitest. In-process.

## Global Constraints

- **Pure, behavior-preserving refactor — runtime key values unchanged.** The full existing suite is the regression net (cache invalidation must keep working). No user-facing change.
- **`pnpm run build`** (`tsc -b && vite build`) is the real typecheck (NOT `tsc --noEmit`) and the primary gate — it proves the `key → keys` signature changes line up across every call site. Run before each commit.
- **Lint** stays at 0 errors / the 8 pre-existing React-Compiler/react-hook-form/TanStack-Table warnings.
- No new dependencies. Follow existing patterns.
- **Commands:** Build `pnpm run build` · Tests `pnpm test --run` · one file `pnpm test --run <path>` · Lint `pnpm run lint`.

## File Structure

- **`src/lib/query/keys.ts`** — the registry. Task 1 makes it complete (journalEntries via the shared builder; add `taxCalc`/`report`; drop `me`). Already imports `createResourceKeys`.
- **`src/lib/crud/createResourceHooks.ts`** — the factory. Task 2: config `key: string` → `keys: ResourceKeys`; consume it. Keeps exporting `createResourceKeys`/`ResourceKeys` and returning `keys`.
- **`src/lib/crud/useDocumentAction.ts`** — lifecycle action. Task 2: config `key: string` → `keys: { all: readonly unknown[] }`; invalidate `keys.all`.
- **6 feature `hooks.ts` + `periods/mutations.ts` + `useReport.ts` + `useTaxPreview.ts` + 3 test files** — call sites updated to pass registry keys.

---

### Task 1: Complete the registry (hygiene — no signature change)

**Files:**
- Modify: `src/lib/query/keys.ts`
- Modify: `src/features/documents/useTaxPreview.ts` (line 25), `src/features/reports/useReport.ts` (line 8)

**Interfaces:**
- Consumes: `createResourceKeys` (already imported in `keys.ts`).
- Produces: `queryKeys.journalEntries` (now via `createResourceKeys`, same shape), `queryKeys.taxCalc(args)`, `queryKeys.report(path, params)`. `queryKeys.me` removed.

This task changes no signatures, so it is build-green on its own (the 6 resource entries stay dead until Task 2; runtime key values are identical).

- [ ] **Step 1: Confirm `queryKeys.me` is unused**

Run: `grep -rn "queryKeys.me\b\|\.me\b" src | grep -i query`
Expected: no real consumer of `queryKeys.me` (auth hydration uses `apiFetch`, not Query). If any consumer appears, STOP and report — do not remove it.

- [ ] **Step 2: Edit `src/lib/query/keys.ts`**

Remove the dead `me` line (line 4):
```ts
  me: ['auth', 'me'] as const,
```
Replace the hand-written `journalEntries` block (lines 11–15):
```ts
  journalEntries: {
    all: ['journalEntries'] as const,
    list: (params: unknown) => ['journalEntries', 'list', params] as const,
    item: (id: string) => ['journalEntries', 'item', id] as const,
  },
```
with the shared builder (identical runtime shape):
```ts
  journalEntries: createResourceKeys('journalEntries'),
```
Add the two ad-hoc keys (e.g. after `companySettings`):
```ts
  taxCalc: (args: string) => ['taxCalc', args] as const,
  report: (path: string, params: unknown) => ['report', path, params] as const,
```

- [ ] **Step 3: Point `useTaxPreview` at the registry**

In `src/features/documents/useTaxPreview.ts`, add `import { queryKeys } from '@/lib/query/keys';` (with the other imports) and change line 25:
```ts
    queryKey: ['taxCalc', debounced],
```
to:
```ts
    queryKey: queryKeys.taxCalc(debounced),
```

- [ ] **Step 4: Point `useReport` at the registry**

In `src/features/reports/useReport.ts`, add `import { queryKeys } from '@/lib/query/keys';` and change line 8:
```ts
    queryKey: ['report', path, params],
```
to:
```ts
    queryKey: queryKeys.report(path, params),
```

- [ ] **Step 5: Verify build + the touched-area tests**

Run: `pnpm run build` → succeeds.
Run: `pnpm test --run src/features/journals src/features/reports src/features/documents/useTaxPreview.test.tsx` (run whichever of these test paths exist; if a path has no test, drop it). Expected: PASS — runtime keys unchanged, so journals/reports/tax-preview behavior is identical.

- [ ] **Step 6: Commit**

```bash
git add src/lib/query/keys.ts src/features/documents/useTaxPreview.ts src/features/reports/useReport.ts
git commit -m "refactor(query-keys): complete the registry — journalEntries via builder, fold taxCalc/report, drop dead me

journalEntries now uses createResourceKeys (same shape); taxCalc/report join the
registry; the unused me entry is removed. Runtime key values unchanged."
```

---

### Task 2: Wire the registry into the factory layer (atomic)

**Files:**
- Modify: `src/lib/crud/createResourceHooks.ts` (config + internal key source)
- Modify: `src/lib/crud/useDocumentAction.ts` (config + invalidation)
- Modify (factory configs): `src/features/accounts/hooks.ts:5`, `src/features/partners/hooks.ts:5`, `src/features/tax-codes/hooks.ts:5`, `src/features/sales-invoices/hooks.ts:15`, `src/features/payments/hooks.ts:6`, `src/features/purchase-bills/hooks.ts:15`
- Modify (lifecycle calls): `sales-invoices/hooks.ts:21,22`, `payments/hooks.ts:12,13`, `purchase-bills/hooks.ts:21,22`, `journals/hooks.ts:58,59`, `periods/mutations.ts:19,23`
- Modify (test harnesses): `src/features/documents/DocumentEditor.test.tsx:21`, `src/features/documents/DocumentListPage.test.tsx:30`, `src/lib/crud/useDocumentAction.test.tsx:28`

**Interfaces:**
- Consumes: `queryKeys.{accounts,partners,taxCodes,salesInvoices,payments,purchaseBills,journalEntries,periods}` (from Task 1 / existing), `createResourceKeys` + `ResourceKeys` (from `createResourceHooks`).
- Produces: `ResourceConfig.keys: ResourceKeys` (was `key: string`); `useDocumentAction` config `keys: { all: readonly unknown[] }` (was `key: string`). The factory still returns `keys`.

This task changes two signatures, so all call sites must land in ONE commit to keep the build green.

- [ ] **Step 1: Flip the factory config to consume `ResourceKeys`**

In `src/lib/crud/createResourceHooks.ts`, change the `ResourceConfig` field (line 13):
```ts
  key: string;
```
to:
```ts
  keys: ResourceKeys;
```
and change the internal key source (line 44):
```ts
  const keys = createResourceKeys(config.key);
```
to:
```ts
  const keys = config.keys;
```
(Keep `createResourceKeys`, the `ResourceKeys` interface, and the returned `keys` exactly as they are. `ResourceKeys` is declared in this file; the forward reference from `ResourceConfig` is fine in TypeScript.)

- [ ] **Step 2: Flip `useDocumentAction` to consume `keys.all`**

Replace the whole config + invalidation in `src/lib/crud/useDocumentAction.ts`:
```ts
export function useDocumentAction<TResult = unknown>(config: {
  key: string;
  basePath: string;
  action: string;
}): UseMutationResult<TResult, ApiError, { id: string; idempotencyKey: string }> {
  const qc = useQueryClient();
  return useMutation<TResult, ApiError, { id: string; idempotencyKey: string }>({
    mutationFn: ({ id, idempotencyKey }) =>
      apiFetch(`${config.basePath}/${id}/${config.action}`, { method: 'POST', idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [config.key] }),
  });
}
```
with:
```ts
export function useDocumentAction<TResult = unknown>(config: {
  keys: { all: readonly unknown[] };
  basePath: string;
  action: string;
}): UseMutationResult<TResult, ApiError, { id: string; idempotencyKey: string }> {
  const qc = useQueryClient();
  return useMutation<TResult, ApiError, { id: string; idempotencyKey: string }>({
    mutationFn: ({ id, idempotencyKey }) =>
      apiFetch(`${config.basePath}/${id}/${config.action}`, { method: 'POST', idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: config.keys.all }),
  });
}
```
(`config.keys.all` for a factory resource is `['salesInvoices']` etc. — identical to the old `[config.key]`. The `{ all: readonly unknown[] }` type lets `queryKeys.periods` — which has no `item` — satisfy it.)

- [ ] **Step 3: Update the 6 factory configs**

In each feature `hooks.ts`, add `import { queryKeys } from '@/lib/query/keys';` IF not already imported, and change the `createResourceHooks({ key: '<x>', … })` field to `keys: queryKeys.<x>`:
- `accounts/hooks.ts:5` `key: 'accounts',` → `keys: queryKeys.accounts,`
- `partners/hooks.ts:5` `key: 'partners',` → `keys: queryKeys.partners,`
- `tax-codes/hooks.ts:5` `key: 'taxCodes',` → `keys: queryKeys.taxCodes,`
- `sales-invoices/hooks.ts:15` `key: 'salesInvoices',` → `keys: queryKeys.salesInvoices,`
- `payments/hooks.ts:6` `key: 'payments',` → `keys: queryKeys.payments,`
- `purchase-bills/hooks.ts:15` `key: 'purchaseBills',` → `keys: queryKeys.purchaseBills,`

(`journals/hooks.ts` and `periods/mutations.ts` already import `queryKeys`; accounts/partners/tax-codes/sales-invoices/payments/purchase-bills need the import added.)

- [ ] **Step 4: Update the 10 lifecycle calls**

Change each `useDocumentAction({ key: '<x>', basePath: …, action: … })` to `{ keys: queryKeys.<x>, basePath: …, action: … }`:
- `sales-invoices/hooks.ts:21,22` → `keys: queryKeys.salesInvoices`
- `payments/hooks.ts:12,13` → `keys: queryKeys.payments`
- `purchase-bills/hooks.ts:21,22` → `keys: queryKeys.purchaseBills`
- `journals/hooks.ts:58,59` → `keys: queryKeys.journalEntries`
- `periods/mutations.ts:19,23` → `keys: queryKeys.periods`

- [ ] **Step 5: Update the 3 test harnesses**

These construct the factory/action with a synthetic key; add `import { createResourceKeys } from '@/lib/crud/createResourceHooks';` to each and change the literal:
- `src/features/documents/DocumentEditor.test.tsx:21`: `createResourceHooks({ key: 'test-docs', … })` → `{ keys: createResourceKeys('test-docs'), … }`
- `src/features/documents/DocumentListPage.test.tsx:30`: `useDocumentAction({ key: 'test-docs', … })` → `{ keys: createResourceKeys('test-docs'), … }`
- `src/lib/crud/useDocumentAction.test.tsx:28`: `useDocumentAction({ key: 'widgets', … })` → `{ keys: createResourceKeys('widgets'), … }`

(`createResourceKeys('widgets').all` = `['widgets']`, identical to the old `[config.key]`, so `useDocumentAction.test`'s invalidation assertion stays valid. Do NOT change any assertion — if one fails, the wiring is wrong, not the test.)

- [ ] **Step 6: Verify no `key:`-style factory/action call remains**

Run: `grep -rn "useDocumentAction({ key:\|createResourceHooks[^)]*{ key:\|key: 'salesInvoices'\|key: 'payments'\|key: 'purchaseBills'\|key: 'journalEntries'\|key: 'periods'\|key: 'accounts'\|key: 'partners'\|key: 'taxCodes'\|key: 'test-docs'\|key: 'widgets'" src`
Expected: no matches (every factory/action call now passes `keys:`).

- [ ] **Step 7: Full verification gate**

Run all:
```bash
pnpm run build
pnpm test --run
pnpm run lint
```
Expected: build succeeds (the real `tsc -b` — proves the two signature changes line up at all ~21 call sites with no straggler still passing `key:`); full suite passes (cache invalidation unchanged — the `useDocumentAction` test, the lifecycle/list tests, and the document/payments/journals page tests all stay green); lint = 0 errors / 8 pre-existing warnings.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(query-keys): factory + useDocumentAction consume ResourceKeys from the registry

createResourceHooks takes keys: ResourceKeys and useDocumentAction takes
keys.all, both sourced from queryKeys. Each resource base string now lives once
in lib/query/keys.ts; query key and invalidation share one object and cannot
drift. All factory configs, lifecycle calls, and test harnesses updated. Runtime
key values unchanged."
```

---

## Self-Review

**1. Spec coverage:**
- Registry is the single source: resource entries wired live (Task 2 Steps 1–4); journalEntries via `createResourceKeys` + taxCalc/report added + `me` removed (Task 1) → ✓.
- `createResourceHooks` `key → keys: ResourceKeys`, consumes it, still returns `keys` → Task 2 Step 1. ✓
- `useDocumentAction` `key → keys.all` (typed `{ all }` so `periods` fits) → Task 2 Step 2. ✓
- All consumers updated: 6 factory configs + 10 lifecycle + 2 ad-hoc + test harnesses → Tasks 1 & 2. ✓
- Behavior-preserving (runtime keys identical); build is the gate → Global Constraints + Step 7. ✓
- **Spec correction:** the spec said "2 synthetic test harnesses"; there are **3** (`DocumentEditor.test`, `DocumentListPage.test`, and `useDocumentAction.test` with `key: 'widgets'`) — all handled in Task 2 Step 5, same mechanical change, within the approved "update test harnesses" scope.

**2. Placeholder scan:** No TBD/vague steps. Exact file:line edits, the full rewritten `useDocumentAction`, exact registry edits, and grep + full-gate verification.

**3. Type consistency:** `ResourceKeys` (unchanged: `{ all; list; item }`) is what `ResourceConfig.keys` and `queryKeys.{resources}`/`journalEntries` now are. `useDocumentAction`'s `keys: { all: readonly unknown[] }` is satisfied by both `ResourceKeys` and `queryKeys.periods` (`{ all; list }`). `createResourceKeys('test-docs'|'widgets')` returns `ResourceKeys` for the harnesses. `queryKeys.taxCalc(string)`/`report(string, unknown)` match the existing call args (`debounced: string`; `path: string, params: unknown`).

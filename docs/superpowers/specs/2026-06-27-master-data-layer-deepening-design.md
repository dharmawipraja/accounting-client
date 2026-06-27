# Master-data layer deepening — design

**Date:** 2026-06-27
**Source:** Architecture review (post six-card arc), cards 1 + 2 of that review. The activate/deactivate/delete siblings of `DocumentEditor` and `DocumentListPage`.
**Decided via:** brainstorming + grilling loop (converged; two decisions settled below).

## Summary

The three **master data** features (accounts, partners, tax codes) each restate the same two patterns verbatim — the same duplication the `Document` features had before cards 1–2:

- **Form dialogs** (`AccountFormDialog`/`PartnerFormDialog`/`TaxCodeFormDialog`): each create/edit form re-implements `useForm(zodResolver)` → submit → `mutate({onSuccess: toast.success + close + reset, onError: applyApiErrorToForm})` on top of `FormDialog`, plus its own error block.
- **List pages** (`AccountsPage`/`PartnersPage`/`TaxCodesPage`): each restates offset state, `usePagedList`, the activate/deactivate/delete confirm flow, the search→`setOffset(0)` invariant, and `Pagination`.

Deepen each into one config-driven module, mirroring the proven `DocumentEditor` / `DocumentListPage` shapes. These are **separate** modules from the Document ones (per ADR-0001: master-data's lifecycle-action set is activate/deactivate/delete — no idempotency keys, plain-toast errors — not post/void/reverse; folding the two shapes into one interface would yield a shallow, config-heavy module).

**Decisions settled:** (1) one combined branch/spec/plan, executed as a 2-task SDD (form, then list); (2) `MasterDataFormDialog` renders the `code` field error for all three forms — surfacing the 409 duplicate-code error that partner/tax-code dialogs currently set but never display (a small consistency fix bundled in).

## Module A — `MasterDataFormDialog`

A **component** (home: `src/features/master-data/` or `src/components/common/` — implementer's call, co-located with `FormDialog`), fields supplied via a `(form) => ReactNode` render-prop. Mode-agnostic: it models "a validated dialog form bound to one submit"; the feature wires a create-config or an edit-config and decides which to render.

**Owns:** the `FormDialog` shell wiring (open/title/description/onSubmit/pending); RHF setup (`zodResolver(config.schema)` + `config.defaultValues`); the submit lifecycle —
```
async (values) => {
  try { await config.submit(values); toast.success(t.crud.saved);
        if (config.resetOnSuccess) form.reset(); config.onOpenChange(false); }
  catch (err) { applyApiErrorToForm(err, form, t); }
}
```
`pending` derives from `form.formState.isSubmitting`; the shared error block renders `errors.root` **and** `errors.code` (both, for all three forms).

**Config (caller supplies):** `{ open, onOpenChange, title, description?, schema, defaultValues, resetOnSuccess, submit: (values) => Promise<unknown>, fields: (form) => ReactNode }`. The `submit` closure absorbs the create-vs-update mutate-shape difference (`create.mutateAsync({...values, parentCode: …})` vs `update.mutateAsync({ id, data: values })`) and any payload transform. Account's `subtype → type/normalBalance` derivation effect lives inside its `fields` (it has `form`); the module never sees domain-specific field logic.

Each feature's create/edit form shrinks to ~25 lines (config + bespoke `fields`). `FormDialog` stays as-is (the shell). Mirrors `DocumentEditor`.

## Module B — `MasterDataListPage` + `useMasterDataListController`

Home: `src/features/master-data/`. A **separate** controller from `useDocumentListController` (different action shape). `MasterDataListPage(config)` is the default surface; `useMasterDataListController(config)` is the exported escape hatch (mirrors the card-1 split).

**Controller owns:** `offset` state + the **search→`setOffset(0)`** invariant; the master-data action flow — `activate` (immediate, `toast.success(t.crud.activated)`), `deactivate` (confirm → `t.crud.deactivated`), `delete` (confirm → `t.crud.deleted`), each `onError → toast.error(t.common.error)`; the `ConfirmDialog` wiring (deactivate vs delete titles/labels/`destructive`/`pending`); `Pagination`; and the create/edit dialog open state. Errors are plain toasts (no `toastApiError`/idempotency — master-data actions are not key-covered).

**Config (caller supplies):** `{ title, newRole, columns: (handlers) => ColumnDef[], list: usePagedList result, actions: { activate, deactivate, remove }, formDialog: (props) => ReactNode, search?: (row, q) => boolean, renderData?: (rows, columns) => ReactNode }`. `columns(handlers)` receives `{ onEdit, onToggleActive, onDelete }` (the controller's wired handlers), exactly as the pages build columns today. `renderData?` defaults to a flat `<DataTable columns data />`; **accounts overrides it** with its type-grouped sections (`ACCOUNT_TYPE_ORDER` → per-type `<section><DataTable/></section>`) — the one render difference, kept out of the controller. Page-scoped search (filter over the current page's `env.data`) is preserved.

Each list page shrinks to a config declaration (mirrors `DocumentListPage` reducing the document pages ~120→~46 lines).

## How they compose

A list page's create/edit slot renders the feature's `MasterDataFormDialog`-powered dialog (via `config.formDialog`). So Module A refactors the dialog internals; Module B refactors the page and renders the dialogs. Build order: **A then B** (clean dialogs first, then wire them).

## Migration (the churn)

- **Module A:** create `MasterDataFormDialog`; migrate the 3 dialogs' create+edit forms to it (account keeps its subtype-derivation effect in `fields`; partner/tax-code gain the now-shown `code` error block).
- **Module B:** create `MasterDataListPage` + `useMasterDataListController`; migrate `AccountsPage` (with `renderData` grouping), `PartnersPage`, `TaxCodesPage` to configs.
- **Unchanged:** Documents (keep `DocumentEditor`/`DocumentListPage`); `FormDialog`, `ConfirmDialog`, `DataTable`, `Pagination`, `QueryState` (reused); the resource-hooks factory (the pages still call `accountsApi.usePagedList`/`useDeactivate`/etc.); routes/nav/field-names (redesign-preserve).

## Testing

- **Regression net:** the existing form-dialog tests (Account/Partner/TaxCode) and the 3 page tests stay green — behavior is preserved **except** the deliberate consistency fix (partner/tax-code now display the 409 `code` error). Update those two tests if they assert the error is absent; add/adjust to assert it now shows.
- **New interface tests:** `MasterDataFormDialog` (submit→success toast+close+reset; submit-throw→`applyApiErrorToForm`; root+code error block; `pending` from `isSubmitting`) via a synthetic resource, mirroring the `DocumentEditor` test harness. `useMasterDataListController`/`MasterDataListPage` (offset reset on search; activate-immediate vs deactivate/delete-confirm flow; pagination), via a synthetic master-data resource.
- **Gate:** `pnpm run build` (real `tsc -b && vite build`) + `pnpm test --run` + `pnpm run lint` (0 errors / 8 pre-existing warnings). `pnpm run build` is the real typecheck.
- **Dependency category:** in-process; UI/state consolidation.

## Global constraints (carried into the plan)

- Behavior-preserving **except** the one settled consistency fix (partner/tax-code show the `code` error). No other user-facing change; routes/nav-labels/form-field names unchanged.
- Money via `Money` (n/a here); i18n via `useT()` — all copy through `t.*`, no hardcoded user-facing strings, no em-dashes. Pre-existing React-Compiler/RHF/TanStack-Table lint warnings (8) are expected — do not "fix" them.
- `pnpm run build` is the real typecheck (not `tsc --noEmit`); lint stays at 0 errors / 8 warnings.

## Out of scope

- The Document features (already deepened) and any change to `DocumentListPage`/`DocumentEditor`/`useDocumentListController`.
- The account enum/label single-source seam (card 3 of the review) and the wider i18n enum-value leaks — separate, not bundled.
- Folding master-data into the Document modules (ADR-0001 forbids; these are deliberately separate modules).
- Re-skinning or changing the accounts type-grouped display, role gating, or any field set.

# Domain context — Buku

Domain glossary for the Buku Indonesian accounting client. Names good seams and sharpens
terms so code, docs, and architecture reviews use one vocabulary. Seeded 2026-06-25 by an
architecture review; grows as terms are sharpened or added.

## Terms

**Document**
A *sales invoice*, *purchase bill*, *payment*, or *journal entry* — an entity that carries a
**draft → post lifecycle** (`DRAFT → POSTED → VOID`/`REVERSED`) and, once posted, a journal
effect. Distinct from **master data** (accounts, partners, tax codes), which has an
activate/deactivate lifecycle and no posting. Use "Document" for the four lifecycle-bearing
entities collectively. The shared tax/totals core for Documents lives in `src/features/documents/`.

**Lifecycle action**
A state transition applied to a single Document: **post**, **void**, **reverse**, or **delete**
(draft only). `post`/`void`/`reverse` are *idempotency-key-covered* writes — each mints a key and
surfaces domain errors (e.g. `SEGREGATION_OF_DUTIES`) via `toastApiError`. `delete` is not
key-covered and uses a plain error toast. Invoices/bills/payments use `post · void · delete`;
journals use `post · reverse · delete`.

**Document list**
The paginated register view of one Document kind — the four list pages
(sales invoices, purchase bills, payments, journals). Each is a server-paginated envelope
(`{data,total,limit,offset}`, `limit 20`) with **page-scoped search** (client filter over the
current page) and button-strip filters that map to server query params: `status` for all four,
plus `direction` (payments) and `sourceType` (journals). Master-data lists are a *separate,
smaller pattern* and are deliberately not Document lists.

**DocumentListPage** / **useDocumentListController** *(decision 2026-06-25 — design converged, not yet built)*
The deepened module that concentrates the Document-list lifecycle. `DocumentListPage(config)` is
the default surface — a page declares `{ title, columns, list, actions, filters?, newControl,
search?, initialFilters? }` and the module owns the pending-action state machine, idempotency
minting, the confirm → mutate → toast → close dispatch, the offset-reset-on-filter/search
invariant, pagination, and the `ConfirmDialog` wiring. `useDocumentListController` is the exported
escape hatch for a page that needs bespoke layout. Idempotency and error-routing are *derived from
the lifecycle action kind*, not configured. Scope is the four Documents only — master-data pages
are intentionally excluded (folding them in would force one interface over two unrelated action
shapes and yield a shallow, config-heavy module).

**DocumentEditor** / **DocumentLineRow** *(decision 2026-06-25 — design converged, not yet built)*
The deepened editor that concentrates the invoice/bill document-editor lifecycle (the AR/AP sibling
of DocumentListPage). `DocumentEditor({ config, mode, doc, readOnly, onSaved })` owns the RHF setup,
the `lines` field array, the tax `previewLines` + `<DocumentTotals>`, the create/edit submit
(`applyApiErrorToForm` + `toast.success` + `onSaved`), and the readOnly banner. Config (mirrors
`DocumentListConfig`) supplies `nature` (SALE/PURCHASE), `settlementAccountCode` (1-1200 AR /
2-1000 AP), `allowedTaxKinds`, `partnerFilter`, `formSchema`, `toFormValues`/`toPayload`, injected
`create`/`update` mutations, `labels`, `docRef`, and an optional type-safe `extraHeaderField`
descriptor (the bill-only `vendorInvoiceNo` — the single structural difference between the editors).
A shared `documentHeaderSchema` + `documentLineFormSchema` + `safeAmount` + `EMPTY_LINE` live in
`src/features/documents/`; each feature's form schema composes from the base (bill `.extend()`s
`vendorInvoiceNo`). Scope is invoice + bill only — payments (allocations) and journals (balanced
debit/credit) editors are different shapes and stay separate.

**DocumentEditorPage** / **DocumentEditorPageConfig** *(decision 2026-07-02 — BUILT; `src/features/documents/DocumentEditorPage.tsx` + `.test.tsx`, 6 tests)*
The route-level wrapper that concentrates the editor-page lifecycle shared by the invoice/bill/payment
editor pages — the load/mode/not-found sibling of `DocumentListPage`, sitting *above* the form body (so
it does **not** touch the "editors stay separate" decision; the tax/balance/allocation bodies remain
distinct). `DocumentEditorPage({ config, id })` owns `config.useItem(id ?? '')` (disabled when no id),
the create-vs-edit branch, the `QueryState` + `SkeletonForm fields={6}` + `NotFound` envelope, the
**editable-only-while-DRAFT invariant** (`readOnly = doc.status !== 'DRAFT'`, previously re-declared
verbatim in each wrapper), the `PageHeader` create/edit/view-title frame, and navigate-on-save.
`DocumentEditorPageConfig` (named to avoid colliding with the existing form-body `DocumentEditorConfig`)
supplies `useItem` (the `(id) => UseQueryResult<Doc, ApiError>` loader hook),
`onDone` (the typed navigate closure — feature-supplied so TanStack route literals keep their types,
mirroring `DocumentListConfig.newControl`), a pre-rendered `back` `<BackLink>`, `titles {create,edit,view}`,
and the one real seam `renderForm({ mode, doc, readOnly, onSaved })` — which maps `doc` onto each form's
differently-named prop (`DocumentEditor doc=` vs `PaymentForm payment=`) and threads Payment's `direction`
(direction stays in the feature component's scope; it never enters the module interface). Each feature
keeps a thin page component that builds the config (parallel to `SalesInvoicesPage` over `DocumentListPage`),
shrinking ~53 lines to ~18. **No separate controller hook** (unlike the list — the editor page holds no
state machine, only `useItem` + a derived `readOnly`). Scope is invoice/bill/payment; journals stay
bespoke — `JournalEntryEditorPage` is create-only with a read-only detail-table edit view, a genuinely
different lifecycle shape. The four wrappers have **no** direct tests today, so this also creates a single
test surface (`DocumentEditorPage.test.tsx`) for the currently-unverified load/not-found/readOnly/navigate
logic; the per-feature form tests are unchanged.

**useDocumentSubmit** / **ReadOnlyBanner** *(decision 2026-07-02 — BUILT)*
The two byte-identical seams shared by the document-family form bodies, extracted from
`DocumentEditor` + `PaymentForm` + `JournalEntryForm` (candidate 1(b)). `useDocumentSubmit(form, onSaved)`
(`src/features/documents/useDocumentSubmit.ts`) concentrates the shared save policy — on success
`toast.success(t.crud.saved)` + `onSaved()`, on error `applyApiErrorToForm(err, form, t)` — and returns
the `{ onSuccess, onError }` mutation callbacks each form passes to `create`/`update` `.mutate(payload, handlers)`;
used by all three (journal is create-only). `ReadOnlyBanner` (`src/features/documents/ReadOnlyBanner.tsx`)
concentrates the posted/void banner styling + the VOID-vs-POSTED label choice + the ` (ref)` suffix; used
by `DocumentEditor` + `PaymentForm` (journal has no readOnly path). The create-vs-edit `mutate` branch was
**deliberately left in each form** — it is entangled with each form's payload building and payment's
allocation guard, so folding it would move complexity rather than concentrate it.

**columnKit** / **documentColumns** *(decision 2026-07-02 — BUILT)*
The register-table column builders that concentrate the previously hand-rolled column-assembly glue
(candidate 2). Generic builders in `src/components/common/columnKit.tsx` — `textColumn` (em-dash fallback),
`dateColumn` (`slice(0,10)` + `formatDateID`), `moneyColumn`/`moneyDisplayColumn` (`MoneyText`, right-aligned),
`activeStatusColumn` (`StatusBadge`), `masterActionsColumn` (`RowActions`) — used by all seven `columns.tsx`.
Document-specific builders in `src/features/documents/documentColumns.tsx` — `docStatusColumn`,
`paymentStatusColumn`, and `documentActionsColumn` (invoice/bill/payment; journals keep their bespoke
POSTED+MANUAL reverse action). Money columns are now **right-aligned**: `DataTable` reads a new
`columnDef.meta.align` (an augmented `ColumnMeta`) and applies `text-right`/`text-center` to header + cell,
fixing the drift where `MoneyText` documented itself as "right-aligned" but `text-right` was never wired.
`documentActionsColumn` takes a `renderOpenLink(row, label)` closure so each feature supplies its route-typed
`<Link>` (same route-literal-preservation trick as `DocumentEditorPageConfig` / `DocumentListConfig.newControl`).
The leaf renderers (`MoneyText` / `StatusBadge` / `StatusChip` / `formatDateID`) were already deep — only the
column-assembly adapter was duplicated.

**EntitySelect** / **EntityMultiSelect** / **useEntitySelect** / **useEntityLabelMap** *(decision 2026-07-02 — BUILT; `src/components/common/EntitySelect.tsx` + `src/lib/hooks/useEntityLabelMap.ts`)*
The deepening of the three master-data combobox widgets (round-2 candidate 1). A shared
`useEntitySelect(adapter)` (`src/components/common/EntitySelect.tsx`) concentrates the load
(`useList` → `data ?? []`), the domain filter + sort-by-code, open-state, and a `status`
(loading/error/ready), behind an `EntitySelectAdapter<T>` = `{ useList, getValue, getLabel,
getSearchText?, filter? }`. Two thin faces sit over it: `EntitySelect` (single; value `string`,
close-on-select) and `EntityMultiSelect` (multi; value `string[]`, toggle, chips via `getChipLabel?`),
sharing an internal `EntityCommand` option-list — `CommandInput` + a `CommandEmpty` that now
**distinguishes loading vs error vs no-data** (previously always "no data") + the `Check` indicator +
the `role="combobox"` a11y. The public `AccountSelect` / `PartnerSelect` / `TaxCodeMultiSelect` become
thin per-entity adapters (unchanged props, so the 8 call sites don't move) supplying `useList` +
`getLabel` (`code — name`) + `getSearchText` (`code name`) + a `filter` (postable+active /
customer-vendor / allowedKinds). Separately, **`useEntityLabelMap`** (`src/lib/hooks/`) concentrates the
`useList` + id→label `Map` + `?? id` fallback that six list/editor pages hand-build (PaymentsPage ×2,
TaxCodesPage, JournalEntryEditorPage, PurchaseBillsPage, SalesInvoicesPage); each passes its own
`toLabel` (`name` vs `code — name`), so the format stays per-site while the load+map plumbing lives once.
The combobox a11y/keyboard/empty-state surface — previously authored three times — becomes the test
surface once.

**FieldError** *(decision 2026-07-02 — BUILT; `src/components/common/FieldError.tsx`)*
The shared leaf for form field-error display (round-2 candidate 4). `FieldError`
(`src/components/common/FieldError.tsx`) renders the `role="alert"` + `text-sm text-destructive` markup for a
message, or nothing when the message is falsy — concentrating the alert a11y-role + destructive styling that
was inlined ~23× across eight forms (MasterDataFormDialog, Partner/TaxCode dialogs, DocumentEditor,
PaymentForm, JournalEntryForm, LoginForm). Callers still resolve the message (`msg`/`err` namespace lookups,
fixed labels, `errors.root?.message`), so the leaf stays dumb (`message?: string | null`). Two intentionally
distinct sites are **not** migrated — `AllocationTable` (`text-xs`, in-cell) and `DocumentTotals`
(bare `text-destructive`, tax-preview error) — to preserve their different sizing. This also closes an
inconsistency: `AccountFormDialog` previously showed **no** per-field errors (only the shared root/code
block); it now shows a required message for `name` like its Partner/TaxCode siblings. A leaf, not a
structural deepening — adopted for breadth (one home for the convention) + a11y consistency.

**Pagination** *(decision 2026-07-02 — BUILT)*
The single offset pager for both list shapes (round-2 candidate 3). `Pagination`
(`src/components/common/Pagination.tsx`) takes union props: `total` (total-known — the paginated-envelope
lists `DocumentListPage`/`MasterDataListPage`: "showing from–to of total" label + Next off at
`offset+limit >= total`) XOR `count` (total-inferred — the bare-array `/audit` log: no label + Next off at
`count < limit`). The separate `OffsetPager` was deleted and its `audit.prev/next` i18n folded into
`common.prev/next` (identical copy). Two adapters over one offset-stepping concept, the
total-known-vs-inferred seam named explicitly.

**StatementReportPage** *(decision 2026-07-02 — BUILT)*
The shared shell for the three hierarchical statement reports — balance sheet, income statement,
cash flow (candidate 3). `StatementReportPage({ config })` (`src/features/reports/StatementReportPage.tsx`)
owns the `PageHeader` + `BackLink` + `ReportDateControls` + `useReport` + `ReportContent` + `StatementView`
shell and the `yearStart()` default range-start (previously duplicated verbatim across the trio + GL).
`StatementReportConfig` supplies `title`, `path`, `schema`, `mode` (`'asOf'` single-date vs `'range'`
from/to, gated on `isRangeValid`), the one per-report seam `buildRows(data, t) => StatementRow[]`, and an
optional `footer(data, t)` (balance sheet's balanced/unbalanced `Badge`). Scope is the hierarchical trio
only — Aging (master-detail + dynamic buckets + kind), General Ledger (extra `AccountSelect` + empty-state
gating; keeps its own `yearStart`), and Trial Balance (columnar `ReportTable` + client-side balanced check)
stay bespoke; forcing them through one config would degenerate it into a render-prop bag. `ReportContent`
(a shallow pass-through over `QueryState`) is still shared with the table-family report pages and kept.

**Dashboard report queries** *(decision 2026-07-02 — BUILT)*
The dashboard's three financial-summary cards (balance sheet / income statement / cash flow) reuse the
reports feature's schemas + `useReport` (`queryKeys.report(path, params)`) instead of a parallel narrow
schema + a `queryKeys.reports.*` key family (round-2 candidate 2). `dashboard/hooks.ts`
`useBalanceSheet`/`useIncomeStatement`/`useCashFlow` delegate to
`useReport(path, params, <reports schema>, enabled)`, so one schema is the single home for each endpoint's
contract and a dashboard card shares one cache entry with its report page when the date params coincide (no
double fetch). zod keeps the full hierarchical shape the card ignores. The former `dashboard/schema.ts`
report schemas and the `queryKeys.reports` namespace are deleted; only `draftCountSchema` (the
draft-journal count — a `/ledger/journal-entries?status=DRAFT&limit=1` query, a *separate* concern) remains,
now keyed `queryKeys.draftCount()`.

**createDocumentHooks.useAction** *(decision 2026-07-02 — BUILT; `src/lib/crud/createResourceHooks.ts` + `useDocumentAction.ts`)*
The lifecycle-action-hook builder on the document CRUD factory (round-3 candidate 1). `createDocumentHooks(config)`
now returns a `useAction(action: DocumentActionKind)` member that mints a `useDocumentAction`-backed hook from the
factory's own `keys` + `basePath` — so a Document feature declares its resource identity once (the factory call) and
derives named lifecycle-action hooks from it (`usePostInvoice = () => salesInvoicesApi.useAction('post')`) instead of
re-supplying `{keys, basePath}` to `useDocumentAction` per hook. `DocumentActionKind = 'post' | 'void' | 'reverse'`
(defined in `lib/crud/useDocumentAction.ts`); the raw `useDocumentAction` keeps its open `action: string` as the
escape hatch for **periods** (`close`/`reopen` — bespoke key shape, never a factory instance) and for **journals**
until it is folded onto the factory (round-3 candidate 2). Scope of this change: invoice/bill/payment (6 action hooks);
journals + periods keep raw `useDocumentAction`.

**mutationFeedback** *(decision 2026-07-02 — BUILT; `src/lib/api/mutationFeedback.ts`)*
The shared confirm-action result policy (round-3 candidate 3) — the list-side analog of `useDocumentSubmit`.
`mutationFeedback({ t, success, errorMode?, onClose? })` (`src/lib/api/mutationFeedback.ts`) returns the
`{ onSuccess, onError }` to spread into `mutation.mutate(vars, …)`: on success `toast.success(success)` +
`onClose?()`; on error route via `toastApiError` (`errorMode:'domain'` — the idempotency-keyed lifecycle and
period actions, so SoD/closed-period errors get their real messages) or `toast.error(t.common.error)`
(`'plain'`, the default) + `onClose?()`. The three confirm state machines stay bespoke (ADR-0001 — divergent
action shapes); only the result *policy* concentrates. Adopters: `useDocumentListController` (delete=plain,
keyed=domain), `useMasterDataListController` (deactivate/delete/activate — plain), `PeriodsPage`
(close/reopen/generate/year-end — domain). **Two drifts closed:** master-data now closes its confirm dialog on
error too (was success-only), and Periods now toasts success/error at all (previously silent via bare
`onSettled` — a real feedback gap). `onClose` is omitted for the immediate master-data activate (no dialog).

**Resource-hooks factories** *(decision 2026-06-26)*
The CRUD hook factory is split along the Document / master-data line over a shared
private `createCrudHooks` core (list/pagedList/create/update/remove): `createMasterDataHooks`
adds activate/deactivate (no detail view) for accounts/partners/tax-codes;
`createDocumentHooks` adds `useItem` (no activate/deactivate) for sales-invoices/payments/
purchase-bills, whose draft/post/void lifecycle transitions go through `useDocumentAction`.

**MasterDataFormDialog** / **MasterDataListPage** / **useMasterDataListController** *(decision 2026-06-27 — design converged, not yet built)*
The master-data layer's deepenings — the activate/deactivate/delete siblings of `DocumentEditor`
and `DocumentListPage`, covering the three **master data** features (accounts, partners, tax codes).
`MasterDataFormDialog(config)` is a component (fields via a `(form) => JSX` render-prop) that owns
the `FormDialog` shell, RHF setup (`zodResolver(config.schema)` + `defaultValues`), the submit
lifecycle (`await config.submit(values)` → `toast.success(t.crud.saved)` + optional `form.reset()` +
close; on throw → `applyApiErrorToForm`), `pending` (from `form.formState.isSubmitting`), and the
shared root+`code` error block (the `code` block now shown for all three, surfacing the 409
duplicate-code error partner/tax-code previously swallowed). `MasterDataListPage(config)` on
`useMasterDataListController(config)` owns offset state, the search→`setOffset(0)` invariant, the
activate (immediate) / deactivate / delete confirm→mutate→toast flow, `Pagination`, and create/edit
open state; a `renderData?` slot handles accounts' type-grouped display (default = flat `DataTable`).
A **separate** module from `DocumentListPage` (per ADR-0001): master-data's lifecycle-action set is
activate/deactivate/delete — no idempotency keys, plain-toast errors — not post/void/reverse.

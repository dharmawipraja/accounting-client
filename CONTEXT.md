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

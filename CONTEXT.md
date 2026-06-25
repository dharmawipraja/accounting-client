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

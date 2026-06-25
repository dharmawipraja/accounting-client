# 1. Document-list deepening: scope and shape

- Status: accepted
- Date: 2026-06-25
- Deciders: project owner + architecture review

## Context

Four list pages — sales invoices, purchase bills, payments, journals (collectively
**Documents**, see [[CONTEXT.md]]) — restate the same **Document list** lifecycle nearly
verbatim: a `PendingAction` discriminated state, a `runAction` dispatch (confirm → mutate →
success toast → `toastApiError`/plain-toast → close), `crypto.randomUUID()` idempotency minting,
`ConfirmDialog` wiring, status (+direction/+sourceType) filters mapped to server query params, and
a page-scoped search over the paginated envelope. The duplication is exact and has already caused
drift (a missing `setOffset(0)`-on-search class of bug). An architecture review proposed deepening
this into one module.

Two questions had to be settled: **scope** (which pages the module covers) and **interface shape**
(how callers drive it).

## Decision

**Scope — the four Documents only.** The deepened module covers sales invoices, purchase bills,
payments, and journals. Master-data lists (accounts, partners, tax codes) are **explicitly out of
scope**: they carry a different **lifecycle action** set (activate/deactivate/delete, no
post/void/reverse), and accounts additionally render grouped-wholesale rather than paginated.

**Shape — config-driven page on an exported controller hook.** `DocumentListPage(config)` is the
default surface; a page declares `{ title, columns, list, actions, newControl, filters?, search?,
initialFilters? }`. It is built on an exported `useDocumentListController(config)` hook that serves
as the escape hatch for any future page needing bespoke layout. Idempotency minting and
error-routing are **derived from the lifecycle-action kind**, not configured. Home:
`src/features/documents/`.

## Alternatives considered

- **Fold all seven list pages into one module.** Rejected: one interface would have to span two
  unrelated action shapes (post/void/reverse *and* activate/deactivate) plus paginated *and*
  grouped-wholesale rendering, yielding a config-heavy **shallow** module — interface nearly as
  complex as the implementation. Two genuinely different patterns should stay two modules.
- **Four composable parts** (`useDocumentListState` + `useDocumentActions` + `DocumentConfirmBar`
  + `DocumentFilterBar`). Rejected: all four pages want the *same* composition, so four external
  seams are hypothetical (one adapter = hypothetical seam). It buys unused flexibility at the cost
  of the widest interface and makes the offset-reset invariant unenforceable (the filter bar is
  optional). Its one real insight — state machine vs dispatch are distinct — is kept as an
  *internal* seam inside the controller.
- **Hook-only** (logic concentrated, pages keep their JSX). Rejected as the *primary* surface: it
  leaves the filter/table/dialog layout duplicated across four pages. Retained as the escape-hatch
  layer beneath `DocumentListPage`.

## Consequences

- **Locality:** the lifecycle, idempotency, offset-reset discipline, and confirm wiring live in one
  module and are tested once; the search-offset bug class becomes structurally impossible.
- **Leverage:** a fifth Document page is a config declaration, not a copy.
- **Bet:** error-routing/idempotency are derived from action kind (stable per the API's
  idempotency contract). If a future action is key-covered yet wants plain-toast errors (or vice
  versa), add a per-action override — do not re-open the scope.
- **Do not re-suggest** folding master-data list pages into this module, or splitting it into
  externally-composable parts, without new evidence that overturns the reasoning above.

> Records a decision from the 2026-06-25 architecture review. The design is converged but not yet
> implemented; implementation is a separate spec → plan → build cycle.

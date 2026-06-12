# Indonesian Accounting Web Client — Design

**Date:** 2026-06-12
**Status:** Approved (brainstorming) — ready for implementation planning
**API:** Indonesian Accounting API (NestJS + Prisma + PostgreSQL, SAK/PSAK). See
`docs/api/frontend-agent-brief.md`, `docs/api/frontend-guide.md`, `docs/api/openapi.json`.

## 1. Goal

Build a production-grade web client for a **single-company Indonesian accounting API**
(Indonesian GAAP / SAK). The API covers chart of accounts, journals, AR/AP (sales
invoices, purchase bills, payments), PPN/PPh tax, the standard financial statements,
and period / year-end close. Documents follow a **draft → post → (void/reverse)**
approval flow with a 4-role RBAC model and segregation-of-duties enforcement.

This spec covers the **architecture + the first vertical slice**. Later domains
(journals + approval queue, purchase bills, the six full report screens, periods,
year-end close, audit log, company settings) each get their own spec → plan → build
cycle, reusing the foundation proven here.

## 2. Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Build approach | **Vertical slice first** | Prove the full cross-cutting foundation on real screens, then replicate the pattern across remaining domains |
| Framework / routing | **Vite SPA + TanStack Router** | Type-safe routing; no SSR complexity for a separate bearer-token API; pairs with React Query and React 19 + Compiler |
| Type / data strategy | **openapi-typescript + Zod response schemas** | Spec only types requests; responses are untyped, so we hand-author Zod response schemas and parse at the fetch boundary |
| Token storage | **localStorage + refresh-on-401** | Survives reload and multiple tabs; simplest robust choice for an SPA against a bearer API (no httpOnly-cookie option) |
| UI language | **Bahasa Indonesia now, English-ready later** | Domain-native; centralize strings behind a locale layer so English is a drop-in later, without paying full i18n-framework cost now |
| Visual direction | **Branded & polished**, light + dark | Confident fintech identity; optimized for accountant data entry and report scanning |

## 3. Stack

| Concern | Choice |
|---|---|
| Build / language | Vite 7, TypeScript, React 19 |
| Compiler | React Compiler (Vite/Babel plugin) + its ESLint rule |
| Routing | TanStack Router (file-based) |
| Server state | TanStack Query v5 |
| Client / UI state | Zustand (session, theme, transient UI only — never server data) |
| Validation | Zod (response parsing **and** form schemas) |
| Forms | React Hook Form + @hookform/resolvers (Zod) |
| Tables | TanStack Table v8 (headless) over shadcn table |
| Money / decimal | decimal.js, wrapped in a `Money` module |
| Dates | date-fns (+ `id` locale); dates handled as plain `YYYY-MM-DD` strings |
| HTTP | Custom `fetch` wrapper (the auth-refresh / envelope / idempotency logic is bespoke) |
| Codegen | openapi-typescript (request types from `openapi.json`) |
| Toasts / icons | sonner / lucide-react |
| Styling | Tailwind CSS v4 + shadcn/ui (CSS-variable theming, light/dark) |
| Tests | Vitest + React Testing Library + user-event + MSW |
| Tooling | pnpm, ESLint (+ react-hooks / react-compiler rules), Prettier |

Config: API base URL via `VITE_API_BASE_URL`.

## 4. Project structure (feature-sliced)

```
src/
  app/                 # bootstrap: providers (QueryClient, Theme, Auth), root layout
    routes/            # TanStack Router file-based routes → thin wrappers over feature pages
  features/            # one folder per domain: components + hooks/queries + schemas
    auth/  dashboard/  accounts/  partners/  tax-codes/  sales-invoices/  payments/
  lib/
    api/               # fetch wrapper, single-flight 401-refresh, idempotency, ApiError
    money/             # Money value object + rupiah formatter
    schemas/           # Zod response schemas (+ re-exported generated request types)
    i18n/              # locale catalogs (id.ts) + useT() hook  ← English-ready
    format/            # date + number formatting (id-ID)
  components/
    ui/                # shadcn primitives (generated)
    common/            # DataTable, MoneyInput, RoleGate, ErrorState, PageHeader, …
  stores/              # zustand: session, theme, ui
  types/               # generated openapi types (api.d.ts)
  test/                # Vitest setup, MSW handlers, fixtures
```

Each `features/<domain>` is self-contained — what it does, how you use it, what it
depends on — so it can be tested in isolation and the pattern replicated across later
phases.

## 5. Cross-cutting foundation (built once)

This is the core of the slice; every later phase reuses it.

### 5.1 API client (`lib/api`)
- Typed `fetch` wrapper attaching `Authorization: Bearer <accessToken>`.
- Parses the universal error envelope `{ code, message, details?, traceId? }` into a
  typed **`ApiError`** carrying `status`, `code`, `traceId`, and `details.errors[]`.
- Captures the `X-Request-Id` response header (equals `traceId`).
- **Single-flight 401-refresh:** concurrent 401s share one `POST /auth/refresh` call,
  persist the fresh pair, then retry the original request **once**. Refresh failure
  clears the session and redirects to `/login`.
- **429:** back off, honoring `Retry-After`.
- **Branch on `code`, never on `message`.** Respect the 400 (bad shape) vs 422
  (domain-rule violation) split.

### 5.2 Auth / session (`stores/session` + `features/auth`)
- Token pair held in memory + **localStorage**.
- On app load: hydrate from localStorage, then `GET /auth/me` → `{ id, email, role }`.
- `RoleGate` component + `useRole()` hook hide/disable actions per the role matrix
  (VIEWER / ACCOUNTANT / APPROVER / ADMIN).
- Every mutation still handles `403 FORBIDDEN` and `403 SEGREGATION_OF_DUTIES`
  defensively — SoD is *not* fixed by elevating the role; the UI prompts handing the
  document to a different approver.
- No server logout: "log out" discards both tokens.

### 5.3 Money (`lib/money`)
- `Money` wraps decimal.js — constructed from 4dp strings, arithmetic stays decimal.
- `.toApi()` → `toFixed(4)` string (`ROUND_HALF_UP`, matching the server / Faktur
  Pajak rounding); `.toRupiah()` → e.g. `Rp 2.000.000` via `Intl.NumberFormat('id-ID')`.
- **Never `parseFloat`/`Number()` a money value.** `MoneyInput` keeps the raw string;
  floats never touch amounts. Money travels as 4dp strings on the wire end-to-end.

### 5.4 Schemas (`lib/schemas`)
- Responses are untyped in OpenAPI, so we **hand-author Zod schemas** for every
  response shape (accounts, partners, tax codes, invoices, payments, journal entries,
  reports) and **parse at the fetch boundary** — runtime safety + enforced
  money-as-string. Request types come from openapi-typescript.

### 5.5 Errors → UI
- Central mapper: `details.errors[]` → React Hook Form field errors; tailored messages
  for `UNBALANCED_ENTRY`, `INVALID_ACCOUNT`, `CLOSED_PERIOD`, `CLOSED_YEAR`,
  `SEGREGATION_OF_DUTIES`; everything else → toast.
- All error states surface **`traceId`** ("Ref: `<traceId>`") for support correlation.

### 5.6 i18n-ready (`lib/i18n`)
- All visible strings live in `id.ts`, accessed via `useT()`. One locale ships now;
  adding `en.ts` later is a drop-in. No scattered hardcoded strings.

### 5.7 Formatting (`lib/format`)
- Dates as plain `YYYY-MM-DD`; display `dd/mm/yyyy` via date-fns `id` locale.
- Report params respect the split: `?asOf=` (balance sheet, AR/AP aging, trial
  balance, account balance) vs `?from=&to=` (income statement, cash flow, general
  ledger; `from ≤ to` or `422 VALIDATION_FAILED`).

## 6. State & data flow

- **Server data → React Query only.** Per-feature `queryKeys` factories
  (`['accounts']`, `['sales-invoices', id]`, `['journal-entries', filters]`).
- **Pagination is not uniform:** only `GET /ledger/journal-entries` returns the
  `{ data, total, limit, offset }` envelope (limit default 50, max 200). **Every other
  list — including `/audit` — is a bare array** (do not read `.data`). The `DataTable`
  supports both modes.
- **Client state → Zustand only** (session, theme, transient editor bits). Server data
  is never duplicated into Zustand.
- **Mutations** carry a per-action `Idempotency-Key` (`crypto.randomUUID()`) on
  post/reverse/void so retries can't double-post. On success they invalidate the
  relevant query keys (e.g. posting an invoice invalidates the invoice, its list,
  AR aging, and dashboard cards).
- **Soft-delete → 404:** deleting/deactivating makes a resource 404 and removes it
  from lists; treat that 404 as "deleted", not a crash. Unique codes become reusable.

## 7. Vertical slice — features

The natural minimal closure that exercises every cross-cutting concern end-to-end.
To post a sales invoice you need a partner, a revenue account, and tax codes; to
collect it you need a payment.

| # | Feature | What it proves |
|---|---|---|
| 1 | **Auth** — login, refresh, `/auth/me` hydration, protected-route guard, role context | The whole auth/refresh/role foundation |
| 2 | **App shell** — role-aware sidebar, topbar (company name from `/company/settings`, user menu, theme toggle), global toaster, error boundary w/ `traceId` | Layout + role-gating + error surface |
| 3 | **Dashboard** — summary cards from `balance-sheet` / `income-statement` / `cash-flow` + open-drafts count from `journal-entries?status=DRAFT` | Report reads **and** the one enveloped list |
| 4 | **Chart of Accounts** — list (bare array, grouped by `N-` ranges), create/update (ACCOUNTANT+), deactivate/delete (ADMIN), balance `?asOf=` | Bare-array list, role-gated CRUD, account enums |
| 5 | **Partners** — list + create/update (ACCOUNTANT+), deactivate/delete (ADMIN) | Supporting CRUD (needed to invoice) |
| 6 | **Tax codes** — list + create/update | Supporting CRUD (needed for PPN lines) |
| 7 | **Sales Invoices** ⭐ — list, draft editor (partner + lines `qty×price` + tax-code multi-select + live `POST /tax/calculate` preview + decimal totals), **post** (APPROVER/ADMIN, SoD), void, delete draft | Draft→post→void lifecycle, SoD 403, tax, money math, idempotency |
| 8 | **Payments (receipt)** — create with **allocation** against posted invoice(s), post, void | Allocation UI, full-amount validation, money |

This slice touches: bare-array **and** enveloped lists, the draft→post→void flow,
`403 SEGREGATION_OF_DUTIES`, `422 UNBALANCED`/domain errors, tax preview, decimal
money, and idempotent posting.

### Role matrix (enforced in UI + handled defensively on every mutation)
- Reads: any authenticated user (incl. VIEWER).
- Create/update accounts, partners, tax codes, invoices, payments: ACCOUNTANT+.
- Post / void / reverse: APPROVER / ADMIN.
- Deactivate / delete accounts, partners, tax codes; opening balances; period
  reopen; year-end close; company settings; audit log: ADMIN.
- ACCOUNTANT cannot create-and-post in one call (`?post=true` → 403).

## 8. Shared components (`components/common`)

`DataTable` (TanStack Table + shadcn: sort / filter / column-visibility; bare-array
**and** enveloped modes) · `MoneyInput` / `MoneyText` (decimal-safe, tabular numerals)
· `RoleGate` + `useRole()` · `StatusBadge` (DRAFT / POSTED / VOID) ·
`ConfirmActionDialog` (wraps post/void, owns the `Idempotency-Key`) · `AccountSelect`
/ `PartnerSelect` / `TaxCodeMultiSelect` · `DateField` · `PageHeader` · `EmptyState` ·
`ErrorState` (message + "Ref: `traceId`") · skeleton loaders. These are the bricks
every later phase reuses.

## 9. Branded UI / design system

- **Working name:** "Buku" (Indonesian for ledger/book) — placeholder, trivially
  renamed.
- **Identity:** trustworthy fintech feel — a confident primary accent (deep
  indigo/teal), neutral surfaces, **light + dark** via CSS variables. Polished empty
  states, skeletons, and toast confirmations.
- **Money & numbers:** tabular-numeral mono so columns align; semantic color for
  debit/credit and positive/negative; right-aligned amount columns.
- **Typography:** Inter (UI) + a tabular mono for figures. Comfortable forms, compact
  tables, fully keyboard-navigable for data entry.
- Implementation uses the `frontend-design` skill to push polish beyond generic
  shadcn defaults.

## 10. Testing strategy (TDD)

- **Vitest + React Testing Library + user-event + MSW.** MSW handlers mirror the real
  API — the error envelope, role behavior, `401→refresh`, and `422` domain errors —
  with fixtures derived from the Zod schemas.
- **Three layers:**
  1. **lib units** — `Money` arithmetic / rounding, envelope parsing, single-flight
     refresh, formatters.
  2. **feature integration** — render a feature against MSW; assert role-gating, Zod
     form validation, the draft→post flow, `SEGREGATION_OF_DUTIES` handling, tax
     preview, and allocation-totals math.
  3. **route smoke tests.**
- Tests first, then implementation. Playwright E2E is available (MCP) but out of slice
  scope.

## 11. Definition of done (slice)

- Typed client generated from `openapi.json`; regenerate-on-API-change documented.
- All 8 features working against the live API with role-gating + defensive 403s.
- Money correct to 4dp end-to-end; no float math on amounts.
- Transparent 401-refresh (single-flight); 429 backoff.
- Light / dark; Bahasa Indonesia strings behind the locale layer.
- Green test suite (lib units + feature integration + route smoke).
- `README` with setup + `VITE_API_BASE_URL`.

## 12. Out of scope (later phases, each its own spec)

Journals register + DRAFT approval queue; purchase bills; the six full report screens
(balance sheet, income statement, general ledger, AR/AP aging, cash flow) + trial
balance; periods (generate/close/reopen); year-end close; opening balances; audit log;
company settings editor; payment disbursements (AP side). The foundation and shared
components from this slice carry directly into all of them.

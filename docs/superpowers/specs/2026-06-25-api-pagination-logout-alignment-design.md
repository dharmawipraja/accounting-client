# Align client with API doc changes — pagination envelope + server-side logout

**Date:** 2026-06-25
**Source:** API docs commit `2f88338` ("docs: update API documentation for authentication and pagination changes")

## Summary

The committed API docs (`docs/api/frontend-guide.md`, `frontend-agent-brief.md`,
`openapi.json`) introduce two behavioral changes the client must match, plus one
change that needs no client action. Stripping the formatting-only edits (italics,
table alignment), the real changes are:

1. **Accounts & tax-codes are now paginated (BREAKING shape change).**
   `GET /v1/ledger/accounts` and `GET /v1/tax/codes` now return the standard
   `{ data, total, limit, offset }` envelope instead of a bare array, and accept
   `?limit` / `?offset` (max 200). New OpenAPI schemas `AccountListResponseDto`,
   `TaxCodeListResponseDto`. A client reading these as bare arrays breaks.
2. **Server-side logout (additive).** Two new endpoints:
   - `POST /v1/auth/logout { refreshToken }` (public, throttled) — revoke this
     device's refresh token family. Returns `OkFlagDto` (`{ ok: boolean }`).
   - `POST /v1/auth/logout-all` (authenticated, no body) — revoke all sessions for
     the current user. Returns `OkFlagDto`.
   The old guidance was "no server logout, discard tokens client-side."
3. **`GET /v1/audit` `limit` max 500 → 200 — NO client action.** The audit page
   requests `LIMIT=50`, well under the cap.

The client already has the machinery for both real changes: the `createResourceHooks`
factory supports `paginated`, and `refresh.ts` establishes the best-effort auth-call
pattern. This keeps the work small and low-risk.

## Decisions (settled during brainstorming)

- **Logout scope:** wire up *both* server endpoints — best-effort single-device
  logout on every sign-out, plus a separate "log out all devices" action.
- **Pagination UI scope:** add full pager UI to *both* the Accounts and Tax Codes
  list pages (mirroring the Plan 12 list pages), not just the minimal envelope fix.
- **AccountsPage grouping trade-off (accepted):** AccountsPage groups accounts by
  type with section headers. With server pagination at `LIMIT=20` the grouping
  applies only to the current page's rows (chart of accounts ≈28 rows → ~2 pages),
  consistent with the page-scoped search model partners uses. User accepted this.

## Change 1 — Accounts & tax-codes pagination envelope

### 1A. Flip both resources to `paginated: true`

- `src/features/accounts/hooks.ts` — add `paginated: true` to the
  `createResourceHooks` config.
- `src/features/tax-codes/hooks.ts` — add `paginated: true`.

Effect (per the factory in `src/lib/crud/createResourceHooks.ts`):
- `useList()` fetches `?limit=200`, unwraps `.data`, and still resolves to
  `Account[]` / `TaxCode[]`. **All wholesale consumers stay unchanged** — AccountSelect,
  TaxCodeMultiSelect, InvoiceForm, BillForm, JournalEntryEditorPage, PaymentsPage,
  and the TaxCodesPage account-label map.
- `usePagedList({ limit, offset })` becomes available, returning the full envelope.

### 1B. Pager UI on both list pages (mirror `PartnersPage`)

- **`src/features/accounts/AccountsPage.tsx`:**
  - Replace `accountsApi.useList()` with `accountsApi.usePagedList({ limit: LIMIT, offset })`,
    `const LIMIT = 20`, `const [offset, setOffset] = useState(0)`.
  - Render `<Pagination offset={offset} limit={LIMIT} total={env.total} onChange={setOffset} />`
    below the grouped tables (inside the `QueryState` render prop receiving the envelope).
  - Search box becomes page-scoped: keep the `<Input>`, add the
    `t.common.searchOnThisPage` hint line (same markup as PartnersPage).
  - Grouping-by-type logic stays, applied to `env.data` (current page's rows).
- **`src/features/tax-codes/TaxCodesPage.tsx`:**
  - Replace the list `taxCodesApi.useList()` with `taxCodesApi.usePagedList({ limit: LIMIT, offset })`.
  - Keep `accountsApi.useList()` (wholesale) for the account-label map.
  - Add `<Pagination>` + `t.common.searchOnThisPage` hint, page-scoped search.

### 1C. MSW handlers (`src/test/handlers.ts`)

- `GET /ledger/accounts` and `GET /tax/codes` return the envelope, honoring
  `?limit` / `?offset`, mirroring the existing partners handler:
  ```ts
  http.get(`${API}/ledger/accounts`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    const limit = Number(u.get('limit') ?? '200');
    const offset = Number(u.get('offset') ?? '0');
    const data = accountFixtures();
    return HttpResponse.json({ data: data.slice(offset, offset + limit), total: data.length, limit, offset });
  }),
  ```
- Single-resource GETs (`/ledger/accounts/:id`, `/tax/codes/:id`) unchanged.

### 1D. No Zod schema changes

`accountSchema` / `taxCodeSchema` (`itemSchema`) are unchanged; the factory builds
the envelope schema internally. Neither resource has nested collections, so the
prior `lines` / `allocations` `.default([])` list-omission issue does not apply here.

## Change 2 — Server-side logout

### 2A. API helpers — new `src/lib/api/logout.ts` (sibling to `refresh.ts`)

- `logoutCurrentDevice(): Promise<void>` — best-effort bare
  `fetch(POST ${API_BASE_URL}/auth/logout, { refreshToken })`. Reads `refreshToken`
  from the session store. Swallows all errors and non-2xx responses (never throws).
  No-op if there is no refresh token.
- `logoutAllDevices(): Promise<void>` — `apiFetch('/auth/logout-all', { method: 'POST', auth: true })`
  wrapped in try/catch (swallows errors).

Both are **best-effort**: the caller always proceeds to clear the local session and
navigate, regardless of the network outcome. Logout must never be blocked by a
server error.

### 2B. Sign-out orchestration

- New `useSignOut()` hook (in `src/features/auth/`) returning
  `{ signOut, signOutAll, pending }` where:
  - `signOut()` → `await logoutCurrentDevice()` → `clear()`.
  - `signOutAll()` → `await logoutAllDevices()` → `clear()`.
  Navigation to `/login` is handled by AppShell after the call resolves (keeping the
  hook router-agnostic and testable).
- `clear()` in `src/stores/session.ts` stays the pure local reset (unchanged).
- **`src/components/common/AppShell.tsx`:** convert the lone sign-out icon button into
  a `DropdownMenu` (`src/components/ui/dropdown-menu.tsx`, already installed) with two
  items: "Keluar" (this device → `signOut`) and "Keluar dari semua perangkat"
  (all → `signOutAll`). Each item then navigates to `/login`. The `LogOut` icon
  becomes the dropdown trigger.

### 2C. i18n (`src/lib/i18n/messages.id.ts`)

Add to the `auth` block: `signOutAllDevices: 'Keluar dari semua perangkat'`.
Keep `signOut: 'Keluar'`.

## Testing

- **Pagination:**
  - MSW handlers return the envelope (1C).
  - AccountsPage & TaxCodesPage render rows and the `<Pagination>` control from the
    envelope; advancing offset re-queries.
  - A wholesale consumer (e.g. AccountSelect) still lists all accounts via the
    unwrapped `useList()`.
- **Logout:**
  - MSW handlers: `POST /auth/logout` → `200 { ok: true }`, `POST /auth/logout-all`
    → `200 { ok: true }`.
  - Single sign-out POSTs `/auth/logout` with the stored `refreshToken`, then clears
    the session.
  - "All devices" POSTs `/auth/logout-all`, then clears the session.
  - Sign-out still clears the session locally when the endpoint errors (best-effort).
- **Full gate:** `pnpm test --run`, `pnpm exec tsc --noEmit`, `pnpm run lint`,
  `pnpm run build`.

## Out of scope

- Generating a typed OpenAPI client. The project uses hand-written Zod schemas plus
  the `createResourceHooks` factory; the doc's "generate a typed client" line is
  advisory and not the established pattern.
- `GET /v1/audit` `limit` cap change (no client code requests > 200).
- Doc formatting edits (italics, table alignment) — already committed in `2f88338`.

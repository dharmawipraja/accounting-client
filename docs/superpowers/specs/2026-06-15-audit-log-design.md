# Audit Log (Plan 9) — Design

**Plan:** 9 — Audit Log (Log Audit), a read-only ADMIN view of the server's HTTP-request audit trail. The first **ADMIN-only** screen in the app.

**Status:** approved design, pre-implementation.

**Context:** The roadmap's "read-only activity view." The server records every mutating request; this surfaces it for admins. After this, company settings (home of the SoD toggle) remains.

---

## Purpose

Let an ADMIN review who did what and when: a filterable, paged table of audit entries, each expandable to its full request detail. Read-only — no mutations.

---

## Reconciled API shape (live, 2026-06-15)

`GET /audit` · **ADMIN only** · **bare array** (no envelope) · query filters `userId, method, from, to, limit, offset` (`limit` default 50, **max 500**; `method` ∈ POST/PATCH/PUT/DELETE). Each entry:

```jsonc
{
  "id": "5c1a51f8-…",
  "timestamp": "2026-06-15T13:18:25.590Z",   // ISO datetime
  "userId": null,                              // UUID, or null for unauthenticated calls (e.g. login)
  "userRole": null,                            // 'ADMIN' | 'APPROVER' | … , or null
  "method": "POST",                            // POST | PATCH | PUT | DELETE
  "path": "/ledger/periods/:id/close",         // the request path
  "params": {},                                // route params object
  "body": { "email": "…", "password": "[REDACTED]" },  // request body — passwords server-redacted
  "statusCode": 200,
  "durationMs": 127,
  "ip": "::1"
}
```

(Sensitive fields like passwords are already `[REDACTED]` by the server, so the body is safe to display. The list is bare — no `total`, so paging is offset-only.)

---

## Architecture

New module **`src/features/audit/`**. Read-only: a schema, one data hook, the page, and two small presentational pieces (`OffsetPager`, the detail `Sheet`).

**ADMIN gating — two layers (defense in depth):**
1. **Nav:** the AppShell nav-item shape gains an optional `allow?: Role[]`; the nav list is filtered with `hasRole(role, item.allow)` (items without `allow` show for everyone). So only ADMIN sees the "Audit" link.
2. **Page:** `AuditPage` reads `useRole()` (from `@/components/common/RoleGate`); if the role is not ADMIN it renders a forbidden notice (`t.roles.forbidden`) and **does not call the hook** (no fetch). This guards direct navigation to `/audit`.

**Data layer:**
- `useAuditLog(filters)` → `useQuery({ queryKey: queryKeys.audit.list(filters), queryFn: () => apiFetch('/audit', { query, schema: auditListSchema }) })`. `query` = `{ method, from, to, limit, offset }` (undefined values are stripped by `apiFetch`). Bare array.
- `queryKeys.audit = { all: ['audit'], list: (f) => ['audit', 'list', f] }` added to `src/lib/query/keys.ts`.

**Paging:** the response has no total, so a small `OffsetPager` does offset-only paging: "Sebelumnya" disabled when `offset === 0`; "Berikutnya" disabled when the current page returned `< limit` rows (last page). `limit` is a constant 50. Any filter change resets `offset` to 0.

---

## Components

### Schema — `src/features/audit/schema.ts`

```ts
import { z } from 'zod';

export const auditEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  userId: z.string().nullish(),
  userRole: z.string().nullish(),
  method: z.string(),
  path: z.string(),
  params: z.unknown(),
  body: z.unknown(),
  statusCode: z.number().nullish(),
  durationMs: z.number().nullish(),
  ip: z.string().nullish(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export const auditListSchema = z.array(auditEntrySchema);

export const AUDIT_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'] as const;
```

A helper `formatAuditTime(ts: string)` returns `${formatDateID(ts.slice(0, 10))} ${ts.slice(11, 19)}` (Indonesian date + `HH:MM:SS`) — deterministic, no locale/TZ surprises in jsdom.

### `useAuditLog` — `src/features/audit/useAuditLog.ts`

```ts
export interface AuditFilters { method?: string; from?: string; to?: string; limit: number; offset: number; }

export function useAuditLog(filters: AuditFilters, enabled = true) {
  return useQuery<AuditEntry[], ApiError>({
    queryKey: queryKeys.audit.list(filters),
    queryFn: () => apiFetch('/audit', {
      query: { method: filters.method || undefined, from: filters.from || undefined, to: filters.to || undefined, limit: filters.limit, offset: filters.offset },
      schema: auditListSchema,
    }),
    enabled,
  });
}
```

### `OffsetPager` — `src/features/audit/OffsetPager.tsx`

`{ offset, limit, count, onChange }` — renders Sebelumnya/Berikutnya buttons; prev disabled when `offset === 0`, next disabled when `count < limit`. `onChange(newOffset)` with `Math.max(0, offset - limit)` / `offset + limit`.

### `AuditPage` — `src/features/audit/AuditPage.tsx`

- `const role = useRole();` — if `role !== 'ADMIN'`, render `<p>{t.roles.forbidden}</p>` and stop (no hook call). (Use a guard wrapper component so the hook is only mounted for admins.)
- State: `method` (''), `from` (''), `to` (''), `offset` (0), `selected: AuditEntry | null`.
- `const query = useAuditLog({ method, from, to, limit: 50, offset })`.
- **Filter bar:** a shadcn `Select` for method (Semua + the 4 verbs) + two `Input type="date"` (Dari/Sampai). Each `onChange` updates the filter AND resets `offset` to 0.
- **Body:** loading → `Skeleton`; error → `ErrorState`; else a `Table` (Waktu · Pengguna · Metode · Path · Status). Rows: `formatAuditTime(timestamp)`, `userRole ?? '—'`, method `Badge`, `path`, `statusCode` `Badge` (`variant = statusCode && statusCode < 400 ? 'default' : 'destructive'`). `onClick` sets `selected`. Empty array → an "empty" row (`t.audit.empty`).
- **`OffsetPager`** with `count = query.data?.length ?? 0`.
- **Detail `Sheet`** (`open={selected !== null}`, `onOpenChange`): header = method `Badge` + `path`; a meta grid (Waktu, Pengguna = `userRole` + `userId`, Status, Durasi `${durationMs} ms`, IP); then `t.audit.body` + `<pre>{JSON.stringify(selected.body, null, 2)}</pre>` and the same for `params`.

### Route & nav

- `src/app/routes/_app/audit.tsx` → `AuditPage` (any-auth route; the page self-guards).
- `AppShell`: the `nav` array items gain optional `allow?: Role[]`; render filters `nav.filter((i) => !i.allow || hasRole(role, i.allow))`. Add `{ to: '/audit', label: t.nav.audit, icon: ScrollText, allow: ['ADMIN'] }` last. Import `ScrollText` + `hasRole` + `useRole` (AppShell already reads the session for the role).

---

## i18n

`nav.audit: 'Audit'` + an `audit` group in `src/lib/i18n/messages.id.ts`:

```
title: 'Log Audit'
method: 'Metode'
allMethods: 'Semua Metode'
from: 'Dari'
to: 'Sampai'
waktu: 'Waktu'
pengguna: 'Pengguna'
metode: 'Metode'
path: 'Path'
status: 'Status'
durasi: 'Durasi'
ip: 'IP'
body: 'Body'
params: 'Params'
detail: 'Detail Permintaan'
empty: 'Tidak ada aktivitas'
prev: 'Sebelumnya'
next: 'Berikutnya'
```

(`t.roles.forbidden` is reused for the non-admin notice.)

---

## Data flow

1. ADMIN opens `/audit` → `AuditPage` mounts the guarded body → `useAuditLog({ limit: 50, offset: 0 })` → table renders.
2. Picking a method / date resets `offset` to 0 and refetches under the new key.
3. Clicking a row sets `selected` → the detail `Sheet` opens with that entry's JSON.
4. OffsetPager next → `offset += 50` → refetch; prev → `offset -= 50`.
5. A non-ADMIN landing on `/audit` → forbidden notice, no fetch.

## Error & edge handling

- Non-ADMIN → forbidden notice (no fetch).
- Loading/error → `Skeleton` / `ErrorState` (with `traceId`); 403 from the API (if a non-admin somehow calls it) → `ErrorState`/`toastApiError`.
- Empty array → "Tidak ada aktivitas"; OffsetPager next disabled (count 0 < limit).
- `userId`/`userRole`/`durationMs`/`ip` nullish → render `—`.

---

## Testing

TDD; `AuditPage` renders standalone with `QueryClientProvider`; role via `useSession.setUser`. MSW: add `GET /audit` + `auditFixtures` to `src/test/handlers.ts`; behavioral tests override inline to capture query params.

- **`schema.test.ts`** — parse an entry (incl. `userId: null`, a `body`/`params` object); assert `formatAuditTime` returns date + `HH:MM:SS`.
- **`useAuditLog.test.tsx`** — asserts `method`/`from`/`to`/`limit`/`offset` go through as query params; returns the array.
- **`AuditPage.test.tsx`**:
  - **ADMIN**: rows render (a method `Badge`, the `path`, a status); changing the method `Select` sends `method=POST` (and offset reset); clicking a row opens the `Sheet` and shows a `body` value; OffsetPager **Berikutnya** sends `offset=50`, **Sebelumnya** disabled at offset 0.
  - **VIEWER**: the forbidden notice renders and **no `/audit` request fires**.

Full suite expected ≈ **208 + ~9 new**. Final task: `pnpm test --run`, `pnpm lint`, `pnpm build` green; `routeTree.gen.ts` regenerated.

---

## Scope

**In:** the audit table, method + date-range filters, offset paging (`OffsetPager`), the row-detail `Sheet`, ADMIN gating (nav-filter + page-guard), the `/audit` route, i18n, tests.

**Out (deferred / YAGNI):** a `userId` filter (raw UUIDs, no user picker), CSV/export, humanizing `path` into friendly action names, resolving `userId`→email (no user-list endpoint), auto-refresh/live tail, a before/after diff of the body, and a `limit` selector (fixed 50). Company settings (SoD toggle) is the next slice.

---

## Reuse summary

| Need | Reuse (unchanged) |
|---|---|
| Fetch + parse | `apiFetch` (`query`, `schema`), `useQuery` |
| Role gating | `RoleGate`/`useRole`/`hasRole` |
| Table / pills | shadcn `Table`, `Badge` |
| Method filter | shadcn `Select` |
| Detail panel | shadcn `Sheet` |
| Date range | `Input type="date"` |
| Loading/error | `Skeleton`, `ErrorState`, `PageHeader` |
| Date format | `formatDateID` (+ inline time slice) |
| Query keys | `src/lib/query/keys.ts` (+`audit`) |

New: `src/features/audit/*` (schema + `useAuditLog` + `OffsetPager` + `AuditPage`), one route, an `audit` i18n group + `nav.audit`, an `allow?` field on AppShell nav items, and a `GET /audit` MSW handler.

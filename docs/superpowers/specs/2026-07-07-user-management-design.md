# User management — design

**Date:** 2026-07-07
**Source:** New backend endpoints under `/v1/users/*` + `/v1/auth/change-password` (docs/api/openapi.json, commit `a39b019`). Client had no user-management surface before.
**Decided via:** brainstorming. Scope confirmed as the full feature (admin CRUD + password lifecycle) because the three parts are interdependent.

## Summary

Add administrator-facing user management plus the password lifecycle that makes it usable end-to-end:

1. **Admin Users page** (`/users`, ADMIN-only): list, create, edit, deactivate/delete, reset password.
2. **Self-service change password**: any authenticated user changes their own password from the account menu.
3. **Forced first-login change**: a user created or reset by an admin receives a one-time temp password and `mustChangePassword: true`; the API then `403`-blocks every endpoint until they change it. The client detects this and routes to a blocking change-password screen.

The feature reuses the app's established primitives (`usePagedList` + `Pagination`, `columnKit`/`DataTable`, `RowActions`, `ConfirmDialog`, `QueryState`, `StatusChip`, `RoleGate`, `useT`). Money/i18n/status conventions from CLAUDE.md apply throughout (no hardcoded copy, no em-dashes, status = icon + text).

## API surface (from docs/api/openapi.json)

All `/v1/users/*` is **ADMIN-only end-to-end, reads included** (the one role-gated `GET` in the app). Paths below are under `/v1`.

| Method | Path | Body | Success | Notes |
|---|---|---|---|---|
| GET | `/users?limit&offset` | — | `200 {data: User[], total, limit, offset}` | paginated envelope |
| POST | `/users` | `{email, name, role}` | `201 {user, tempPassword}` | `409` if email exists |
| GET | `/users/{id}` | — | `200 User` | `404` |
| PATCH | `/users/{id}` | `{name?, role?, isActive?}` | `200 User` | `404`, `422` (guarded, e.g. last admin) |
| DELETE | `/users/{id}` | — | `204` | `404`, `422` |
| POST | `/users/{id}/reset-password` | — | `200 {user, tempPassword}` | `404` |
| POST | `/auth/change-password` | `{currentPassword, newPassword}` | `200 {ok}` | `401` wrong current; throttle 10/min |

- **`User` (UserResponseDto):** `{ id, email, name, role, isActive, mustChangePassword, createdAt }`.
- **`role` enum:** `VIEWER | ACCOUNTANT | APPROVER | ADMIN`.
- **`tempPassword`** is returned exactly once (create + reset). Show once, store nowhere.
- **`newPassword`:** 8–128 chars.
- **Forced change:** while `mustChangePassword` is true, **every** endpoint returns `403` code `PASSWORD_CHANGE_REQUIRED` except `POST /auth/change-password`, `GET /auth/me`, `POST /auth/logout`, `POST /auth/logout-all`. `GET /auth/me` now returns `mustChangePassword`. A successful change revokes **all** of the user's refresh sessions; the tab that changed it keeps working until its access token expires (≤15 min).

## Approach

New `src/features/users/` folder mirroring the master-data feature shape, reusing shared primitives. Rejected alternatives: (a) forcing users through `MasterDataListPage`/`createResourceHooks` — users have no `code`, a special reset-password action, a one-time temp-password reveal, and role-gated reads, so the abstraction fights back; (b) burying it in Settings tabs — less discoverable, mixes concerns.

## A. Admin Users page (`/users`, ADMIN-only)

- **Route:** `src/app/routes/_app/users.tsx` → renders `UsersPage`. **Nav:** new `Pengguna` item in the *Data & Sistem* group, ADMIN-only (mirrors Audit), icon `UserCog` (Partners owns `Users`). Page and nav gated by `useRole`/`RoleGate`; a non-admin reaching the URL sees the forbidden state (AuditPage pattern). API also enforces.
- **List:** `usePagedList` → `GET /users` (LIMIT=20), wrapped in `QueryState`. Columns: **Email · Nama · Peran · Status · Aksi**. Role rendered via an enum-label helper (`roleLabel`, single-source per the enum-label convention). Status via `StatusChip` (active/inactive, icon + text). Text search scoped to the current page (shared `common.searchOnThisPage` hint). `RowActions` per row: Edit, Reset password, Deactivate/Activate, Delete.
- **Create** — `UserFormDialog` (create mode): `email`, `name`, `role` (Select). Submit `POST /users`; on success open **`TempPasswordDialog`** showing `tempPassword` with copy-to-clipboard and a "won't be shown again" warning; closing invalidates the list. `409` → inline email "already exists" error.
- **Edit** — `UserFormDialog` (edit mode): `name`, `role`, `isActive`. Submit `PATCH /users/{id}`.
- **Reset password** — `ConfirmDialog` ("signs the user out of all devices and issues a new temp password") → `POST /users/{id}/reset-password` → `TempPasswordDialog` reveal.
- **Deactivate/Activate** — `PATCH { isActive }`, reversible, primary. **Delete** — `DELETE`, destructive, strong `ConfirmDialog`. Both offered; deactivate is the recommended default.

## B. Self-service change password

`ChangePasswordDialog`, opened from a new **Ubah Kata Sandi** item in the NavUser account-menu dropdown (next to logout), available to all roles. Fields: `currentPassword`, `newPassword`, `confirmNewPassword` (client-side match check; `newPassword` 8–128). Submit `POST /auth/change-password`. `401` (wrong current) → inline field error via `applyApiErrorToForm`. Success → toast, close. (Other sessions are revoked server-side; this tab keeps working.)

## C. Forced first-login change (cross-cutting core)

- **Session flag:** extend `AuthUser` and `meSchema` with `mustChangePassword: boolean`. `/auth/me` returns it (and is exempt from the 403), so `useHydrateSession` captures it on load/login without extra calls.
- **Root guard:** `AppShell` already hosts `useHydrateSession()`, so the flag is known there. Make `AppShell` **early-return** a bare, blocking **`ChangePasswordScreen`** (centered card like Login, no sidebar/nav; only change-password + logout available) when `user.mustChangePassword` is true, *before* rendering the shell chrome. Reactive/component-level (not `beforeLoad`) since the flag can flip mid-session. Ordering matters: hydration runs first (it may set the flag), then the guard decides. On success: clear the flag and re-hydrate `/auth/me` → the app unlocks.
- **Global 403 catch:** in `apiFetch` (client.ts), when a response is `403` with code `PASSWORD_CHANGE_REQUIRED`, set the session flag (→ blocking screen) instead of surfacing a generic forbidden error. `classifyApiError` gains a `passwordChangeRequired` kind so any leaked error renders sensibly. This is handled alongside the existing 401-refresh path, before the error propagates to callers.

## Cross-cutting details

- **Session store (`stores/session.ts`):** `AuthUser` gains `mustChangePassword`; add a `setMustChangePassword(flag)` action (or fold into `setUser`). Only tokens stay persisted (unchanged); the flag is re-derived from `/auth/me`.
- **`lib/schemas/auth.ts`:** `meSchema` gains `mustChangePassword: z.boolean()`.
- **`classifyApiError.ts`:** `403 PASSWORD_CHANGE_REQUIRED` → new `passwordChangeRequired` kind (distinct from `forbidden`/`segregationOfDuties`).
- **i18n (`messages.id.ts`):** new `users` namespace (page title, columns, dialog labels, role labels, confirm copy) and `password` namespace (change-password dialog + forced screen). Indonesian, no em-dashes, no hardcoded copy.
- **Query keys:** add `users` list + detail keys to the registry; mutations invalidate the list (and detail).

## Guardrails & error handling

- **Self-lockout prevention:** in Edit, disable changing *your own* role and deactivating *yourself*; hide/disable Delete on your own row. Still surface the API's `422` (e.g. deleting the last admin) gracefully via toast — never assume the client guard is exhaustive.
- **Temp password:** rendered once, copy-to-clipboard, never re-fetchable, never logged or persisted. The `TempPasswordDialog` makes the one-time nature explicit.
- **Forced-change edge:** the change-password call itself and `/auth/me` must keep working while blocked — both are on the API's exemption list, so the blocking screen and its submit are functional.

## Files

**New**
- `features/users/UsersPage.tsx`, `UserFormDialog.tsx`, `TempPasswordDialog.tsx`, `hooks.ts`, `schema.ts`, `user-meta.ts` (role labels)
- `features/auth/ChangePasswordDialog.tsx`, `ChangePasswordScreen.tsx`
- `app/routes/_app/users.tsx`

**Changed**
- `stores/session.ts`, `lib/schemas/auth.ts` (`mustChangePassword`)
- `lib/api/client.ts`, `lib/api/classifyApiError.ts` (403 `PASSWORD_CHANGE_REQUIRED`)
- `components/app-shared.tsx` (nav item), `components/nav-user.tsx` (menu item), `_app` shell (forced-change guard)
- `lib/i18n/messages.id.ts`, `lib/query/keys.ts`, `test/handlers.ts` (+ MSW `server.ts` fixtures)

## Testing (TDD)

- MSW handlers for all `/users` endpoints + `change-password` (incl. `409`, `401`, `422`, temp-password shape, and a `PASSWORD_CHANGE_REQUIRED` 403).
- `UsersPage`: list renders, search, pagination; create → temp-password reveal; edit; reset → reveal; deactivate; delete confirm; forbidden for non-admin; self-lockout guards.
- `ChangePasswordDialog`: match validation, success, `401` inline error.
- `ChangePasswordScreen` + guard: blocked when `mustChangePassword`, unlocks on success.
- `apiFetch`/`classifyApiError`: `403 PASSWORD_CHANGE_REQUIRED` flips the session flag rather than throwing a generic forbidden.

## Global constraints (carried into the plan)

- All user-facing strings via `useT()` (Indonesian), no em-dashes. Status via icon + text. Async rendering via `QueryState`. Role gating is defense-in-depth (backend enforces); never trust the client alone. Real typecheck is `pnpm run build`; new routes need the route tree regenerated (start/kill dev). Do not enter credentials programmatically — the temp password is displayed to the operator, never auto-filled.

## Out of scope

- Self-service registration / signup (no endpoint).
- Password strength meter beyond the 8–128 length rule.
- Bulk user actions, CSV import/export of users.
- Email delivery of temp passwords (API returns them inline; operator relays them).

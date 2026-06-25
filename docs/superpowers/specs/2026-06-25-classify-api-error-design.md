# classifyApiError — design

**Date:** 2026-06-25
**Source:** Architecture-review card 3 (one error-classification module). Sibling of cards 1–2 in `CONTEXT.md`.
**Decided via:** brainstorming (converged directly — contained, pure refactor; one behavior decision settled below).

## Summary

Three modules independently re-match `ApiError.status`/`code`: `toastApiError` (`lib/api/toastApiError.ts`), `applyApiErrorToForm` (`lib/api/form-errors.ts`), and `describeError` (`components/common/describeError.ts`). Extract the matching into one pure `classifyApiError(error)` returning a discriminated `kind` (the superset of every distinction the three need), so each becomes a thin renderer that `switch`es on `kind` and projects it to its own output. Move `describeError` into the `lib/api/` error layer (it is a pure API-error classifier currently stranded in the component tree, unreachable from `lib/` without a cycle).

This is a **pure, behavior-preserving refactor** — no user-facing change. (Decision: form 409s — including `CLOSED_PERIOD`/`CLOSED_YEAR` — keep setting the `code` field error exactly as today; in practice forms only ever hit duplicate-code 409s, since closed-period/year errors come from POST/void via `toastApiError`.)

## The classifier

New `src/lib/api/classifyApiError.ts`:

```ts
import { ApiError } from './errors';

export type ApiErrorKind =
  | 'offline'
  | 'unauthorized'
  | 'segregationOfDuties'
  | 'forbidden'
  | 'notFound'
  | 'closedPeriod'
  | 'closedYear'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'unknown';

export interface ApiErrorClass {
  kind: ApiErrorKind;
  /** The underlying ApiError, when the thrown value was one. Renderers read
   *  message / traceId / fieldErrors from it for their tails. */
  error?: ApiError;
}

export function classifyApiError(error: unknown): ApiErrorClass {
  if (!(error instanceof ApiError)) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return { kind: offline ? 'offline' : 'unknown' };
  }
  const { status, code } = error;
  let kind: ApiErrorKind;
  if (status === 0) kind = 'offline';
  else if (status === 401) kind = 'unauthorized';
  else if (status === 403) kind = code === 'SEGREGATION_OF_DUTIES' ? 'segregationOfDuties' : 'forbidden';
  else if (status === 404) kind = 'notFound';
  else if (status === 409) kind = code === 'CLOSED_PERIOD' ? 'closedPeriod' : code === 'CLOSED_YEAR' ? 'closedYear' : 'conflict';
  else if (status === 422) kind = 'validation';
  else if (status >= 500) kind = 'server';
  else kind = 'unknown';
  return { kind, error };
}
```

Pure, no `Messages`/React/sonner dependency. `navigator` is the only environment read (matching `describeError` today).

## The three renderers (each preserves its exact current output)

**`toastApiError(error, t)`** — `const { kind, error: e } = classifyApiError(error)`; switch:
- `segregationOfDuties` → `toast.error(t.roles.segregationOfDuties)`
- `forbidden` → `toast.error(t.roles.forbidden)`
- `closedPeriod` → `toast.error(t.crud.closedPeriod)`
- `closedYear` → `toast.error(t.crud.closedYear)`
- default → `e ? toast.error(e.message || t.common.error, { description: e.traceId ? \`${t.common.reference}: ${e.traceId}\` : undefined }) : toast.error(t.common.error)`

**`applyApiErrorToForm(error, form, t)`** — `const { kind, error: e } = classifyApiError(error)`:
- `if (!e) { toast.error(t.common.error); return; }` (non-ApiError)
- `closedPeriod | closedYear | conflict` → `form.setError('code', { message: t.crud.duplicateCode })` (preserves "any 409 → code")
- `segregationOfDuties` → `toast.error(t.roles.segregationOfDuties)`
- `forbidden` → `toast.error(t.roles.forbidden)`
- else → `if (e.fieldErrors.length > 0) form.setError('root', { message: e.fieldErrors.join('. ') })` else `toast.error(e.message || t.common.error, { description: traceId… })`

**`describeError(error, t)`** (moved to `lib/api/describeError.ts`, same `ErrorKind`/`ErrorDescription` exports) — `const { kind } = classifyApiError(error)`; map the finer kinds onto its existing 7-value `ErrorKind` + copy + `showRetry`, preserving today's page behavior:
- `offline` → offline / retry
- `unauthorized` → unauthorized / no-retry
- `segregationOfDuties | forbidden` → forbidden / no-retry
- `notFound` → notFound / no-retry
- `validation` → validation / no-retry
- `server` → server / retry
- `closedPeriod | closedYear | conflict | unknown` → generic / retry

`traceId` flows from `classifyApiError(...).error?.traceId`.

## Files

- **Create** `src/lib/api/classifyApiError.ts` + `src/lib/api/classifyApiError.test.ts`.
- **Move** `src/components/common/describeError.ts` → `src/lib/api/describeError.ts` (reimplemented on `classifyApiError`; same exports). Move `src/components/common/describeError.test.ts` → `src/lib/api/describeError.test.ts` (update the import path; assertions unchanged). Update the import in `src/components/common/ErrorState.tsx` (its only non-test consumer) from `./describeError` to `@/lib/api/describeError`.
- **Modify** `src/lib/api/toastApiError.ts`, `src/lib/api/form-errors.ts` — use `classifyApiError`; behavior unchanged.

## Testing

- **New** `classifyApiError.test.ts` — the authoritative unit test: one case per status/code → kind (status 0 + non-ApiError-with-`navigator.onLine===false` → offline; non-ApiError online → unknown; 401→unauthorized; 403 with/without SoD → segregationOfDuties/forbidden; 404→notFound; 409 CLOSED_PERIOD/CLOSED_YEAR/other → closedPeriod/closedYear/conflict; 422→validation; 500→server; 418→unknown), plus that `error` is carried for ApiError and omitted for non-ApiError.
- **Keep green (regression net, behavior unchanged):** `lib/api/toastApiError.test.ts`, `lib/api/form-errors.test.ts`, the moved `lib/api/describeError.test.ts`, `components/common/ErrorState.test.tsx`, and the indirect consumers (`QueryState.test.tsx`, the SoD-toast assertions in `DocumentListPage.test.tsx` / `useDocumentListController.test.tsx`).
- **Dependency category:** in-process, pure.

## Global constraints (carried into the plan)

- i18n via `useT()`/`Messages`; no hardcoded user-facing strings; no em-dashes. The classifier is i18n-free (returns kinds); renderers map kinds → `t.*` exactly as today.
- Pure refactor — no behavior change; the existing behavior tests are the proof.
- `pnpm run build` (`tsc -b && vite build`) is the real typecheck (not `tsc --noEmit`); lint must stay at 0 errors / the pre-existing warnings.

## Out of scope

- Any behavior change (the form-409 handling is preserved exactly).
- The `ApiError` class shape, `apiFetch`/`refresh`/`logout`, and `ErrorState`'s rendering — unchanged (only `ErrorState`'s import path moves).

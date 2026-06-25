# classifyApiError Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract one pure `classifyApiError(error)` so `toastApiError`, `applyApiErrorToForm`, and `describeError` become thin renderers that `switch` on a classification kind instead of each re-matching `ApiError.status`/`code`; move `describeError` into the `lib/api/` error layer.

**Architecture:** A pure, i18n-free `classifyApiError` returns a discriminated `kind` (the superset of every distinction the three renderers make) carrying the raw `ApiError`. Each renderer projects the kind to its own output, preserving exact current behavior. Pure refactor — no user-facing change.

**Tech Stack:** TypeScript (strict), sonner, react-hook-form, Vitest. In-process, no I/O.

## Global Constraints

- **Pure refactor — no behavior change.** The existing `toastApiError`/`form-errors`/`describeError`/`ErrorState` tests are the regression net and stay green unchanged. Form 409s (incl. `CLOSED_PERIOD`/`CLOSED_YEAR`) still set the `code` field error exactly as today.
- **i18n:** the classifier is i18n-free (returns kinds); renderers map kinds → `t.*` exactly as today. No hardcoded user-facing strings; no em-dashes.
- **Typecheck reality:** `pnpm run build` (`tsc -b && vite build`) is the real typecheck (NOT `tsc --noEmit`, which skips test files). Run it before each commit.
- **Lint:** stays at 0 errors / the 8 pre-existing React-Compiler/react-hook-form/TanStack-Table warnings. The `eslint-disable @typescript-eslint/no-explicit-any` on `form-errors.ts`'s `UseFormReturn<any>` is pre-existing — keep it.
- **Commands:** Build/typecheck `pnpm run build` · Tests `pnpm test --run` · one file `pnpm test --run <path>` · Lint `pnpm run lint`.

## File Structure

- **Create** `src/lib/api/classifyApiError.ts` — `classifyApiError` + `ApiErrorKind` + `ApiErrorClass`.
- **Create** `src/lib/api/classifyApiError.test.ts` — the authoritative unit test.
- **Modify** `src/lib/api/toastApiError.ts`, `src/lib/api/form-errors.ts` — reimplement on `classifyApiError`.
- **Move** `src/components/common/describeError.ts` → `src/lib/api/describeError.ts` (reimplemented on `classifyApiError`; same `ErrorKind`/`ErrorDescription`/`describeError` exports) and `src/components/common/describeError.test.ts` → `src/lib/api/describeError.test.ts` (content unchanged — its `./describeError` import still resolves after the co-move).
- **Modify** `src/components/common/ErrorState.tsx` — import `describeError`/`ErrorKind` from `@/lib/api/describeError`.
- **Unchanged:** `src/lib/api/errors.ts` (`ApiError`), `ErrorState.tsx`'s rendering, all behavior tests.

**Interface reference:** `ApiError` (`@/lib/api/errors`) has `status: number`, `code: string`, `message: string`, `traceId?: string`, and a getter `fieldErrors: string[]` (= `details.errors ?? []`). `Messages` is `@/lib/i18n/messages.id`.

---

### Task 1: `classifyApiError` (pure classifier)

**Files:**
- Create: `src/lib/api/classifyApiError.ts`
- Test: `src/lib/api/classifyApiError.test.ts`

**Interfaces:**
- Consumes: `ApiError` from `./errors`.
- Produces: `ApiErrorKind` (union), `ApiErrorClass = { kind: ApiErrorKind; error?: ApiError }`, `classifyApiError(error: unknown): ApiErrorClass`. Consumed by Tasks 2–3.

- [ ] **Step 1: Write the failing test**

Create `src/lib/api/classifyApiError.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { classifyApiError } from './classifyApiError';

const err = (status: number, code = 'X') => new ApiError({ status, code, message: 'm' });

describe('classifyApiError', () => {
  it('classifies an ApiError by status/code', () => {
    expect(classifyApiError(err(0)).kind).toBe('offline');
    expect(classifyApiError(err(401)).kind).toBe('unauthorized');
    expect(classifyApiError(err(403, 'SEGREGATION_OF_DUTIES')).kind).toBe('segregationOfDuties');
    expect(classifyApiError(err(403, 'FORBIDDEN')).kind).toBe('forbidden');
    expect(classifyApiError(err(404)).kind).toBe('notFound');
    expect(classifyApiError(err(409, 'CLOSED_PERIOD')).kind).toBe('closedPeriod');
    expect(classifyApiError(err(409, 'CLOSED_YEAR')).kind).toBe('closedYear');
    expect(classifyApiError(err(409, 'CONFLICT')).kind).toBe('conflict');
    expect(classifyApiError(err(422)).kind).toBe('validation');
    expect(classifyApiError(err(503)).kind).toBe('server');
    expect(classifyApiError(err(418)).kind).toBe('unknown');
  });

  it('carries the ApiError for an ApiError, omits it otherwise', () => {
    const e = err(409, 'CONFLICT');
    expect(classifyApiError(e).error).toBe(e);
    expect(classifyApiError(new Error('boom')).error).toBeUndefined();
  });

  it('classifies a non-ApiError as unknown when online', () => {
    expect(classifyApiError(new Error('boom')).kind).toBe('unknown');
  });

  describe('when navigator is offline', () => {
    let original: PropertyDescriptor | undefined;
    afterEach(() => {
      if (original) Object.defineProperty(navigator, 'onLine', original);
    });
    it('classifies a non-ApiError as offline', () => {
      original = Object.getOwnPropertyDescriptor(navigator, 'onLine');
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      expect(classifyApiError(new Error('boom')).kind).toBe('offline');
    });
  });
});
```

- [ ] **Step 2: Run it to verify failure**

Run: `pnpm test --run src/lib/api/classifyApiError.test.ts`
Expected: FAIL — cannot resolve `./classifyApiError`.

- [ ] **Step 3: Implement the classifier**

Create `src/lib/api/classifyApiError.ts`:

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
  /** The underlying ApiError when the thrown value was one; renderers read
   *  message / traceId / fieldErrors from it for their tails. */
  error?: ApiError;
}

/** Pure: maps any thrown value to a semantic ApiErrorKind. The single home for
 *  status/code matching. i18n-free; renderers project the kind to their output. */
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

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test --run src/lib/api/classifyApiError.test.ts`
Expected: PASS (all cases). If the `navigator.onLine` override throws in jsdom, the `Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })` pattern shown is the supported approach (jsdom's `onLine` is configurable); do not change the assertion.

- [ ] **Step 5: Build + commit**

Run: `pnpm run build` → succeeds.

```bash
git add src/lib/api/classifyApiError.ts src/lib/api/classifyApiError.test.ts
git commit -m "feat(api): classifyApiError — pure ApiError classifier

One discriminated-union classifier (status/code -> kind, carrying the ApiError)
that toastApiError / applyApiErrorToForm / describeError will project."
```

---

### Task 2: Reimplement `toastApiError` + `applyApiErrorToForm` on the classifier

**Files:**
- Modify: `src/lib/api/toastApiError.ts`, `src/lib/api/form-errors.ts`
- Regression: `src/lib/api/toastApiError.test.ts`, `src/lib/api/form-errors.test.ts` (unchanged — must stay green)

**Interfaces:**
- Consumes: `classifyApiError`, `ApiErrorClass` (Task 1).
- Produces: same `toastApiError(error, t)` / `applyApiErrorToForm(error, form, t)` signatures (unchanged).

- [ ] **Step 1: Rewrite `toastApiError.ts`**

Replace the entire file `src/lib/api/toastApiError.ts` with:

```ts
import { toast } from 'sonner';
import type { Messages } from '@/lib/i18n/messages.id';
import { classifyApiError } from './classifyApiError';

/** Surface an API error as a toast (for action/confirm contexts, not forms). */
export function toastApiError(error: unknown, t: Messages): void {
  const { kind, error: e } = classifyApiError(error);
  switch (kind) {
    case 'segregationOfDuties':
      toast.error(t.roles.segregationOfDuties);
      return;
    case 'forbidden':
      toast.error(t.roles.forbidden);
      return;
    case 'closedPeriod':
      toast.error(t.crud.closedPeriod);
      return;
    case 'closedYear':
      toast.error(t.crud.closedYear);
      return;
    default:
      if (e) {
        toast.error(e.message || t.common.error, {
          description: e.traceId ? `${t.common.reference}: ${e.traceId}` : undefined,
        });
      } else {
        toast.error(t.common.error);
      }
  }
}
```

- [ ] **Step 2: Rewrite `form-errors.ts`**

Replace the entire file `src/lib/api/form-errors.ts` with:

```ts
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import type { Messages } from '@/lib/i18n/messages.id';
import { classifyApiError } from './classifyApiError';

/**
 * Translate an API error into form field errors and/or a toast.
 * - 409 (any code) -> `code` field error (duplicate code)
 * - 403            -> toast (SoD-distinct; UI already role-gates, this is defensive)
 * - details.errors[] -> root error listing the messages
 * - otherwise      -> toast with message + traceId
 */
export function applyApiErrorToForm(
  error: unknown,
  form: UseFormReturn<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  t: Messages,
): void {
  const { kind, error: e } = classifyApiError(error);
  if (!e) {
    toast.error(t.common.error);
    return;
  }
  switch (kind) {
    case 'closedPeriod':
    case 'closedYear':
    case 'conflict':
      form.setError('code', { message: t.crud.duplicateCode });
      return;
    case 'segregationOfDuties':
      toast.error(t.roles.segregationOfDuties);
      return;
    case 'forbidden':
      toast.error(t.roles.forbidden);
      return;
    default:
      if (e.fieldErrors.length > 0) {
        form.setError('root', { message: e.fieldErrors.join('. ') });
      } else {
        toast.error(e.message || t.common.error, {
          description: e.traceId ? `${t.common.reference}: ${e.traceId}` : undefined,
        });
      }
  }
}
```

- [ ] **Step 3: Run the two regression tests**

Run: `pnpm test --run src/lib/api/toastApiError.test.ts src/lib/api/form-errors.test.ts`
Expected: PASS, unchanged. `toastApiError`: SoD, plain-403→forbidden, 409 CLOSED_PERIOD, 500→message+traceId, non-ApiError→`common.error`. `form-errors`: 409 CONFLICT→`code`, 400+`details.errors`→`root`, 403→toast, 500→message+traceId, non-ApiError→toast. (The 400-with-errors case maps to `kind: 'unknown'` with `e` present → the `default` branch's `fieldErrors`→`root` path — verify it stays green.) If a test fails, the renderer's projection diverged from the original — fix the renderer, not the test.

- [ ] **Step 4: Build + commit**

Run: `pnpm run build` → succeeds.

```bash
git add src/lib/api/toastApiError.ts src/lib/api/form-errors.ts
git commit -m "refactor(api): toastApiError + applyApiErrorToForm via classifyApiError

Both now switch on the classification kind instead of re-matching status/code;
behavior unchanged (the existing tests stay green)."
```

---

### Task 3: Move `describeError` to `lib/api/` + reimplement on the classifier

**Files:**
- Move: `src/components/common/describeError.ts` → `src/lib/api/describeError.ts` (rewrite body)
- Move: `src/components/common/describeError.test.ts` → `src/lib/api/describeError.test.ts` (content unchanged)
- Modify: `src/components/common/ErrorState.tsx` (import path)
- Regression: the moved `describeError.test.ts` + `src/components/common/ErrorState.test.tsx`

**Interfaces:**
- Consumes: `classifyApiError` (Task 1).
- Produces: `describeError(error, t): ErrorDescription`, `ErrorKind`, `ErrorDescription` — now from `@/lib/api/describeError` (same shapes as before).

- [ ] **Step 1: Move both describeError files into `lib/api/` (git mv, preserve history)**

```bash
git mv src/components/common/describeError.ts src/lib/api/describeError.ts
git mv src/components/common/describeError.test.ts src/lib/api/describeError.test.ts
```

The test imports `describeError` via the relative `./describeError`, `ApiError` via `@/lib/api/errors`, and `id` via `@/lib/i18n/messages.id` — all still resolve after the co-move, so the test needs no content change.

- [ ] **Step 2: Reimplement `src/lib/api/describeError.ts` on the classifier**

Replace the entire file `src/lib/api/describeError.ts` with:

```ts
import type { Messages } from '@/lib/i18n/messages.id';
import { classifyApiError } from './classifyApiError';

export type ErrorKind =
  | 'offline'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'validation'
  | 'server'
  | 'generic';

export interface ErrorDescription {
  kind: ErrorKind;
  title: string;
  message: string;
  showRetry: boolean;
  traceId?: string;
}

/** Map any thrown value to user-facing page copy. Never throws. Projects the
 *  shared classifyApiError kind onto the page-level ErrorKind set. */
export function describeError(error: unknown, t: Messages): ErrorDescription {
  const { kind, error: e } = classifyApiError(error);
  const traceId = e?.traceId;
  const make = (
    k: ErrorKind,
    group: { title: string; message: string },
    showRetry: boolean,
  ): ErrorDescription => ({ kind: k, title: group.title, message: group.message, showRetry, traceId });

  switch (kind) {
    case 'offline':
      return make('offline', t.errors.offline, true);
    case 'unauthorized':
      return make('unauthorized', t.errors.unauthorized, false);
    case 'segregationOfDuties':
    case 'forbidden':
      return make('forbidden', t.errors.forbidden, false);
    case 'notFound':
      return make('notFound', t.errors.notFound, false);
    case 'validation':
      return make('validation', t.errors.validation, false);
    case 'server':
      return make('server', t.errors.server, true);
    default:
      // closedPeriod | closedYear | conflict | unknown
      return make('generic', t.errors.generic, true);
  }
}
```

- [ ] **Step 3: Update the `ErrorState.tsx` import**

In `src/components/common/ErrorState.tsx`, change the import (line 13):

```ts
import { describeError, type ErrorKind } from '@/lib/api/describeError';
```

(The `ICONS: Record<ErrorKind, LucideIcon>` map and the rest of `ErrorState` are unchanged — `ErrorKind`'s 7 values are identical.)

- [ ] **Step 4: Run the moved test + ErrorState test**

Run: `pnpm test --run src/lib/api/describeError.test.ts src/components/common/ErrorState.test.tsx`
Expected: PASS, unchanged. `describeError`: 503→server/retry+traceId, 403→forbidden/no-retry, 404→notFound, 422→validation, non-ApiError→generic/retry. `ErrorState` renders the right icon/copy/retry per kind. If `ErrorState.test.tsx` imports `describeError` directly (it may not — it tests the component), confirm any such import points at the new path.

- [ ] **Step 5: Full verification gate**

Run all:
```bash
pnpm run build
pnpm test --run
pnpm run lint
```
Expected: build succeeds (real `tsc -b` — confirms no dangling `@/components/common/describeError` import); full suite passes (the new `classifyApiError.test.ts` + all behavior tests incl. the indirect SoD-toast assertions in `DocumentListPage.test.tsx`/`useDocumentListController.test.tsx`/`QueryState.test.tsx`); lint = 0 errors / 8 pre-existing warnings.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(api): move describeError to lib/api, reimplement on classifyApiError

describeError + ErrorKind/ErrorDescription now live in the API-error layer and
project the shared classifier; ErrorState imports the new path. Page behavior
unchanged."
```

---

## Self-Review

**1. Spec coverage:**
- Pure `classifyApiError` + `ApiErrorKind`/`ApiErrorClass` → Task 1. ✓
- `toastApiError` + `applyApiErrorToForm` reimplemented as projections, behavior preserved (incl. form 409→`code`, 400+fieldErrors→`root`, non-ApiError→`common.error`) → Task 2. ✓
- `describeError` moved to `lib/api/`, reimplemented on the classifier, folding finer kinds into its 7-value `ErrorKind`; `ErrorState` import updated; test co-moved → Task 3. ✓
- Existing behavior tests kept green as the regression net; new `classifyApiError.test.ts` is the authoritative unit test → Tasks 1–3. ✓
- Pure refactor, no behavior change → Global Constraints + every renderer matches its original test. ✓
- `pnpm run build` as the real typecheck → every task. ✓

**2. Placeholder scan:** No TBD/TODO/"handle errors"/"similar to". Full file bodies for the classifier + both renderers + the moved describeError; complete test code; exact `git mv` + import-edit + commands.

**3. Type consistency:** `classifyApiError`/`ApiErrorKind`/`ApiErrorClass` defined in Task 1 and consumed verbatim in Tasks 2–3. The renderers' `switch` arms cover the exact `ApiErrorKind` values; `describeError`'s `ErrorKind` (7 values) is unchanged from the original (so `ErrorState`'s `ICONS` map still type-checks). `e.fieldErrors`/`e.message`/`e.traceId` match the `ApiError` shape.

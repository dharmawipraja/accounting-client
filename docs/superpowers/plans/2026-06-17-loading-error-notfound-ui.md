# Loading / Error / Not-Found UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the accounting client a consistent, app-wide loading/error/not-found system — shimmer skeletons, a richer error layer (inline + router + render-crash boundary) with friendly per-type Indonesian copy and retry, and real 404 / record-not-found UI.

**Architecture:** A handful of reusable components in `src/components/common/` (skeletons, `ErrorState`, `NotFound`, `AppErrorBoundary`) plus a pure `describeError` mapper and a `QueryState` glue component, wired into router (`__root`/`_app`) and `main.tsx`, then rolled out to every feature page via the `QueryState` pattern.

**Tech Stack:** React 19, TanStack Query 5 + Router 1 (file-based), Tailwind 4 + `tw-animate-css` (already installed), shadcn/ui, Vitest 4 + RTL + MSW v2, single-locale i18n via `useT()` (`src/lib/i18n/messages.id.ts`).

**Spec:** `docs/superpowers/specs/2026-06-17-loading-error-notfound-ui-design.md`

**Branch:** `feat/loading-error-notfound-ui` (already created; spec committed at `f55c0ab`).

---

## File Structure

**New files**
- `src/components/common/describeError.ts` — pure `(error, t) → { kind, title, message, showRetry, traceId }`.
- `src/components/common/describeError.test.ts` — mapping table.
- `src/components/common/skeletons/SkeletonTable.tsx` — list/table skeleton.
- `src/components/common/skeletons/SkeletonForm.tsx` — editor/detail skeleton.
- `src/components/common/skeletons/SkeletonCards.tsx` — dashboard card skeleton.
- `src/components/common/skeletons/skeletons.test.tsx` — counts render.
- `src/components/common/NotFound.tsx` — 404 / record-not-found.
- `src/components/common/NotFound.test.tsx`.
- `src/components/common/AppErrorBoundary.tsx` — class boundary + `FatalError`.
- `src/components/common/AppErrorBoundary.test.tsx`.
- `src/components/common/QueryState.tsx` — query branch glue.
- `src/components/common/QueryState.test.tsx`.

**Modified files**
- `src/lib/i18n/messages.id.ts` — add `errors.*`, `notFound.*`.
- `src/components/ui/skeleton.tsx` — `variant` prop (`shimmer` default).
- `src/index.css` — `.animate-shimmer` keyframe/utility.
- `src/components/common/ErrorState.tsx` — `onRetry` + `describeError` + per-kind icon.
- `src/components/common/ErrorState.test.tsx` — updated for new behavior.
- `src/app/routes/__root.tsx` — `notFoundComponent`, `errorComponent`.
- `src/app/routes/_app.tsx` — `errorComponent` that keeps `AppShell`.
- `src/main.tsx` — wrap `<RouterProvider>` in `<AppErrorBoundary>`.
- Feature pages (Tasks 10–12): partners, sales-invoices, purchase-bills, payments, journals (list + detail), dashboard, reports (6), accounts, tax-codes, periods, audit, settings.

---

## Task 1: i18n strings (`errors.*`, `notFound.*`)

**Files:**
- Modify: `src/lib/i18n/messages.id.ts` (insert two new top-level keys after the `common: { … },` block, which ends near line 19)

- [ ] **Step 1: Add the namespaces**

Insert immediately after the `common: { … },` object (before `auth: {`):

```ts
  errors: {
    offline: { title: 'Tidak ada koneksi', message: 'Periksa koneksi internet Anda lalu coba lagi.' },
    unauthorized: { title: 'Sesi berakhir', message: 'Silakan masuk kembali untuk melanjutkan.' },
    forbidden: { title: 'Akses ditolak', message: 'Anda tidak memiliki izin untuk melihat data ini.' },
    notFound: { title: 'Tidak ditemukan', message: 'Data yang Anda cari tidak ditemukan.' },
    validation: { title: 'Data tidak valid', message: 'Periksa kembali data yang dikirim.' },
    server: { title: 'Server bermasalah', message: 'Terjadi kesalahan di server. Coba lagi beberapa saat.' },
    generic: { title: 'Gagal memuat data', message: 'Terjadi kesalahan saat mengambil data. Coba lagi.' },
    retry: 'Coba lagi',
    fatalTitle: 'Terjadi kesalahan',
    fatalMessage: 'Aplikasi mengalami masalah tak terduga. Muat ulang halaman.',
    reload: 'Muat ulang',
  },
  notFound: {
    pageTitle: 'Halaman tidak ditemukan',
    pageMessage: 'Halaman yang Anda cari tidak ada atau telah dipindahkan.',
    backToDashboard: 'Kembali ke Dasbor',
    recordTitle: 'Data tidak ditemukan',
    recordMessage: 'Data yang Anda cari tidak ada atau telah dihapus.',
    backToList: 'Kembali ke daftar',
  },
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (the `Messages` type is inferred from `id`, so the new keys are now typed and available as `t.errors.*` / `t.notFound.*`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat(i18n): add errors and notFound message namespaces"
```

---

## Task 2: Shimmer skeleton primitive

**Files:**
- Modify: `src/components/ui/skeleton.tsx`
- Modify: `src/index.css`
- Test: `src/components/ui/skeleton.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/skeleton.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Skeleton } from './skeleton';

it('uses the shimmer animation by default', () => {
  const { container } = render(<Skeleton className="h-4 w-10" />);
  const el = container.querySelector('[data-slot="skeleton"]')!;
  expect(el).toHaveClass('animate-shimmer');
  expect(el).toHaveClass('h-4');
});

it('uses pulse when variant="pulse"', () => {
  const { container } = render(<Skeleton variant="pulse" />);
  const el = container.querySelector('[data-slot="skeleton"]')!;
  expect(el).toHaveClass('animate-pulse');
  expect(el).not.toHaveClass('animate-shimmer');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/ui/skeleton.test.tsx`
Expected: FAIL — current `Skeleton` always applies `animate-pulse`, no `variant` prop.

- [ ] **Step 3: Implement the variant**

Replace the entire contents of `src/components/ui/skeleton.tsx`:

```tsx
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  variant = "shimmer",
  ...props
}: React.ComponentProps<"div"> & { variant?: "shimmer" | "pulse" }) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted",
        variant === "shimmer" ? "animate-shimmer" : "animate-pulse",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
```

- [ ] **Step 4: Add the shimmer utility CSS**

Append to the end of `src/index.css`:

```css
/* Skeleton shimmer: a sweeping highlight overlay that reads on any base
   colour and in both themes (uses --foreground at low alpha). */
@keyframes skeleton-shimmer {
  100% { transform: translateX(100%); }
}
.animate-shimmer {
  position: relative;
  overflow: hidden;
}
.animate-shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--foreground) 8%, transparent),
    transparent
  );
  animation: skeleton-shimmer 1.6s infinite;
}
@media (prefers-reduced-motion: reduce) {
  .animate-shimmer::after { animation: none; }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/ui/skeleton.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/skeleton.tsx src/index.css src/components/ui/skeleton.test.tsx
git commit -m "feat(ui): shimmer variant for Skeleton (0 new deps, tw-animate-css)"
```

---

## Task 3: Composed skeletons (Table / Form / Cards)

**Files:**
- Create: `src/components/common/skeletons/SkeletonTable.tsx`
- Create: `src/components/common/skeletons/SkeletonForm.tsx`
- Create: `src/components/common/skeletons/SkeletonCards.tsx`
- Test: `src/components/common/skeletons/skeletons.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/components/common/skeletons/skeletons.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SkeletonTable } from './SkeletonTable';
import { SkeletonForm } from './SkeletonForm';
import { SkeletonCards } from './SkeletonCards';

const count = (c: HTMLElement) => c.querySelectorAll('[data-slot="skeleton"]').length;

it('SkeletonTable renders header + rows × cols skeletons', () => {
  const { container } = render(<SkeletonTable rows={3} cols={4} />);
  // header row (4) + 3 body rows × 4 = 16
  expect(count(container)).toBe(16);
});

it('SkeletonForm renders a label+input per field plus a submit bar', () => {
  const { container } = render(<SkeletonForm fields={5} />);
  // 5 × 2 + 1 = 11
  expect(count(container)).toBe(11);
});

it('SkeletonCards renders the requested number of cards', () => {
  const { container } = render(<SkeletonCards count={4} />);
  expect(container.querySelectorAll('[data-testid="skeleton-card"]').length).toBe(4);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/common/skeletons/skeletons.test.tsx`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement SkeletonTable**

Create `src/components/common/skeletons/SkeletonTable.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

/** Loading placeholder shaped like a DataTable. `cols` is cosmetic — set it to
 *  the real table's column count so the skeleton matches what loads in. */
export function SkeletonTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border">
      <div className="flex gap-4 border-b p-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 p-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement SkeletonForm**

Create `src/components/common/skeletons/SkeletonForm.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

/** Loading placeholder shaped like a form (label + input pairs + submit). */
export function SkeletonForm({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-32" />
    </div>
  );
}
```

- [ ] **Step 5: Implement SkeletonCards**

Create `src/components/common/skeletons/SkeletonCards.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

/** Loading placeholder for the dashboard summary-card grid. */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} data-testid="skeleton-card" className="space-y-3 rounded-lg border p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/common/skeletons/skeletons.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/common/skeletons/
git commit -m "feat(common): composed SkeletonTable/Form/Cards"
```

---

## Task 4: `describeError` mapper

**Files:**
- Create: `src/components/common/describeError.ts`
- Test: `src/components/common/describeError.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/components/common/describeError.test.ts`:

```ts
import { expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { id } from '@/lib/i18n/messages.id';
import { describeError } from './describeError';

const apiErr = (status: number, traceId?: string) =>
  new ApiError({ status, code: 'X', message: 'raw backend message', traceId });

it('maps 500 to the server copy with retry and passes traceId', () => {
  const d = describeError(apiErr(503, 'trace-9'), id);
  expect(d.kind).toBe('server');
  expect(d.title).toBe(id.errors.server.title);
  expect(d.showRetry).toBe(true);
  expect(d.traceId).toBe('trace-9');
});

it('maps 403 to forbidden with no retry', () => {
  const d = describeError(apiErr(403), id);
  expect(d.kind).toBe('forbidden');
  expect(d.showRetry).toBe(false);
});

it('maps 404 to notFound with no retry', () => {
  expect(describeError(apiErr(404), id).kind).toBe('notFound');
  expect(describeError(apiErr(404), id).showRetry).toBe(false);
});

it('maps 422 to validation with no retry', () => {
  expect(describeError(apiErr(422), id).kind).toBe('validation');
});

it('falls back to generic (with retry) for a non-ApiError', () => {
  const d = describeError(new Error('boom'), id);
  expect(d.kind).toBe('generic');
  expect(d.title).toBe(id.errors.generic.title);
  expect(d.showRetry).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/common/describeError.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement describeError**

Create `src/components/common/describeError.ts`:

```ts
import { ApiError } from '@/lib/api/errors';
import type { Messages } from '@/lib/i18n/messages.id';

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

/** Map any thrown value to user-facing copy. Never throws; defensively handles
 *  non-ApiError values (Error/string/unknown) → generic, unless the browser is
 *  offline → offline. */
export function describeError(error: unknown, t: Messages): ErrorDescription {
  const make = (
    kind: ErrorKind,
    group: { title: string; message: string },
    showRetry: boolean,
    traceId?: string,
  ): ErrorDescription => ({ kind, title: group.title, message: group.message, showRetry, traceId });

  if (!(error instanceof ApiError)) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return offline ? make('offline', t.errors.offline, true) : make('generic', t.errors.generic, true);
  }

  const { status, traceId } = error;
  if (status === 0) return make('offline', t.errors.offline, true, traceId);
  if (status === 401) return make('unauthorized', t.errors.unauthorized, false, traceId);
  if (status === 403) return make('forbidden', t.errors.forbidden, false, traceId);
  if (status === 404) return make('notFound', t.errors.notFound, false, traceId);
  if (status === 422) return make('validation', t.errors.validation, false, traceId);
  if (status >= 500) return make('server', t.errors.server, true, traceId);
  return make('generic', t.errors.generic, true, traceId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/common/describeError.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/common/describeError.ts src/components/common/describeError.test.ts
git commit -m "feat(common): describeError — per-type error copy mapper"
```

---

## Task 5: Refactor `ErrorState` (retry + per-type + icon)

**Files:**
- Modify: `src/components/common/ErrorState.tsx`
- Modify: `src/components/common/ErrorState.test.tsx` (existing test asserts the OLD raw-message behavior and must be rewritten)

- [ ] **Step 1: Rewrite the test to the new behavior**

Replace the entire contents of `src/components/common/ErrorState.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { id } from '@/lib/i18n/messages.id';
import { ErrorState } from './ErrorState';

it('shows friendly per-type copy + traceId, and a working retry for retryable errors', async () => {
  const onRetry = vi.fn();
  const err = new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Boom', traceId: 'trace-7' });
  render(<ErrorState error={err} onRetry={onRetry} />);
  expect(screen.getByText(id.errors.server.title)).toBeInTheDocument();
  expect(screen.getByText(/trace-7/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: id.errors.retry }));
  expect(onRetry).toHaveBeenCalledOnce();
});

it('hides retry for non-retryable errors (403)', () => {
  const err = new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' });
  render(<ErrorState error={err} onRetry={vi.fn()} />);
  expect(screen.getByText(id.errors.forbidden.title)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: id.errors.retry })).not.toBeInTheDocument();
});

it('hides retry when no onRetry is provided', () => {
  const err = new ApiError({ status: 500, code: 'X', message: 'no' });
  render(<ErrorState error={err} />);
  expect(screen.queryByRole('button', { name: id.errors.retry })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/common/ErrorState.test.tsx`
Expected: FAIL — current `ErrorState` shows the raw message ("Boom"), has no retry button, no per-type title.

- [ ] **Step 3: Implement the refactor**

Replace the entire contents of `src/components/common/ErrorState.tsx`:

```tsx
import {
  TriangleAlert,
  WifiOff,
  ShieldAlert,
  SearchX,
  FileWarning,
  ServerCrash,
  RotateCw,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';
import { describeError, type ErrorKind } from './describeError';

const ICONS: Record<ErrorKind, LucideIcon> = {
  offline: WifiOff,
  unauthorized: ShieldAlert,
  forbidden: ShieldAlert,
  notFound: SearchX,
  validation: FileWarning,
  server: ServerCrash,
  generic: TriangleAlert,
};

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useT();
  const { kind, title, message, showRetry, traceId } = describeError(error, t);
  const Icon = ICONS[kind];
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <Icon className="size-6 text-destructive" />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {showRetry && onRetry && (
        <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>
          <RotateCw className="size-4" /> {t.errors.retry}
        </Button>
      )}
      {traceId && (
        <p className="text-xs text-muted-foreground">
          {t.common.reference}: <code>{traceId}</code>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/common/ErrorState.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/common/ErrorState.tsx src/components/common/ErrorState.test.tsx
git commit -m "feat(common): ErrorState — per-type copy, icon, and retry action"
```

---

## Task 6: `NotFound` component

**Files:**
- Create: `src/components/common/NotFound.tsx`
- Test: `src/components/common/NotFound.test.tsx` (create)

Note: the default action renders a TanStack `<Link>`, which needs router context. The unit test passes an explicit `action` to avoid that; the default link is covered by router wiring (Task 8) + build.

- [ ] **Step 1: Write the failing test**

Create `src/components/common/NotFound.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { NotFound } from './NotFound';

it('renders the default 404 page copy', () => {
  render(<NotFound action={<a href="/dashboard">back</a>} />);
  expect(screen.getByText('404')).toBeInTheDocument();
  expect(screen.getByText(id.notFound.pageTitle)).toBeInTheDocument();
  expect(screen.getByText(id.notFound.pageMessage)).toBeInTheDocument();
});

it('renders overridden record-not-found copy', () => {
  render(
    <NotFound
      title={id.notFound.recordTitle}
      message={id.notFound.recordMessage}
      action={<a href="/x">back</a>}
    />,
  );
  expect(screen.getByText(id.notFound.recordTitle)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/common/NotFound.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement NotFound**

Create `src/components/common/NotFound.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';

/** 404 surface. Defaults to the page-level 404 (big numeral + "back to
 *  dashboard"); pass title/message/action to reuse it as a record-not-found
 *  state on a detail page. */
export function NotFound({
  title,
  message,
  action,
}: {
  title?: string;
  message?: string;
  action?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-muted-foreground/40">404</p>
      <p className="text-lg font-semibold">{title ?? t.notFound.pageTitle}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message ?? t.notFound.pageMessage}</p>
      {action ?? (
        <Button asChild className="mt-2">
          <Link to="/dashboard">{t.notFound.backToDashboard}</Link>
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/common/NotFound.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/common/NotFound.tsx src/components/common/NotFound.test.tsx
git commit -m "feat(common): NotFound (404 page + record-not-found)"
```

---

## Task 7: `AppErrorBoundary` + `FatalError`, wire into `main.tsx`

**Files:**
- Create: `src/components/common/AppErrorBoundary.tsx`
- Test: `src/components/common/AppErrorBoundary.test.tsx` (create)
- Modify: `src/main.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/AppErrorBoundary.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { AppErrorBoundary } from './AppErrorBoundary';

function Boom(): never {
  throw new Error('render crash');
}

it('renders FatalError when a child throws', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <AppErrorBoundary>
      <Boom />
    </AppErrorBoundary>,
  );
  expect(screen.getByText(id.errors.fatalTitle)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: id.errors.reload })).toBeInTheDocument();
  spy.mockRestore();
});

it('renders children when nothing throws', () => {
  render(
    <AppErrorBoundary>
      <p>safe content</p>
    </AppErrorBoundary>,
  );
  expect(screen.getByText('safe content')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/common/AppErrorBoundary.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the boundary + FatalError**

Create `src/components/common/AppErrorBoundary.tsx`:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';

function FatalError() {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-12 text-center">
      <TriangleAlert className="size-8 text-destructive" />
      <p className="text-lg font-semibold">{t.errors.fatalTitle}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{t.errors.fatalMessage}</p>
      <Button className="mt-2" onClick={() => window.location.reload()}>
        {t.errors.reload}
      </Button>
    </div>
  );
}

/** Last-resort boundary for render-time crashes. Query/route errors are handled
 *  before reaching here (QueryState / router errorComponent). */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: true } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info);
  }

  render() {
    return this.state.hasError ? <FatalError /> : this.props.children;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/common/AppErrorBoundary.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire it into `main.tsx`**

In `src/main.tsx`, add the import and wrap `<RouterProvider>`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Providers } from '@/app/providers';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import { routeTree } from './routeTree.gen';
import './index.css';

const router = createRouter({ routeTree });
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <AppErrorBoundary>
        <RouterProvider router={router} />
      </AppErrorBoundary>
    </Providers>
  </StrictMode>,
);
```

- [ ] **Step 6: Verify typecheck + build**

Run: `pnpm exec tsc --noEmit && pnpm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/common/AppErrorBoundary.tsx src/components/common/AppErrorBoundary.test.tsx src/main.tsx
git commit -m "feat(common): AppErrorBoundary for render crashes; wire into main"
```

---

## Task 8: Router wiring (`notFoundComponent` + `errorComponent`)

**Files:**
- Modify: `src/app/routes/__root.tsx`
- Modify: `src/app/routes/_app.tsx`

No unit test (router boundaries need a full router harness); verified by typecheck + build + the manual smoke checklist in Task 13.

- [ ] **Step 1: Add root notFound + error components**

Replace the entire contents of `src/app/routes/__root.tsx`:

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { ErrorState } from '@/components/common/ErrorState';
import { NotFound } from '@/components/common/NotFound';

export const Route = createRootRoute({
  component: () => <Outlet />,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <ErrorState error={error} />
    </div>
  ),
  notFoundComponent: () => <NotFound />,
});
```

- [ ] **Step 2: Add an `_app` errorComponent that keeps the shell**

Replace the entire contents of `src/app/routes/_app.tsx`:

```tsx
import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/common/AppShell';
import { ErrorState } from '@/components/common/ErrorState';
import { requireAuth } from '@/features/auth/guard';

export const Route = createFileRoute('/_app')({
  beforeLoad: () => requireAuth(),
  component: function AppLayout() {
    return (
      <AppShell>
        <Outlet />
      </AppShell>
    );
  },
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="p-6">
        <ErrorState error={error} />
      </div>
    </AppShell>
  ),
});
```

- [ ] **Step 3: Verify typecheck + build**

Run: `pnpm exec tsc --noEmit && pnpm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/routes/__root.tsx src/app/routes/_app.tsx
git commit -m "feat(router): notFoundComponent (404) + errorComponent (in-shell)"
```

---

## Task 9: `QueryState` glue component

**Files:**
- Create: `src/components/common/QueryState.tsx`
- Test: `src/components/common/QueryState.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/components/common/QueryState.test.tsx`. The test passes hand-built objects shaped like a `UseQueryResult` (only the fields `QueryState` reads), so no QueryClient/MSW is needed:

```tsx
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import { id } from '@/lib/i18n/messages.id';
import { QueryState } from './QueryState';

// Minimal stand-in for a query result; cast through unknown.
const q = (over: Record<string, unknown>) =>
  ({ isPending: false, isError: false, data: undefined, error: null, refetch: vi.fn(), ...over }) as unknown as UseQueryResult<{ name: string }, ApiError>;

it('renders the loading node while pending', () => {
  render(
    <QueryState query={q({ isPending: true })} loading={<p>loading…</p>}>
      {(d) => <p>{d.name}</p>}
    </QueryState>,
  );
  expect(screen.getByText('loading…')).toBeInTheDocument();
});

it('renders children with data when resolved', () => {
  render(
    <QueryState query={q({ data: { name: 'Budi' } })} loading={<p>loading…</p>}>
      {(d) => <p>{d.name}</p>}
    </QueryState>,
  );
  expect(screen.getByText('Budi')).toBeInTheDocument();
});

it('renders ErrorState on error', () => {
  const error = new ApiError({ status: 500, code: 'X', message: 'no' });
  render(
    <QueryState query={q({ isError: true, error })} loading={<p>loading…</p>}>
      {() => <p>data</p>}
    </QueryState>,
  );
  expect(screen.getByText(id.errors.server.title)).toBeInTheDocument();
});

it('renders the notFound node when error is an ApiError 404 and notFound is given', () => {
  const error = new ApiError({ status: 404, code: 'NOT_FOUND', message: 'no' });
  render(
    <QueryState query={q({ isError: true, error })} loading={<p>l</p>} notFound={<p>missing</p>}>
      {() => <p>data</p>}
    </QueryState>,
  );
  expect(screen.getByText('missing')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/common/QueryState.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement QueryState**

Create `src/components/common/QueryState.tsx`:

```tsx
import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import { ErrorState } from './ErrorState';

/** Standardises the loading → notFound → error → data branch order for a
 *  TanStack Query result so every page handles states identically.
 *  - `onRetry` wires the retry button to `query.refetch`.
 *  - `notFound` (opt-in) renders for an ApiError 404 instead of ErrorState. */
export function QueryState<T>({
  query,
  loading,
  notFound,
  onRetry = false,
  children,
}: {
  query: UseQueryResult<T, ApiError>;
  loading: ReactNode;
  notFound?: ReactNode;
  onRetry?: boolean;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <>{loading}</>;
  if (query.isError) {
    if (notFound && query.error instanceof ApiError && query.error.status === 404) {
      return <>{notFound}</>;
    }
    return <ErrorState error={query.error} onRetry={onRetry ? () => void query.refetch() : undefined} />;
  }
  return <>{children(query.data)}</>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/common/QueryState.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/common/QueryState.tsx src/components/common/QueryState.test.tsx
git commit -m "feat(common): QueryState — standard loading/error/notFound glue"
```

---

## Task 10: Roll out — list pages

**Files (modify):**
- `src/features/partners/PartnersPage.tsx`
- `src/features/sales-invoices/SalesInvoicesPage.tsx`
- `src/features/purchase-bills/PurchaseBillsPage.tsx`
- `src/features/payments/PaymentsPage.tsx`
- `src/features/journals/JournalsPage.tsx`

Every list page has the same ternary:
```tsx
{page.isLoading ? <Skeleton className="h-40 w-full" />
  : page.isError ? <ErrorState error={page.error} />
  : <>
      <DataTable … />
      <Pagination … />
    </>}
```
Replace it with a `QueryState` wrapper, keeping that page's own `DataTable`/`Pagination`/filter JSX inside the children. PartnersPage is the worked example; apply the identical transform to the others.

- [ ] **Step 1: Convert `PartnersPage` (worked example)**

In `src/features/partners/PartnersPage.tsx`:

(a) Swap imports — remove `Skeleton`, add `QueryState` + `SkeletonTable`:
```tsx
// remove: import { Skeleton } from '@/components/ui/skeleton';
import { QueryState } from '@/components/common/QueryState';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
```
(b) Replace the render ternary (lines ~70–75) with:
```tsx
      <QueryState query={page} loading={<SkeletonTable rows={8} cols={5} />} onRetry>
        {(env) => {
          const q = search.toLowerCase();
          const rows = env.data.filter((p) => !q || p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
          return (
            <>
              <DataTable columns={columns} data={rows} />
              <Pagination offset={offset} limit={LIMIT} total={env.total} onChange={setOffset} />
            </>
          );
        }}
      </QueryState>
```
(c) Delete the now-unused `rows` `useMemo` (lines ~42–45) since filtering moved inside the children. Keep the `columns` `useMemo`.

- [ ] **Step 2: Apply the same transform to the other four list pages**

For each of `SalesInvoicesPage.tsx`, `PurchaseBillsPage.tsx`, `PaymentsPage.tsx`, `JournalsPage.tsx`: swap the `Skeleton` import for `QueryState` + `SkeletonTable`, replace the `isLoading/isError` ternary with the `QueryState` wrapper (cols = that table's column count — cosmetic; use 6 for invoices/bills/payments, 5 for journals), and move any page-scoped `rows` filtering inside the `children`. Preserve each page's status/direction filter buttons and dialogs unchanged.

- [ ] **Step 3: Run the affected page tests + typecheck**

Run: `pnpm exec vitest run src/features/partners src/features/sales-invoices src/features/purchase-bills src/features/payments src/features/journals && pnpm exec tsc --noEmit`
Expected: PASS. (Existing page tests assert the table renders after data loads; the `QueryState` path returns the same table, so they stay green. If a test asserted on a raw `Skeleton` class, update it to assert the skeleton table via `[data-slot="skeleton"]`.)

- [ ] **Step 4: Commit**

```bash
git add src/features/partners/PartnersPage.tsx src/features/sales-invoices/SalesInvoicesPage.tsx src/features/purchase-bills/PurchaseBillsPage.tsx src/features/payments/PaymentsPage.tsx src/features/journals/JournalsPage.tsx
git commit -m "feat(lists): adopt QueryState + SkeletonTable on all list pages"
```

---

## Task 11: Roll out — detail / editor pages

**Files (modify):**
- `src/features/sales-invoices/InvoiceEditorPage.tsx`
- `src/features/purchase-bills/BillEditorPage.tsx`
- `src/features/payments/PaymentEditorPage.tsx`
- `src/features/journals/JournalEntryEditorPage.tsx` (journal `$id` and `new`)

Each detail page has:
```tsx
if (item.isLoading) return <Skeleton className="h-96 w-full" />;
if (item.isError || !item.data) return <ErrorState error={item.error} />;
```
Replace with a `QueryState` wrapper that adds the `SkeletonForm` and a record-level `NotFound`.

- [ ] **Step 1: Convert `InvoiceEditorPage` (worked example)**

Replace the entire contents of `src/features/sales-invoices/InvoiceEditorPage.tsx`:

```tsx
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { NotFound } from '@/components/common/NotFound';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { useT } from '@/lib/i18n/useT';
import { InvoiceForm } from './InvoiceForm';
import { salesInvoicesApi } from './hooks';

export function InvoiceEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/sales-invoices' });
  const item = salesInvoicesApi.useItem(id ?? '');

  if (!id) {
    return (
      <div>
        <PageHeader title={t.salesInvoices.newInvoice} />
        <InvoiceForm mode="create" onSaved={goList} />
      </div>
    );
  }

  return (
    <QueryState
      query={item}
      loading={<SkeletonForm fields={6} />}
      onRetry
      notFound={
        <NotFound
          title={t.notFound.recordTitle}
          message={t.notFound.recordMessage}
          action={<Button onClick={goList}>{t.notFound.backToList}</Button>}
        />
      }
    >
      {(data) => {
        const readOnly = data.status !== 'DRAFT';
        return (
          <div>
            <PageHeader title={readOnly ? t.salesInvoices.view : t.salesInvoices.editInvoice} />
            <InvoiceForm mode="edit" invoice={data} onSaved={goList} readOnly={readOnly} />
          </div>
        );
      }}
    </QueryState>
  );
}
```

- [ ] **Step 2: Apply the same transform to the other detail pages**

For `BillEditorPage.tsx`, `PaymentEditorPage.tsx`, and `JournalEntryEditorPage.tsx`: swap `Skeleton`→`SkeletonForm` + `QueryState` + `NotFound`, move the post-load JSX into the `children`, and point `backToList` at that feature's list route (`/purchase-bills`, `/payments`, `/journals`). Keep the create-mode (`!id`) bypass as-is.

- [ ] **Step 3: Run affected tests + typecheck**

Run: `pnpm exec vitest run src/features/sales-invoices src/features/purchase-bills src/features/payments src/features/journals && pnpm exec tsc --noEmit`
Expected: PASS. (Editor tests that mount with a loaded item still render the form via `children`.)

- [ ] **Step 4: Commit**

```bash
git add src/features/sales-invoices/InvoiceEditorPage.tsx src/features/purchase-bills/BillEditorPage.tsx src/features/payments/PaymentEditorPage.tsx src/features/journals/
git commit -m "feat(editors): QueryState + SkeletonForm + record NotFound on detail pages"
```

---

## Task 12: Roll out — dashboard, reports, and remaining pages

**Files (modify):** dashboard + the 6 report pages + accounts, tax-codes, periods, audit, settings.

- [ ] **Step 1: Dashboard skeleton**

In `src/features/dashboard/DashboardPage.tsx`, render `SkeletonCards` for the summary grid while the queries are pending. Add `import { SkeletonCards } from '@/components/common/skeletons/SkeletonCards';`. If every summary query is pending on first paint, show `<SkeletonCards count={4} />` in place of the grid; otherwise keep the existing per-card `loading`/`error` props (already wired) and just ensure each `SummaryCard`'s error path uses the shared retry styling. (Per-card granular states from the audit stay — this only swaps the loading visual.)

- [ ] **Step 2: Report pages**

Six report pages each run one report query and render a table/figures: `TrialBalancePage.tsx`, `GeneralLedgerPage.tsx`, `AgingPage.tsx` (used by both AR and AP aging routes), `BalanceSheetPage.tsx`, `IncomeStatementPage.tsx`, `CashFlowPage.tsx`. (`ReportsIndexPage.tsx` is a nav index with no data query — skip it.) For each: wrap the rendered output in `QueryState` with `loading={<SkeletonTable rows={6} cols={4} />}` for the tabular reports (`TrialBalancePage`, `GeneralLedgerPage`, `AgingPage`) or `loading={<SkeletonForm fields={5} />}` for the figure-style statements (`BalanceSheetPage`, `IncomeStatementPage`, `CashFlowPage`), plus `onRetry`, moving the loaded render into the `children`. Replace any bare `Skeleton`/`ErrorState` branch.

- [ ] **Step 3: Remaining list-ish pages**

- `src/features/accounts/AccountsPage.tsx` and `src/features/tax-codes/TaxCodesPage.tsx` use `useList()` (bare array, not paged). Wrap with `QueryState` + `<SkeletonTable rows={8} cols={4} />`, `onRetry`; render the `DataTable` in `children` (no `Pagination`).
- `src/features/periods/PeriodsPage.tsx`, `src/features/audit/AuditPage.tsx`: wrap their query render in `QueryState` + an appropriate `SkeletonTable`.
- `src/features/settings/SettingsPage.tsx`: wrap the company-settings query in `QueryState` + `<SkeletonForm fields={5} />`, `onRetry`.

- [ ] **Step 4: Run the full suite + typecheck + lint**

Run: `pnpm test --run && pnpm exec tsc --noEmit && pnpm run lint`
Expected: PASS (pre-existing React-Compiler/RHF warnings are acceptable; 0 errors).

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard src/features/reports src/features/accounts src/features/tax-codes src/features/periods src/features/audit src/features/settings
git commit -m "feat(pages): QueryState + skeletons across dashboard, reports, and remaining pages"
```

---

## Task 13: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Grep for leftovers**

Run: `grep -rn "Skeleton className=\"h-40\|Skeleton className=\"h-96\|page.isLoading ? <Skeleton" src/features`
Expected: no matches (every page migrated to `QueryState` + composed skeletons).

- [ ] **Step 2: Full quality gate**

Run: `pnpm test --run && pnpm exec tsc --noEmit && pnpm run lint && pnpm run build`
Expected: all green; lint 0 errors (pre-existing React-Compiler/RHF warnings only); build succeeds.

- [ ] **Step 3: Manual smoke (dev server)**

Run `pnpm dev`, then verify in the browser:
- A list page shows the shimmer `SkeletonTable`, then the table.
- Stop the API → a list page shows the error state with a working **Coba lagi**; restart API + click retry → data loads.
- Visit an unknown URL (e.g. `/nope`) → the 404 page (style A) with "Kembali ke Dasbor".
- Visit a detail page with a bad id (e.g. `/sales-invoices/00000000-0000-0000-0000-000000000000/edit`) → record-not-found with "Kembali ke daftar".
- The dashboard shows `SkeletonCards` before figures load.

- [ ] **Step 4: Commit (if any smoke fixes were needed)**

```bash
git add -A
git commit -m "fix(ui): loading/error/not-found smoke-test adjustments"
```

---

## Notes for the implementer

- **No new dependencies.** Skeletons use the existing `tw-animate-css` + a CSS utility only.
- **i18n:** all user-facing strings go through `t.*`; never hardcode copy in components.
- **Money/auth/role rules** elsewhere in the app are untouched by this work.
- **`QueryState` uses `isPending`** (not `isLoading`); detail pages bypass it in create-mode (`!id`), so a disabled `useItem('')` query never renders a stuck skeleton.
- **Pre-existing lint warnings** (React Compiler vs TanStack Table / RHF `watch`) are expected and unrelated — do not "fix" them.

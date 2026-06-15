# Periods + Year-End Close (Plan 8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Tutup Buku" screen at `/periods` — pick a fiscal year, see/close/reopen its monthly periods, generate a year's periods, and run/reopen the year-end close. The first new mutation surface since journals.

**Architecture:** New `src/features/periods/` module: a schema (+ tolerant closed-state helpers), data hooks (`usePeriods`, `useYearEndStatus` with 404→null), five mutation hooks (generate / close / reopen period, run / reopen year), and a `PeriodsPage`. Reuses `useDocumentAction`, `RoleGate`, `ConfirmDialog`, `Badge`, `toastApiError`. Role-gated actions; the page is any-auth.

**Tech Stack:** React 19, TanStack Router (file-based) + Query v5, Zod v4, shadcn/ui, Vitest 4 + RTL + MSW v2.

**Reference spec:** `docs/superpowers/specs/2026-06-15-periods-year-end-close-design.md`

---

## Reconciliation note (IMPORTANT — new domain, untyped responses)

The Period and year-end-status response shapes are **inferred** (openapi types only the request DTOs). **Before Task 2**, reconcile live IF `.env` access is available: a throwaway `/tmp/reconcile-8.mjs` that reads `.env`, logs in, and GETs `/ledger/periods?fiscalYear=2026` and `/close/year-end/2026`. Both are read-only. Keep it in `/tmp`. If `.env` is restricted (as in recent sessions), proceed with the tolerant schemas below — `status` is modelled as an optional string AND an optional `isClosed` boolean, and the UI derives "closed" from either, so the schema survives whichever the API returns. **Confirm the real shape in the Task 7 dev smoke** and adjust if needed.

## Ordering note

The new `/periods` `Link`/route only type-checks after `routeTree.gen.ts` is regenerated, so the route + nav + full build are the last task (Task 7). The page (Task 6) renders standalone in tests. The MSW handlers (Task 3) come before the hook/page tests that need them.

## File Structure

```
src/features/periods/
  schema.ts / schema.test.ts            # Task 2 — period + year-end schemas, closed helpers, MONTHS_ID
  usePeriods.ts / usePeriods.test.tsx   # Task 4 — data hooks (list + status-with-404→null)
  mutations.ts / mutations.test.tsx     # Task 5 — generate / close / reopen / runYearEnd / reopenYear
  PeriodsPage.tsx / PeriodsPage.test.tsx# Task 6
src/app/routes/_app/periods.tsx         # Task 7
src/lib/query/keys.ts                   # Task 4 — +periods, +yearEnd
src/lib/i18n/messages.id.ts             # Task 1 — +nav.periods, +periods group
src/components/common/AppShell.tsx      # Task 7 — nav entry
src/test/handlers.ts                    # Task 3 — periodFixtures + 6 handlers
```

**Reuse (unchanged):** `apiFetch(path,{method,body,query,schema,idempotencyKey})`, `useDocumentAction({key,basePath,action})` (POST `{basePath}/:id/{action}` + Idempotency-Key, invalidates `[key]`), `RoleGate allow={Role[]}`, `ConfirmDialog {open,onOpenChange,title,description,confirmLabel,onConfirm,pending,destructive}` (shadcn AlertDialog → role `alertdialog`), `Badge`, `Skeleton`, `ErrorState`, `PageHeader`, `Button`, shadcn `Table`, `formatDateID`, `ApiError` (`.status`), `toastApiError` (409 CLOSED_*/403 already mapped).

---

### Task 1: i18n — `nav.periods` + `periods` group

**Files:** Modify `src/lib/i18n/messages.id.ts`

- [ ] **Step 1:** Add `periods: 'Tutup Buku',` to the `nav` group. Then add a new `periods` group (e.g. after the `reports` group). Keep `export type Messages = typeof id;` intact.

```ts
  periods: {
    title: 'Tutup Buku',
    fiscalYear: 'Tahun Fiskal',
    prevYear: 'Tahun sebelumnya',
    nextYear: 'Tahun berikutnya',
    bulan: 'Bulan',
    status: 'Status',
    aksi: 'Aksi',
    open: 'Terbuka',
    closed: 'Tertutup',
    close: 'Tutup',
    reopen: 'Buka',
    generate: 'Buat Periode',
    noPeriods: 'Belum ada periode untuk tahun ini',
    confirmClose: 'Tutup periode ini? Posting ke periode ini akan dikunci.',
    confirmReopen: 'Buka kembali periode ini?',
    confirmGenerate: 'Buat periode bulanan untuk tahun fiskal ini?',
    yearEndStatus: 'Status Tutup Buku',
    notClosed: 'Belum ditutup',
    closedOn: 'Ditutup pada',
    runYearEnd: 'Tutup Buku Akhir Tahun',
    reopenYear: 'Buka Kembali Tahun',
    confirmYearEnd: 'Menjalankan tutup buku akhir tahun memindahkan laba/rugi ke Laba Ditahan dan mengunci tahun fiskal. Lanjutkan?',
    confirmReopenYear: 'Buka kembali tahun fiskal yang sudah ditutup?',
    closeAllFirst: 'Tutup semua periode sebelum tutup buku tahun',
  },
```

- [ ] **Step 2: Verify** — `pnpm build` (expected: succeeds).
- [ ] **Step 3: Commit**
```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat(periods): i18n for periods + year-end close"
```

---

### Task 2: Schema + helpers

**Files:** Create `src/features/periods/schema.ts`; Test `src/features/periods/schema.test.ts`

- [ ] **Step 1: Write the failing test** — `src/features/periods/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { periodSchema, yearEndStatusSchema, isPeriodClosed, isYearClosed, monthLabel } from './schema';

describe('period schema + helpers', () => {
  it('parses a period; derives open + month label', () => {
    const p = periodSchema.parse({ id: 'p1', fiscalYear: 2026, month: 1, status: 'OPEN', startDate: '2026-01-01', endDate: '2026-01-31', closedAt: null });
    expect(p.fiscalYear).toBe(2026);
    expect(isPeriodClosed(p)).toBe(false);
    expect(monthLabel(p)).toBe('Januari');
  });
  it('treats status CLOSED or isClosed true as closed', () => {
    expect(isPeriodClosed(periodSchema.parse({ id: 'p', fiscalYear: 2026, month: 3, status: 'CLOSED' }))).toBe(true);
    expect(isPeriodClosed(periodSchema.parse({ id: 'p', fiscalYear: 2026, month: 3, isClosed: true }))).toBe(true);
  });
  it('parses year-end status; isYearClosed handles null + closed', () => {
    expect(isYearClosed(null)).toBe(false);
    expect(isYearClosed(yearEndStatusSchema.parse({ fiscalYear: 2026, status: 'CLOSED', closedAt: '2026-12-31T00:00:00Z' }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/periods/schema.test.ts` (FAIL: cannot resolve `./schema`).

- [ ] **Step 3: Write the implementation** — `src/features/periods/schema.ts`:

```ts
import { z } from 'zod';

export const periodSchema = z.object({
  id: z.string(),
  fiscalYear: z.number(),
  month: z.number().nullish(),
  status: z.string().nullish(),
  isClosed: z.boolean().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  closedAt: z.string().nullish(),
});
export type Period = z.infer<typeof periodSchema>;
export const periodListSchema = z.array(periodSchema);

export const yearEndStatusSchema = z.object({
  fiscalYear: z.number().nullish(),
  status: z.string().nullish(),
  isClosed: z.boolean().nullish(),
  closedAt: z.string().nullish(),
  closingEntryId: z.string().nullish(),
});
export type YearEndStatus = z.infer<typeof yearEndStatusSchema>;

export function isPeriodClosed(p: Period): boolean {
  return p.status === 'CLOSED' || p.isClosed === true;
}
export function isYearClosed(s: YearEndStatus | null | undefined): boolean {
  return !!s && (s.status === 'CLOSED' || s.isClosed === true);
}

export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

export function monthLabel(p: Period): string {
  const m = p.month ?? (p.startDate ? new Date(p.startDate).getUTCMonth() + 1 : 0);
  return MONTHS_ID[m - 1] ?? String(p.month ?? '');
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/periods/schema.test.ts` (PASS, 3 tests).

- [ ] **Step 5: Commit**
```bash
git add src/features/periods/schema.ts src/features/periods/schema.test.ts
git commit -m "feat(periods): period + year-end schemas and closed-state helpers"
```

---

### Task 3: MSW handlers

**Files:** Modify `src/test/handlers.ts`

- [ ] **Step 1: Add a `periodFixtures` helper** near the other fixture helpers in `src/test/handlers.ts`:

```ts
export const periodFixtures = (fiscalYear = 2026) =>
  Array.from({ length: 12 }, (_, i) => ({
    id: `period-${fiscalYear}-${i + 1}`,
    fiscalYear,
    month: i + 1,
    status: 'OPEN',
    startDate: `${fiscalYear}-${String(i + 1).padStart(2, '0')}-01`,
    endDate: `${fiscalYear}-${String(i + 1).padStart(2, '0')}-28`,
    closedAt: null,
  }));
```

- [ ] **Step 2: Add the six handlers** to the `handlers` array (e.g. after the journal-entries handlers):

```ts
  http.get(`${API}/ledger/periods`, ({ request }) => {
    const fy = Number(new URL(request.url).searchParams.get('fiscalYear')) || 2026;
    return HttpResponse.json(periodFixtures(fy));
  }),
  http.post(`${API}/ledger/periods/generate`, () => HttpResponse.json(periodFixtures())),
  http.post(`${API}/ledger/periods/:id/close`, ({ params }) => HttpResponse.json({ id: params.id, status: 'CLOSED' })),
  http.post(`${API}/ledger/periods/:id/reopen`, ({ params }) => HttpResponse.json({ id: params.id, status: 'OPEN' })),
  http.get(`${API}/close/year-end/:fy`, () => HttpResponse.json({ code: 'NOT_FOUND', message: 'Not found' }, { status: 404 })),
  http.post(`${API}/close/year-end`, async ({ request }) => {
    const body = (await request.json()) as { fiscalYear: number };
    return HttpResponse.json({ fiscalYear: body.fiscalYear, status: 'CLOSED', closedAt: '2026-12-31T00:00:00Z' });
  }),
  http.post(`${API}/close/year-end/:fy/reopen`, ({ params }) => HttpResponse.json({ fiscalYear: Number(params.fy), status: 'OPEN' })),
```

(Default year-end GET returns 404 = "not closed"; behavioral tests override per scenario. These are simple defaults — tests that assert a mutation fired or need a closed year use inline `server.use` overrides, avoiding global mutable state.)

- [ ] **Step 3: Verify** — `pnpm test --run` (expected: the full existing suite stays green — these are additive handlers).

- [ ] **Step 4: Commit**
```bash
git add src/test/handlers.ts
git commit -m "test(periods): MSW handlers for periods + year-end endpoints"
```

---

### Task 4: Query keys + data hooks

**Files:** Modify `src/lib/query/keys.ts`; Create `src/features/periods/usePeriods.ts`; Test `src/features/periods/usePeriods.test.tsx`

- [ ] **Step 1: Add query keys** to the `queryKeys` object in `src/lib/query/keys.ts`:

```ts
  periods: {
    all: ['periods'] as const,
    list: (fiscalYear: number) => ['periods', 'list', fiscalYear] as const,
  },
  yearEnd: {
    all: ['year-end'] as const,
    status: (fiscalYear: number) => ['year-end', 'status', fiscalYear] as const,
  },
```

- [ ] **Step 2: Write the failing test** — `src/features/periods/usePeriods.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { usePeriods, useYearEndStatus } from './usePeriods';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('usePeriods lists the fiscal year periods', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  const { result } = renderHook(() => usePeriods(2026), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(12);
  expect(result.current.data?.[0].month).toBe(1);
});

it('useYearEndStatus maps a 404 to null (not closed)', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  const { result } = renderHook(() => useYearEndStatus(2026), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
});

it('useYearEndStatus returns the status on 200', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(http.get(`${API}/close/year-end/:fy`, ({ params }) =>
    HttpResponse.json({ fiscalYear: Number(params.fy), status: 'CLOSED', closedAt: '2026-12-31T00:00:00Z' })));
  const { result } = renderHook(() => useYearEndStatus(2026), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.status).toBe('CLOSED');
});
```

- [ ] **Step 3: Run test to verify it fails** — `pnpm test --run src/features/periods/usePeriods.test.tsx` (FAIL: cannot resolve `./usePeriods`).

- [ ] **Step 4: Write the implementation** — `src/features/periods/usePeriods.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import { periodListSchema, yearEndStatusSchema, type Period, type YearEndStatus } from './schema';

export function usePeriods(fiscalYear: number) {
  return useQuery<Period[], ApiError>({
    queryKey: queryKeys.periods.list(fiscalYear),
    queryFn: () => apiFetch('/ledger/periods', { query: { fiscalYear }, schema: periodListSchema }),
  });
}

export function useYearEndStatus(fiscalYear: number) {
  return useQuery<YearEndStatus | null, ApiError>({
    queryKey: queryKeys.yearEnd.status(fiscalYear),
    queryFn: async () => {
      try {
        return await apiFetch(`/close/year-end/${fiscalYear}`, { schema: yearEndStatusSchema });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });
}
```

- [ ] **Step 5: Run test to verify it passes** — `pnpm test --run src/features/periods/usePeriods.test.tsx` (PASS, 3 tests).

- [ ] **Step 6: Commit**
```bash
git add src/lib/query/keys.ts src/features/periods/usePeriods.ts src/features/periods/usePeriods.test.tsx
git commit -m "feat(periods): query keys + data hooks (list + 404-tolerant year-end status)"
```

---

### Task 5: Mutation hooks

**Files:** Create `src/features/periods/mutations.ts`; Test `src/features/periods/mutations.test.tsx`

- [ ] **Step 1: Write the failing test** — `src/features/periods/mutations.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useGeneratePeriods, useClosePeriod, useRunYearEnd } from './mutations';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('useGeneratePeriods POSTs the fiscal year', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let body: unknown = null;
  server.use(http.post(`${API}/ledger/periods/generate`, async ({ request }) => { body = await request.json(); return HttpResponse.json({}); }));
  const { result } = renderHook(() => useGeneratePeriods(), { wrapper });
  result.current.mutate({ fiscalYear: 2026, idempotencyKey: 'k1' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(body).toMatchObject({ fiscalYear: 2026 });
});

it('useClosePeriod POSTs /ledger/periods/:id/close', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let path: string | null = null;
  server.use(http.post(`${API}/ledger/periods/:id/close`, ({ params }) => { path = `close:${params.id}`; return HttpResponse.json({}); }));
  const { result } = renderHook(() => useClosePeriod(), { wrapper });
  result.current.mutate({ id: 'period-2026-1', idempotencyKey: 'k2' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(path).toBe('close:period-2026-1');
});

it('useRunYearEnd POSTs /close/year-end with the fiscal year', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let body: unknown = null;
  server.use(http.post(`${API}/close/year-end`, async ({ request }) => { body = await request.json(); return HttpResponse.json({}); }));
  const { result } = renderHook(() => useRunYearEnd(), { wrapper });
  result.current.mutate({ fiscalYear: 2026, idempotencyKey: 'k3' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(body).toMatchObject({ fiscalYear: 2026 });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/periods/mutations.test.tsx` (FAIL: cannot resolve `./mutations`).

- [ ] **Step 3: Write the implementation** — `src/features/periods/mutations.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
import { queryKeys } from '@/lib/query/keys';

type YearArgs = { fiscalYear: number; idempotencyKey: string };

export function useGeneratePeriods() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, YearArgs>({
    mutationFn: ({ fiscalYear, idempotencyKey }) =>
      apiFetch('/ledger/periods/generate', { method: 'POST', body: { fiscalYear }, idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.periods.all }),
  });
}

export function useClosePeriod() {
  return useDocumentAction({ key: 'periods', basePath: '/ledger/periods', action: 'close' });
}

export function useReopenPeriod() {
  return useDocumentAction({ key: 'periods', basePath: '/ledger/periods', action: 'reopen' });
}

export function useRunYearEnd() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, YearArgs>({
    mutationFn: ({ fiscalYear, idempotencyKey }) =>
      apiFetch('/close/year-end', { method: 'POST', body: { fiscalYear }, idempotencyKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.yearEnd.all });
      qc.invalidateQueries({ queryKey: queryKeys.periods.all });
    },
  });
}

export function useReopenYear() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, YearArgs>({
    mutationFn: ({ fiscalYear, idempotencyKey }) =>
      apiFetch(`/close/year-end/${fiscalYear}/reopen`, { method: 'POST', idempotencyKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.yearEnd.all });
      qc.invalidateQueries({ queryKey: queryKeys.periods.all });
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/periods/mutations.test.tsx` (PASS, 3 tests).

- [ ] **Step 5: Commit**
```bash
git add src/features/periods/mutations.ts src/features/periods/mutations.test.tsx
git commit -m "feat(periods): mutation hooks (generate/close/reopen/run-year/reopen-year)"
```

---

### Task 6: `PeriodsPage`

**Files:** Create `src/features/periods/PeriodsPage.tsx`; Test `src/features/periods/PeriodsPage.test.tsx`

- [ ] **Step 1: Write the failing test** — `src/features/periods/PeriodsPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API, periodFixtures } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { PeriodsPage } from './PeriodsPage';

afterEach(() => useSession.getState().clear());

function renderPage(role: 'ADMIN' | 'APPROVER' | 'VIEWER' = 'ADMIN') {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}><PeriodsPage /></QueryClientProvider>);
}

const thisYear = new Date().getFullYear();

it('renders the periods with month labels + status; the stepper changes the fiscal year', async () => {
  let seenFy: string | null = null;
  server.use(http.get(`${API}/ledger/periods`, ({ request }) => {
    seenFy = new URL(request.url).searchParams.get('fiscalYear');
    return HttpResponse.json(periodFixtures(Number(seenFy)));
  }));
  renderPage();
  expect(await screen.findByText('Januari')).toBeInTheDocument();
  expect(screen.getAllByText('Terbuka').length).toBeGreaterThan(0);
  await waitFor(() => expect(seenFy).toBe(String(thisYear)));
  await userEvent.setup().click(screen.getByRole('button', { name: 'Tahun sebelumnya' }));
  await waitFor(() => expect(seenFy).toBe(String(thisYear - 1)));
});

it('ADMIN closes an open period (confirm → POST close)', async () => {
  let closedId: string | null = null;
  server.use(
    http.get(`${API}/ledger/periods`, () => HttpResponse.json(periodFixtures(2026))),
    http.post(`${API}/ledger/periods/:id/close`, ({ params }) => { closedId = String(params.id); return HttpResponse.json({ id: params.id, status: 'CLOSED' }); }),
  );
  renderPage();
  await screen.findByText('Januari');
  const user = userEvent.setup();
  await user.click(screen.getAllByRole('button', { name: 'Tutup' })[0]);
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Tutup' }));
  await waitFor(() => expect(closedId).toBe('period-2026-1'));
});

it('year-end panel: not closed shows the run action; ADMIN runs it', async () => {
  let ranFor: unknown = null;
  server.use(
    http.get(`${API}/ledger/periods`, () => HttpResponse.json(periodFixtures(2026))),
    http.get(`${API}/close/year-end/:fy`, () => HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 })),
    http.post(`${API}/close/year-end`, async ({ request }) => { ranFor = await request.json(); return HttpResponse.json({ status: 'CLOSED' }); }),
  );
  renderPage();
  expect(await screen.findByText('Belum ditutup')).toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Tutup Buku Akhir Tahun' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Tutup Buku Akhir Tahun' }));
  await waitFor(() => expect(ranFor).toMatchObject({ fiscalYear: thisYear }));
});

it('VIEWER sees no action buttons', async () => {
  server.use(http.get(`${API}/ledger/periods`, () => HttpResponse.json(periodFixtures(2026))));
  renderPage('VIEWER');
  await screen.findByText('Januari');
  expect(screen.queryByRole('button', { name: 'Tutup' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Tutup Buku Akhir Tahun' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/periods/PeriodsPage.test.tsx` (FAIL: cannot resolve `./PeriodsPage`).

- [ ] **Step 3: Write the implementation** — `src/features/periods/PeriodsPage.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { RoleGate } from '@/components/common/RoleGate';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { usePeriods, useYearEndStatus } from './usePeriods';
import { useGeneratePeriods, useClosePeriod, useReopenPeriod, useRunYearEnd, useReopenYear } from './mutations';
import { isPeriodClosed, isYearClosed, monthLabel, type Period } from './schema';

type Pending =
  | { kind: 'close' | 'reopen'; period: Period }
  | { kind: 'generate' | 'runYearEnd' | 'reopenYear' }
  | null;

export function PeriodsPage() {
  const t = useT();
  const [fiscalYear, setFiscalYear] = useState(() => new Date().getFullYear());
  const [pending, setPending] = useState<Pending>(null);
  const periods = usePeriods(fiscalYear);
  const yearEnd = useYearEndStatus(fiscalYear);

  const generate = useGeneratePeriods();
  const close = useClosePeriod();
  const reopen = useReopenPeriod();
  const runYearEnd = useRunYearEnd();
  const reopenYear = useReopenYear();

  const rows = periods.data ?? [];
  const anyOpen = rows.some((p) => !isPeriodClosed(p));
  const closed = isYearClosed(yearEnd.data);
  const isMutating =
    close.isPending || reopen.isPending || generate.isPending || runYearEnd.isPending || reopenYear.isPending;

  const dialogs = {
    close: { title: t.periods.close, description: t.periods.confirmClose, confirmLabel: t.periods.close, destructive: true },
    reopen: { title: t.periods.reopen, description: t.periods.confirmReopen, confirmLabel: t.periods.reopen, destructive: false },
    generate: { title: t.periods.generate, description: t.periods.confirmGenerate, confirmLabel: t.periods.generate, destructive: false },
    runYearEnd: { title: t.periods.runYearEnd, description: t.periods.confirmYearEnd, confirmLabel: t.periods.runYearEnd, destructive: true },
    reopenYear: { title: t.periods.reopenYear, description: t.periods.confirmReopenYear, confirmLabel: t.periods.reopenYear, destructive: false },
  } as const;
  const dialog = pending ? dialogs[pending.kind] : null;

  function confirmRun() {
    if (!pending) return;
    const idempotencyKey = crypto.randomUUID();
    const done = { onSettled: () => setPending(null) };
    if (pending.kind === 'close') close.mutate({ id: pending.period.id, idempotencyKey }, done);
    else if (pending.kind === 'reopen') reopen.mutate({ id: pending.period.id, idempotencyKey }, done);
    else if (pending.kind === 'generate') generate.mutate({ fiscalYear, idempotencyKey }, done);
    else if (pending.kind === 'runYearEnd') runYearEnd.mutate({ fiscalYear, idempotencyKey }, done);
    else reopenYear.mutate({ fiscalYear, idempotencyKey }, done);
  }

  return (
    <div>
      <PageHeader title={t.periods.title} />

      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium">{t.periods.fiscalYear}</span>
        <Button variant="outline" size="icon" aria-label={t.periods.prevYear} onClick={() => setFiscalYear((y) => y - 1)}>−</Button>
        <span className="w-16 text-center tabular-nums">{fiscalYear}</span>
        <Button variant="outline" size="icon" aria-label={t.periods.nextYear} onClick={() => setFiscalYear((y) => y + 1)}>+</Button>
      </div>

      {periods.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : periods.isError ? (
        <ErrorState error={periods.error} />
      ) : rows.length === 0 ? (
        <div className="space-y-3 rounded-lg border p-6 text-center">
          <p className="text-sm text-muted-foreground">{t.periods.noPeriods}</p>
          <RoleGate allow={['APPROVER', 'ADMIN']}>
            <Button onClick={() => setPending({ kind: 'generate' })}>{t.periods.generate}</Button>
          </RoleGate>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.periods.bulan}</TableHead>
                <TableHead>{t.periods.status}</TableHead>
                <TableHead className="text-right">{t.periods.aksi}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const c = isPeriodClosed(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{monthLabel(p)}</TableCell>
                    <TableCell><Badge variant={c ? 'destructive' : 'default'}>{c ? t.periods.closed : t.periods.open}</Badge></TableCell>
                    <TableCell className="text-right">
                      {c ? (
                        <RoleGate allow={['ADMIN']}>
                          <Button variant="outline" size="sm" onClick={() => setPending({ kind: 'reopen', period: p })}>{t.periods.reopen}</Button>
                        </RoleGate>
                      ) : (
                        <RoleGate allow={['APPROVER', 'ADMIN']}>
                          <Button variant="outline" size="sm" onClick={() => setPending({ kind: 'close', period: p })}>{t.periods.close}</Button>
                        </RoleGate>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-6 space-y-2 rounded-lg border p-4">
        <h2 className="font-semibold">{t.periods.yearEndStatus}</h2>
        {yearEnd.isLoading ? (
          <Skeleton className="h-6 w-40" />
        ) : (
          <p className="text-sm text-muted-foreground">
            {closed
              ? `${t.periods.closedOn} ${yearEnd.data?.closedAt ? formatDateID(yearEnd.data.closedAt.slice(0, 10)) : ''}`
              : t.periods.notClosed}
          </p>
        )}
        {!closed && anyOpen ? <p className="text-xs text-muted-foreground">{t.periods.closeAllFirst}</p> : null}
        <RoleGate allow={['ADMIN']}>
          {closed ? (
            <Button variant="outline" onClick={() => setPending({ kind: 'reopenYear' })}>{t.periods.reopenYear}</Button>
          ) : (
            <Button onClick={() => setPending({ kind: 'runYearEnd' })}>{t.periods.runYearEnd}</Button>
          )}
        </RoleGate>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title={dialog?.title ?? ''}
        description={dialog?.description}
        confirmLabel={dialog?.confirmLabel ?? ''}
        destructive={dialog?.destructive}
        pending={isMutating}
        onConfirm={confirmRun}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/periods/PeriodsPage.test.tsx` (PASS, 4 tests).

- [ ] **Step 5: Commit**
```bash
git add src/features/periods/PeriodsPage.tsx src/features/periods/PeriodsPage.test.tsx
git commit -m "feat(periods): Tutup Buku page (periods table + year-end panel)"
```

---

### Task 7: Route + nav + verification

**Files:** Create `src/app/routes/_app/periods.tsx`; Modify `src/components/common/AppShell.tsx`

- [ ] **Step 1: Create the route** — `src/app/routes/_app/periods.tsx` (match an existing `_app` leaf route, e.g. `reports.balance-sheet.tsx`):

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PeriodsPage } from '@/features/periods/PeriodsPage';

export const Route = createFileRoute('/_app/periods')({
  component: PeriodsPage,
});
```

- [ ] **Step 2: Add the nav entry** in `src/components/common/AppShell.tsx` — add `CalendarCheck` to the `lucide-react` import, and add to the `nav` array after the Reports entry:

```tsx
    { to: '/periods', label: t.nav.periods, icon: CalendarCheck },
```

- [ ] **Step 3: Regenerate the route tree** — start `pnpm dev` in the background; poll `grep -q "'/periods'" src/routeTree.gen.ts && echo REGENERATED` (or `grep -q "periods" src/routeTree.gen.ts`); then stop the dev server. Verify: `grep -c "periods" src/routeTree.gen.ts` prints ≥ 1.

- [ ] **Step 4: Full verification**
  - `pnpm test --run` — expect all green (~208: 195 prior + 13 new = schema 3, data hooks 3, mutations 3, PeriodsPage 4).
  - `pnpm lint` — 0 errors (pre-existing react-compiler/react-hook-form warnings acceptable).
  - `pnpm build` — success (`tsc -b && vite build`; tsc now accepts the typed `/periods` route + nav `Link`).

If `pnpm build` fails at `tsc` over an unknown `/periods` route, the tree wasn't regenerated — repeat Step 3 and rebuild.

- [ ] **Step 5: Dev smoke (also the shape-reconciliation check)** — `pnpm dev`, log in (creds in `.env`), open `/periods`: confirm the periods table loads from the live API (this verifies the inferred Period shape — if the table is empty or mislabeled, the real `status`/`month` fields differ; adjust `schema.ts`/`isPeriodClosed`/`monthLabel` and re-run tests). As an ADMIN, try closing a period and confirm the year-end panel reflects `/close/year-end/:fy`. Stop the server.

- [ ] **Step 6: Commit**
```bash
git add src/app/routes/_app/periods.tsx src/components/common/AppShell.tsx src/routeTree.gen.ts
git commit -m "feat(periods): /periods route + Tutup Buku nav entry"
```

---

## Done Criteria

- A "Tutup Buku" nav entry → `/periods`: a fiscal-year stepper, a monthly periods table (Bulan · Status badge · gated close/reopen), an empty-state Generate button, and a year-end-close panel (status + gated run/reopen), all confirmed via `ConfirmDialog`.
- Role gating: close/generate need APPROVER/ADMIN; reopen period + run/reopen year need ADMIN; a VIEWER sees the data but no action buttons.
- The year-end status query treats 404 as "Belum ditutup"; `409 CLOSED_*`/403 surface via `toastApiError`.
- All tests pass (~208); lint clean; build green. The live Period shape is confirmed in the dev smoke (schema adjusted if it drifted from the inferred shape).

## Out of Scope (YAGNI)

Editing period dates, non-calendar fiscal years, a bulk close-all, a closing-entry preview (view it in the journals register), prior-year comparison, and the company-settings SoD toggle (its own later slice).

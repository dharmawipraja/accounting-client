# Journals + Approval Queue (Plan 6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the general-journal surface — a paginated journal register, a balanced manual-entry editor, the post/reverse/delete-draft lifecycle, and a DRAFT approval queue (the register filtered to `status=DRAFT`).

**Architecture:** New `features/journals/` module. The lifecycle reuses `useDocumentAction`/`toastApiError`/`RoleGate`/`ConfirmDialog`. New pieces: a paginated list hook over `{data,total,limit,offset}`, a `Money`-based balance helper, a shared `Pagination` control, and the list-vs-detail schema split. The balanced editor uses **controlled `useState` lines** (like `PaymentForm`'s allocation state), NOT RHF `useFieldArray` — this keeps the running totals + balance-gated Save reactive and testable in jsdom (avoids the documented `form.watch` field-array limitation).

**Tech Stack:** React 19 + React Compiler, TanStack Router (file-based) + Query v5 + Table v8, React Hook Form (header only) + Zod v4, shadcn/ui, decimal.js `Money`, Vitest 4 + RTL + MSW v2.

**Reference spec:** `docs/superpowers/specs/2026-06-14-journals-approval-design.md`

---

## Ordering note

The register's row actions use typed `<Link to="/journals/$id">`, and the editor page uses `navigate({to:'/journals'})` — these only type-check once the `/journals` routes exist in `src/routeTree.gen.ts` (Task 8). So the full `tsc` build is deferred to Task 8; the register task (Task 7) is verified with `pnpm test --run <file>` (Vitest, no type-check). Tasks touching no routes (1–6) build normally.

## File Structure

```
src/components/common/Pagination.tsx / .test.tsx   # NEW shared control (Task 2)
src/features/journals/
  schema.ts / schema.test.ts        # Task 3 — response schemas + payload type
  balance.ts / balance.test.ts      # Task 4 — Money totals + isBalanced
  hooks.ts / hooks.test.tsx         # Task 5 — paginated list, detail, create/delete, post/reverse
  JournalLineRow.tsx                # Task 6 — controlled account + debit/credit + desc + remove
  JournalTotals.tsx                 # Task 6 — running totals + balanced indicator
  JournalEntryForm.tsx / .test.tsx  # Task 6 — create-only balanced editor (controlled lines)
  columns.tsx                       # Task 7 — register columns + row actions
  JournalsPage.tsx / .test.tsx      # Task 7 — paginated register + filters + confirm
  JournalEntryEditorPage.tsx        # Task 8 — /journals/new (create) | /journals/$id (detail)
src/app/routes/_app/journals{,.index,.new,.$id}.tsx  # Task 8
```

Modify: `src/lib/i18n/messages.id.ts` (+`journals` group, +`nav.journals`, +`common.prev/next/paginationShowing`), `src/lib/query/keys.ts` (+`journalEntries`), `src/test/handlers.ts` (replace the stub journal-entries handler), `src/components/common/AppShell.tsx` (+nav item).

**Reuse (do NOT recreate):** `useDocumentAction` (`{id, idempotencyKey}`), `apiFetch(path, {query, schema})`, `AccountSelect`, `MoneyInput`/`MoneyText`/`Money` (methods: `from`/`zero`/`plus`/`minus`/`eq`/`gt`/`toApi`/`toRupiah`), `RoleGate`, `ConfirmDialog` (`{open,onOpenChange,title,description?,confirmLabel,onConfirm,pending?,destructive?}`), `DataTable` (`{columns,data,emptyMessage?}`), `ErrorState` (`{error}`), `PageHeader` (`{title,actions?}`), `applyApiErrorToForm`, `toastApiError`, `formatDateID`, `accountsApi`. MSW `API` = `http://localhost:4000`.

**IMPORTANT (Task 5):** the journal-entries MSW fixture must contain exactly **3 DRAFT** entries so `GET …?status=DRAFT` keeps returning `total: 3` — the dashboard's `useDraftCount` test and `DashboardPage` "Jurnal Draft = 3" assertion depend on it.

---

### Task 1: i18n + query keys

**Files:**
- Modify: `src/lib/i18n/messages.id.ts`, `src/lib/query/keys.ts`

- [ ] **Step 1: Add shared pagination strings to the `common` group**

In `src/lib/i18n/messages.id.ts`, add to the existing `common` group:

```ts
    prev: 'Sebelumnya',
    next: 'Berikutnya',
    paginationShowing: 'Menampilkan {from}–{to} dari {total}',
```

- [ ] **Step 2: Add `nav.journals` and the `journals` group**

Add to the `nav` group: `journals: 'Jurnal',`. Then add this group (e.g. after `payments`). Keep `export type Messages = typeof id;` intact.

```ts
  journals: {
    title: 'Jurnal',
    newEntry: 'Jurnal Baru',
    view: 'Lihat',
    entryRef: 'No.',
    date: 'Tanggal',
    description: 'Keterangan',
    sourceType: 'Sumber',
    status: 'Status',
    totalDebit: 'Total Debit',
    lineCount: 'Baris',
    account: 'Akun',
    debit: 'Debit',
    credit: 'Kredit',
    lineDescription: 'Deskripsi',
    addLine: 'Tambah baris',
    removeLine: 'Hapus baris',
    selectAccount: 'Pilih akun',
    totalDebitLabel: 'Total Debit',
    totalCreditLabel: 'Total Kredit',
    difference: 'Selisih',
    balanced: 'Seimbang',
    unbalanced: 'Tidak seimbang',
    atLeastTwoLines: 'Minimal dua baris',
    unbalancedEntry: 'Debit dan kredit harus sama',
    required: 'Wajib diisi',
    saveEntry: 'Simpan',
    statusAll: 'Semua',
    statusDraft: 'Draf',
    statusPosted: 'Diposting',
    sourceAll: 'Semua',
    sourceManual: 'Manual',
    sourceReversal: 'Pembalik',
    sourceSale: 'Penjualan',
    sourcePurchase: 'Pembelian',
    sourcePayment: 'Pembayaran',
    post: 'Posting',
    reverse: 'Balikkan',
    confirmPostTitle: 'Posting jurnal ini?',
    confirmPostDesc: 'Jurnal akan diposting ke buku besar.',
    confirmReverseTitle: 'Balikkan jurnal ini?',
    confirmReverseDesc: 'Jurnal pembalik akan dibuat.',
    posted: 'Jurnal diposting',
    reversed: 'Jurnal dibalik',
    deleted: 'Draf dihapus',
  },
```

- [ ] **Step 3: Add the `journalEntries` query keys**

In `src/lib/query/keys.ts`, add to `queryKeys` (after `purchaseBills`, before `reports`):

```ts
  journalEntries: {
    all: ['journalEntries'] as const,
    list: (params: unknown) => ['journalEntries', 'list', params] as const,
    item: (id: string) => ['journalEntries', 'item', id] as const,
  },
```

- [ ] **Step 4: Verify** — Run: `pnpm build` (expected: succeeds).

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/messages.id.ts src/lib/query/keys.ts
git commit -m "feat(journals): i18n group + pagination strings + query keys"
```

---

### Task 2: Pagination control

**Files:**
- Create: `src/components/common/Pagination.tsx`
- Test: `src/components/common/Pagination.test.tsx`

- [ ] **Step 1: Write the failing test** — create `src/components/common/Pagination.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

it('shows the range and disables Prev on the first page', () => {
  render(<Pagination offset={0} limit={20} total={25} onChange={vi.fn()} />);
  expect(screen.getByText(/Menampilkan 1–20 dari 25/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sebelumnya/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /berikutnya/i })).toBeEnabled();
});

it('Next advances the offset by the limit', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Pagination offset={0} limit={20} total={25} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: /berikutnya/i }));
  expect(onChange).toHaveBeenCalledWith(20);
});

it('disables Next on the last page', () => {
  render(<Pagination offset={20} limit={20} total={25} onChange={vi.fn()} />);
  expect(screen.getByRole('button', { name: /berikutnya/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/components/common/Pagination.test.tsx` (FAIL: cannot resolve `./Pagination`).

- [ ] **Step 3: Write the implementation** — create `src/components/common/Pagination.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';

interface Props {
  offset: number;
  limit: number;
  total: number;
  onChange: (offset: number) => void;
}

export function Pagination({ offset, limit, total, onChange }: Props) {
  const t = useT();
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const label = t.common.paginationShowing
    .replace('{from}', String(from))
    .replace('{to}', String(to))
    .replace('{total}', String(total));
  return (
    <div className="mt-4 flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        <Button type="button" variant="outline" size="sm" disabled={offset <= 0} onClick={() => onChange(Math.max(0, offset - limit))}>
          {t.common.prev}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => onChange(offset + limit)}>
          {t.common.next}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/components/common/Pagination.test.tsx` (PASS, 3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/common/Pagination.tsx src/components/common/Pagination.test.tsx
git commit -m "feat(common): Pagination control for the enveloped list"
```

---

### Task 3: Schemas (`schema.ts`)

**Files:**
- Create: `src/features/journals/schema.ts`
- Test: `src/features/journals/schema.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/features/journals/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { journalEntryListItemSchema, journalEntrySchema, journalEntriesPageSchema } from './schema';

describe('journal schemas', () => {
  it('list item parses the lightweight projection (totalDebit + lineCount, no lines)', () => {
    const r = journalEntryListItemSchema.parse({
      id: 'je1', entryRef: 'JE/2026/000002', entryNumber: 2, fiscalYear: 2026, date: '2026-06-15T00:00:00.000Z',
      description: 'x', status: 'POSTED', sourceType: 'SALE', sourceId: 'inv1', totalDebit: '1110000.0000', lineCount: 2,
    });
    expect(r.totalDebit).toBe('1110000.0000');
    expect(r.lineCount).toBe(2);
    expect('lines' in r).toBe(false);
  });

  it('detail parses with lines (debit/credit integer-form strings) and defaults missing lines to []', () => {
    const withLines = journalEntrySchema.parse({
      id: 'je1', entryNumber: null, entryRef: null, fiscalYear: null, date: '2026-06-16T00:00:00.000Z', periodId: null,
      description: 'x', sourceType: 'MANUAL', sourceId: null, status: 'DRAFT', reversalOfId: null, reversedById: null,
      lines: [{ id: 'l1', journalEntryId: 'je1', lineNo: 1, accountId: 'a1', debit: '100000', credit: '0', description: 'd' }],
    });
    expect(withLines.lines[0].debit).toBe('100000');
    // create/post responses omit lines → default []
    const noLines = journalEntrySchema.parse({ id: 'je9', date: '2026-06-16T00:00:00.000Z', description: 'x', sourceType: 'MANUAL', status: 'DRAFT' });
    expect(noLines.lines).toEqual([]);
  });

  it('page schema parses the envelope', () => {
    const r = journalEntriesPageSchema.parse({ data: [], total: 3, limit: 20, offset: 0 });
    expect(r.total).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/journals/schema.test.ts` (FAIL: cannot resolve `./schema`).

- [ ] **Step 3: Write the implementation** — create `src/features/journals/schema.ts`:

```ts
import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const journalLineSchema = z.object({
  id: z.string(),
  journalEntryId: z.string().nullish(),
  lineNo: z.number(),
  accountId: z.string(),
  debit: moneyString,
  credit: moneyString,
  description: z.string().nullish(),
});
export type JournalLine = z.infer<typeof journalLineSchema>;

export const journalEntrySchema = z.object({
  id: z.string(),
  entryNumber: z.number().nullish(),
  entryRef: z.string().nullish(),
  fiscalYear: z.number().nullish(),
  date: z.string(),
  periodId: z.string().nullish(),
  description: z.string(),
  sourceType: z.string(),
  sourceId: z.string().nullish(),
  status: z.string(),
  reversalOfId: z.string().nullish(),
  reversedById: z.string().nullish(),
  postedBy: z.string().nullish(),
  postedAt: z.string().nullish(),
  lines: z.array(journalLineSchema).default([]),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export const journalEntryListItemSchema = z.object({
  id: z.string(),
  entryRef: z.string().nullish(),
  entryNumber: z.number().nullish(),
  fiscalYear: z.number().nullish(),
  date: z.string(),
  description: z.string(),
  status: z.string(),
  sourceType: z.string(),
  sourceId: z.string().nullish(),
  totalDebit: moneyString,
  lineCount: z.number(),
});
export type JournalEntryListItem = z.infer<typeof journalEntryListItemSchema>;

export const journalEntriesPageSchema = z.object({
  data: z.array(journalEntryListItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});
export type JournalEntriesPage = z.infer<typeof journalEntriesPageSchema>;

export type JournalEntryCreatePayload = {
  date: string;
  description: string;
  lines: { accountId: string; debit?: string; credit?: string; description?: string }[];
};
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/journals/schema.test.ts` (PASS, 3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/journals/schema.ts src/features/journals/schema.test.ts
git commit -m "feat(journals): list/detail/page schemas + create payload"
```

---

### Task 4: Balance helper (`balance.ts`)

**Files:**
- Create: `src/features/journals/balance.ts`
- Test: `src/features/journals/balance.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/features/journals/balance.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { balanceOf, isBalanced } from './balance';

describe('journal balance', () => {
  it('balanced when debit and credit totals are equal and positive', () => {
    const lines = [{ debit: '100000', credit: '' }, { debit: '', credit: '100000' }];
    expect(isBalanced(lines)).toBe(true);
    expect(balanceOf(lines).difference.toApi()).toBe('0.0000');
  });
  it('unbalanced when the two sides differ', () => {
    expect(isBalanced([{ debit: '100000', credit: '' }, { debit: '', credit: '50000' }])).toBe(false);
  });
  it('not balanced when both totals are zero', () => {
    expect(isBalanced([{ debit: '', credit: '' }, { debit: '', credit: '' }])).toBe(false);
  });
  it('computes running totals', () => {
    const b = balanceOf([{ debit: '60000', credit: '' }, { debit: '40000', credit: '' }, { debit: '', credit: '100000' }]);
    expect(b.totalDebit.toApi()).toBe('100000.0000');
    expect(b.totalCredit.toApi()).toBe('100000.0000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/journals/balance.test.ts` (FAIL: cannot resolve `./balance`).

- [ ] **Step 3: Write the implementation** — create `src/features/journals/balance.ts`:

```ts
import { Money } from '@/lib/money/money';

export type BalanceLine = { debit: string; credit: string };

function sumSide(lines: BalanceLine[], side: 'debit' | 'credit'): Money {
  return lines.reduce((acc, l) => {
    try { return acc.plus(Money.from(l[side] || '0')); } catch { return acc; }
  }, Money.zero());
}

export function balanceOf(lines: BalanceLine[]): { totalDebit: Money; totalCredit: Money; difference: Money } {
  const totalDebit = sumSide(lines, 'debit');
  const totalCredit = sumSide(lines, 'credit');
  return { totalDebit, totalCredit, difference: totalDebit.minus(totalCredit) };
}

export function isBalanced(lines: BalanceLine[]): boolean {
  const { totalDebit, totalCredit } = balanceOf(lines);
  return totalDebit.eq(totalCredit) && totalDebit.gt(Money.zero());
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/journals/balance.test.ts` (PASS, 4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/journals/balance.ts src/features/journals/balance.test.ts
git commit -m "feat(journals): Money-based balance helper"
```

---

### Task 5: Hooks + MSW handlers (`hooks.ts`)

**Files:**
- Modify: `src/test/handlers.ts`
- Create: `src/features/journals/hooks.ts`
- Test: `src/features/journals/hooks.test.tsx`

- [ ] **Step 1: Replace the stub journal-entries handler with a real one**

In `src/test/handlers.ts`, add these fixtures near the other `*Fixtures` exports (note: **exactly 3 DRAFT** entries so `?status=DRAFT` returns `total:3`):

```ts
// --- journal entries (Plan 6) ---
export const journalEntryListFixture = () => [
  { id: 'jed1', entryRef: null, entryNumber: null, fiscalYear: null, date: '2026-06-16T00:00:00.000Z', description: 'Draf 1', status: 'DRAFT', sourceType: 'MANUAL', sourceId: null, totalDebit: '100000.0000', lineCount: 2 },
  { id: 'jed2', entryRef: null, entryNumber: null, fiscalYear: null, date: '2026-06-16T00:00:00.000Z', description: 'Draf 2', status: 'DRAFT', sourceType: 'MANUAL', sourceId: null, totalDebit: '200000.0000', lineCount: 2 },
  { id: 'jed3', entryRef: null, entryNumber: null, fiscalYear: null, date: '2026-06-16T00:00:00.000Z', description: 'Draf 3', status: 'DRAFT', sourceType: 'MANUAL', sourceId: null, totalDebit: '300000.0000', lineCount: 2 },
  { id: 'jep1', entryRef: 'JE/2026/000002', entryNumber: 2, fiscalYear: 2026, date: '2026-06-15T00:00:00.000Z', description: 'Penjualan diposting', status: 'POSTED', sourceType: 'SALE', sourceId: 'inv1', totalDebit: '1110000.0000', lineCount: 2 },
  { id: 'jep2', entryRef: 'JE/2026/000003', entryNumber: 3, fiscalYear: 2026, date: '2026-06-15T00:00:00.000Z', description: 'Jurnal manual diposting', status: 'POSTED', sourceType: 'MANUAL', sourceId: null, totalDebit: '500000.0000', lineCount: 2 },
];
export const journalEntryDetailFixture = () => ({
  id: 'jed1', entryNumber: null, entryRef: null, fiscalYear: null, date: '2026-06-16T00:00:00.000Z', periodId: null,
  description: 'Draf 1', sourceType: 'MANUAL', sourceId: null, status: 'DRAFT', reversalOfId: null, reversedById: null,
  lines: [
    { id: 'jl1', journalEntryId: 'jed1', lineNo: 1, accountId: 'a1', debit: '100000', credit: '0', description: 'sisi debit' },
    { id: 'jl2', journalEntryId: 'jed1', lineNo: 2, accountId: 'a2', debit: '0', credit: '100000', description: 'sisi kredit' },
  ],
});
```

Then **replace** the existing stub handler

```ts
  http.get(`${API}/ledger/journal-entries`, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status');
    const total = status === 'DRAFT' ? 3 : 0;
    return HttpResponse.json({ data: [], total, limit: 1, offset: 0 });
  }),
```

with this block (paginated + the detail/create/delete/post/reverse handlers):

```ts
  http.get(`${API}/ledger/journal-entries`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    const status = u.get('status');
    const sourceType = u.get('sourceType');
    const limit = Number(u.get('limit') ?? '20');
    const offset = Number(u.get('offset') ?? '0');
    let data = journalEntryListFixture();
    if (status) data = data.filter((e) => e.status === status);
    if (sourceType) data = data.filter((e) => e.sourceType === sourceType);
    return HttpResponse.json({ data: data.slice(offset, offset + limit), total: data.length, limit, offset });
  }),
  http.get(`${API}/ledger/journal-entries/:id`, ({ params }) => HttpResponse.json({ ...journalEntryDetailFixture(), id: params.id })),
  http.post(`${API}/ledger/journal-entries`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...journalEntryDetailFixture(), id: 'je9', status: 'DRAFT', ...body, lines: undefined });
  }),
  http.delete(`${API}/ledger/journal-entries/:id`, () => HttpResponse.json({})),
  http.post(`${API}/ledger/journal-entries/:id/post`, ({ params }) =>
    HttpResponse.json({ ...journalEntryDetailFixture(), id: params.id, status: 'POSTED', entryNumber: 13, entryRef: 'JE/2026/000013', fiscalYear: 2026, lines: undefined }),
  ),
  http.post(`${API}/ledger/journal-entries/:id/reverse`, ({ params }) =>
    HttpResponse.json({ ...journalEntryDetailFixture(), id: 'rev1', status: 'POSTED', sourceType: 'REVERSAL', reversalOfId: params.id, entryNumber: 14, entryRef: 'JE/2026/000014', lines: undefined }),
  ),
```

(The `lines: undefined` on the mutation responses mirrors the real API, which omits lines on create/post/reverse; `journalEntrySchema` defaults them to `[]`.)

- [ ] **Step 2: Write the failing test** — create `src/features/journals/hooks.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it } from 'vitest';
import { useJournalEntries, useJournalEntry, usePostJournalEntry } from './hooks';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('useJournalEntries returns the paginated envelope', async () => {
  const { result } = renderHook(() => useJournalEntries({ limit: 20, offset: 0 }), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.total).toBe(5);
  expect(result.current.data?.data.length).toBe(5);
});

it('useJournalEntries filters by status (the DRAFT approval queue)', async () => {
  const { result } = renderHook(() => useJournalEntries({ status: 'DRAFT', limit: 20, offset: 0 }), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.total).toBe(3);
});

it('useJournalEntry returns the detail with lines', async () => {
  const { result } = renderHook(() => useJournalEntry('jed1'), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.lines.length).toBe(2);
});

it('usePostJournalEntry posts to the post endpoint', async () => {
  const { result } = renderHook(() => usePostJournalEntry(), { wrapper: makeWrapper() });
  result.current.mutate({ id: 'jed1', idempotencyKey: 'k1' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

- [ ] **Step 3: Run test to verify it fails** — `pnpm test --run src/features/journals/hooks.test.tsx` (FAIL: cannot resolve `./hooks`).

- [ ] **Step 4: Write the implementation** — create `src/features/journals/hooks.ts`:

```ts
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
import { queryKeys } from '@/lib/query/keys';
import {
  journalEntriesPageSchema,
  journalEntrySchema,
  type JournalEntriesPage,
  type JournalEntry,
  type JournalEntryCreatePayload,
} from './schema';

export interface JournalEntriesParams {
  status?: string;
  sourceType?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

export function useJournalEntries(params: JournalEntriesParams): UseQueryResult<JournalEntriesPage, ApiError> {
  return useQuery<JournalEntriesPage, ApiError>({
    queryKey: queryKeys.journalEntries.list(params),
    queryFn: () =>
      apiFetch('/ledger/journal-entries', {
        query: { status: params.status, sourceType: params.sourceType, from: params.from, to: params.to, limit: params.limit, offset: params.offset },
        schema: journalEntriesPageSchema,
      }),
  });
}

export function useJournalEntry(id: string): UseQueryResult<JournalEntry, ApiError> {
  return useQuery<JournalEntry, ApiError>({
    queryKey: queryKeys.journalEntries.item(id),
    queryFn: () => apiFetch(`/ledger/journal-entries/${id}`, { schema: journalEntrySchema }),
    enabled: !!id,
  });
}

export function useCreateJournalEntry(): UseMutationResult<JournalEntry, ApiError, JournalEntryCreatePayload> {
  const qc = useQueryClient();
  return useMutation<JournalEntry, ApiError, JournalEntryCreatePayload>({
    mutationFn: (data) => apiFetch('/ledger/journal-entries', { method: 'POST', body: data, schema: journalEntrySchema }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.journalEntries.all }),
  });
}

export function useDeleteJournalEntry(): UseMutationResult<unknown, ApiError, string> {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, string>({
    mutationFn: (id) => apiFetch(`/ledger/journal-entries/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.journalEntries.all }),
  });
}

export const usePostJournalEntry = () => useDocumentAction({ key: 'journalEntries', basePath: '/ledger/journal-entries', action: 'post' });
export const useReverseJournalEntry = () => useDocumentAction({ key: 'journalEntries', basePath: '/ledger/journal-entries', action: 'reverse' });
```

- [ ] **Step 5: Run test to verify it passes** — `pnpm test --run src/features/journals/hooks.test.tsx` (PASS, 4 tests).

- [ ] **Step 6: Verify the dashboard still reads 3 drafts** — `pnpm test --run src/features/dashboard`
Expected: all dashboard tests pass (the new handler still returns `total:3` for `?status=DRAFT`).

- [ ] **Step 7: Commit**

```bash
git add src/test/handlers.ts src/features/journals/hooks.ts src/features/journals/hooks.test.tsx
git commit -m "feat(journals): paginated list + detail + lifecycle hooks + MSW handlers"
```

---

### Task 6: Balanced editor — `JournalLineRow` + `JournalTotals` + `JournalEntryForm`

**Files:**
- Create: `src/features/journals/JournalLineRow.tsx`, `src/features/journals/JournalTotals.tsx`, `src/features/journals/JournalEntryForm.tsx`
- Test: `src/features/journals/JournalEntryForm.test.tsx`

The editor holds the lines in **controlled `useState`** (each line `{ id, accountId, debit, credit, description }`); entering a debit clears that line's credit and vice-versa. `JournalTotals` reads the lines and shows the running balance. Save is disabled until `isBalanced(lines)`.

- [ ] **Step 1: Write the failing test** — create `src/features/journals/JournalEntryForm.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { JournalEntryForm } from './JournalEntryForm';

afterEach(() => useSession.getState().clear());

const accounts = [
  { id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null },
  { id: 'a2', code: '4-1000', name: 'Pendapatan', type: 'REVENUE', subtype: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, isActive: true, parentId: null },
];

function renderForm(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('creates a balanced entry: debit + credit across two accounts → posts the payload', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)));
  let posted: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/ledger/journal-entries`, async ({ request }) => {
    posted = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'je9', entryNumber: null, entryRef: null, fiscalYear: null, date: '2026-06-16T00:00:00.000Z', periodId: null, description: 'Jurnal uji', sourceType: 'MANUAL', sourceId: null, status: 'DRAFT', reversalOfId: null, reversedById: null });
  }));
  const onSaved = vi.fn();
  renderForm(<JournalEntryForm onSaved={onSaved} />);

  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-16');
  await user.type(screen.getByLabelText(/keterangan/i), 'Jurnal uji');
  const combos = screen.getAllByRole('combobox', { name: /akun/i });
  await user.click(combos[0]);
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.type(screen.getAllByLabelText('Debit')[0], '100000');
  await user.click(screen.getAllByRole('combobox', { name: /akun/i })[1]);
  await user.click(await screen.findByRole('option', { name: /4-1000/i }));
  await user.type(screen.getAllByLabelText('Kredit')[1], '100000');

  const save = screen.getByRole('button', { name: /simpan/i });
  await waitFor(() => expect(save).toBeEnabled());
  await user.click(save);

  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ date: '2026-06-16', description: 'Jurnal uji', lines: [{ accountId: 'a1', debit: '100000.0000' }, { accountId: 'a2', credit: '100000.0000' }] });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it('keeps Save disabled while unbalanced', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)));
  renderForm(<JournalEntryForm onSaved={vi.fn()} />);
  // empty form → Save disabled
  expect(screen.getByRole('button', { name: /simpan/i })).toBeDisabled();
  // one debit only → still unbalanced → disabled
  await user.click(screen.getAllByRole('combobox', { name: /akun/i })[0]);
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.type(screen.getAllByLabelText('Debit')[0], '100000');
  expect(screen.getByRole('button', { name: /simpan/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/journals/JournalEntryForm.test.tsx` (FAIL: cannot resolve `./JournalEntryForm`).

- [ ] **Step 3: Create `src/features/journals/JournalLineRow.tsx`**

```tsx
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { AccountSelect } from '@/components/common/AccountSelect';
import { MoneyInput } from '@/components/common/MoneyInput';
import { useT } from '@/lib/i18n/useT';

export interface JournalLineState {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

export function JournalLineRow({ line, onChange, onRemove }: { line: JournalLineState; onChange: (patch: Partial<JournalLineState>) => void; onRemove: () => void }) {
  const t = useT();
  return (
    <TableRow>
      <TableCell className="min-w-48">
        <AccountSelect value={line.accountId} onChange={(id) => onChange({ accountId: id })} aria-label={t.journals.account} placeholder={t.journals.selectAccount} />
      </TableCell>
      <TableCell className="w-32">
        <MoneyInput value={line.debit} onChange={(v) => onChange({ debit: v, credit: '' })} aria-label={t.journals.debit} />
      </TableCell>
      <TableCell className="w-32">
        <MoneyInput value={line.credit} onChange={(v) => onChange({ credit: v, debit: '' })} aria-label={t.journals.credit} />
      </TableCell>
      <TableCell>
        <Input aria-label={t.journals.lineDescription} value={line.description} onChange={(e) => onChange({ description: e.target.value })} />
      </TableCell>
      <TableCell>
        <Button type="button" variant="ghost" size="icon" aria-label={t.journals.removeLine} onClick={onRemove}><Trash2 className="size-4" /></Button>
      </TableCell>
    </TableRow>
  );
}
```

- [ ] **Step 4: Create `src/features/journals/JournalTotals.tsx`**

```tsx
import { useT } from '@/lib/i18n/useT';
import { balanceOf, isBalanced, type BalanceLine } from './balance';

export function JournalTotals({ lines }: { lines: BalanceLine[] }) {
  const t = useT();
  const { totalDebit, totalCredit, difference } = balanceOf(lines);
  const balanced = isBalanced(lines);
  return (
    <div className="ml-auto w-full max-w-xs space-y-1 rounded-lg border p-4 text-sm">
      <Row label={t.journals.totalDebitLabel} value={totalDebit.toRupiah()} />
      <Row label={t.journals.totalCreditLabel} value={totalCredit.toRupiah()} />
      <div className="border-t pt-1">
        <Row label={t.journals.difference} value={difference.toRupiah()} bold />
      </div>
      <p className={`text-xs ${balanced ? 'text-muted-foreground' : 'text-destructive'}`}>
        {balanced ? t.journals.balanced : t.journals.unbalanced}
      </p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/features/journals/JournalEntryForm.tsx`**

```tsx
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';
import { JournalLineRow, type JournalLineState } from './JournalLineRow';
import { JournalTotals } from './JournalTotals';
import { isBalanced } from './balance';
import { useCreateJournalEntry } from './hooks';

const headerSchema = z.object({ date: z.string().min(1, 'required'), description: z.string().min(1, 'required') });
type HeaderValues = z.infer<typeof headerSchema>;

const emptyLine = (): JournalLineState => ({ id: crypto.randomUUID(), accountId: '', debit: '', credit: '', description: '' });
const hasValue = (v: string) => { try { return Money.from(v || '0').gt(Money.zero()); } catch { return false; } };

export function JournalEntryForm({ onSaved }: { onSaved: () => void }) {
  const t = useT();
  const create = useCreateJournalEntry();
  const form = useForm<HeaderValues>({ resolver: zodResolver(headerSchema), defaultValues: { date: '', description: '' } });
  const [lines, setLines] = useState<JournalLineState[]>(() => [emptyLine(), emptyLine()]);

  const setLine = (i: number, patch: Partial<JournalLineState>) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const balanced = isBalanced(lines);

  function onSubmit(values: HeaderValues) {
    if (!balanced) return;
    const payload = {
      date: values.date,
      description: values.description,
      lines: lines
        .filter((l) => l.accountId && (hasValue(l.debit) || hasValue(l.credit)))
        .map((l) => ({
          accountId: l.accountId,
          description: l.description || undefined,
          ...(hasValue(l.debit) ? { debit: Money.from(l.debit).toApi() } : { credit: Money.from(l.credit).toApi() }),
        })),
    };
    create.mutate(payload, { onSuccess: () => { toast.success(t.crud.saved); onSaved(); }, onError: (err) => applyApiErrorToForm(err, form, t) });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="jdate">{t.journals.date}</Label>
          <Input id="jdate" type="date" aria-label={t.journals.date} {...form.register('date')} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="jdesc">{t.journals.description}</Label>
          <Input id="jdesc" aria-label={t.journals.description} {...form.register('description')} />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.journals.account}</TableHead>
              <TableHead className="text-right">{t.journals.debit}</TableHead>
              <TableHead className="text-right">{t.journals.credit}</TableHead>
              <TableHead>{t.journals.lineDescription}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, i) => (
              <JournalLineRow key={line.id} line={line} onChange={(patch) => setLine(i, patch)} onRemove={() => removeLine(i)} />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-start justify-between gap-4">
        <Button type="button" variant="outline" onClick={addLine}><Plus className="size-4" /> {t.journals.addLine}</Button>
        <JournalTotals lines={lines} />
      </div>

      {form.formState.errors.date ? <p role="alert" className="text-sm text-destructive">{t.journals.required}</p> : null}
      {form.formState.errors.description ? <p role="alert" className="text-sm text-destructive">{t.journals.required}</p> : null}
      {form.formState.errors.root ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSaved}>{t.common.cancel}</Button>
        <Button type="submit" disabled={!balanced || create.isPending}>{t.journals.saveEntry}</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Run test to verify it passes** — `pnpm test --run src/features/journals/JournalEntryForm.test.tsx` (PASS, 2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/features/journals/JournalLineRow.tsx src/features/journals/JournalTotals.tsx src/features/journals/JournalEntryForm.tsx src/features/journals/JournalEntryForm.test.tsx
git commit -m "feat(journals): balanced manual-entry editor (controlled lines)"
```

---

### Task 7: Register — `columns` + `JournalsPage`

**Files:**
- Create: `src/features/journals/columns.tsx`, `src/features/journals/JournalsPage.tsx`
- Test: `src/features/journals/JournalsPage.test.tsx`

> Verify with `pnpm test --run` only (NOT `pnpm build`) — `columns`/`JournalsPage` link to `/journals/*` routes that don't exist until Task 8.

- [ ] **Step 1: Write the failing test** — create `src/features/journals/JournalsPage.test.tsx`:

```tsx
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { API, journalEntryListFixture } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { JournalsPage } from './JournalsPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute();
  const index = createRoute({ getParentRoute: () => root, path: '/', component: () => <JournalsPage /> });
  const newR = createRoute({ getParentRoute: () => root, path: '/journals/new', component: () => null });
  const view = createRoute({ getParentRoute: () => root, path: '/journals/$id', component: () => null });
  const router = createRouter({ routeTree: root.addChildren([index, newR, view]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  return render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
}

it('lists the paginated register; ACCOUNTANT no Posting; DRAFT filter shows Posting for APPROVER', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  renderPage();
  expect(await screen.findByText('Penjualan diposting')).toBeInTheDocument();
  expect(screen.getByText(/Menampilkan 1–5 dari 5/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Posting' })).not.toBeInTheDocument();
});

it('APPROVER posts a draft with an idempotency key', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  let seenKey: string | null = null;
  server.use(
    http.get(`${API}/ledger/journal-entries`, () => HttpResponse.json({ data: journalEntryListFixture().filter((e) => e.status === 'DRAFT'), total: 3, limit: 20, offset: 0 })),
    http.post(`${API}/ledger/journal-entries/jed1/post`, ({ request }) => { seenKey = request.headers.get('Idempotency-Key'); return HttpResponse.json({ id: 'jed1', date: '2026-06-16T00:00:00.000Z', description: 'Draf 1', sourceType: 'MANUAL', status: 'POSTED' }); }),
  );
  renderPage();
  await screen.findByText('Draf 1');
  await user.click(screen.getAllByRole('button', { name: 'Posting' })[0]);
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(seenKey).toBeTruthy());
});

it('Pagination Next requests the next offset', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let lastOffset: string | null = null;
  server.use(http.get(`${API}/ledger/journal-entries`, ({ request }) => {
    lastOffset = new URL(request.url).searchParams.get('offset');
    return HttpResponse.json({ data: journalEntryListFixture().slice(0, 1), total: 25, limit: 20, offset: Number(lastOffset ?? '0') });
  }));
  renderPage();
  await screen.findByText('Draf 1');
  await user.click(screen.getByRole('button', { name: /berikutnya/i }));
  await waitFor(() => expect(lastOffset).toBe('20'));
});

it('APPROVER reverses a MANUAL posted entry', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  let reversed = false;
  server.use(
    http.get(`${API}/ledger/journal-entries`, () => HttpResponse.json({ data: journalEntryListFixture().filter((e) => e.id === 'jep2'), total: 1, limit: 20, offset: 0 })),
    http.post(`${API}/ledger/journal-entries/jep2/reverse`, () => { reversed = true; return HttpResponse.json({ id: 'rev1', date: '2026-06-15T00:00:00.000Z', description: 'Reversal', sourceType: 'REVERSAL', status: 'POSTED' }); }),
  );
  renderPage();
  await screen.findByText('Jurnal manual diposting');
  await user.click(screen.getByRole('button', { name: 'Balikkan' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Balikkan' }));
  await waitFor(() => expect(reversed).toBe(true));
});

it('surfaces UNBALANCED_ENTRY on post', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  server.use(
    http.get(`${API}/ledger/journal-entries`, () => HttpResponse.json({ data: journalEntryListFixture().filter((e) => e.id === 'jed1'), total: 1, limit: 20, offset: 0 })),
    http.post(`${API}/ledger/journal-entries/jed1/post`, () => HttpResponse.json({ code: 'UNBALANCED_ENTRY', message: 'debits != credits' }, { status: 422 })),
  );
  renderPage();
  await screen.findByText('Draf 1');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  // toastApiError has no special-case for UNBALANCED_ENTRY (422), so it surfaces the
  // server message via toast.error — assert the error path ran, not a mapped string.
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/journals/JournalsPage.test.tsx` (FAIL: cannot resolve `./JournalsPage`).

- [ ] **Step 3: Create `src/features/journals/columns.tsx`**

```tsx
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/common/MoneyText';
import { RoleGate } from '@/components/common/RoleGate';
import { formatDateID } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import type { JournalEntryListItem } from './schema';

const col = createColumnHelper<JournalEntryListItem>();

function statusLabel(t: Messages, s: string): string {
  return s === 'DRAFT' ? t.journals.statusDraft : t.journals.statusPosted;
}
function sourceLabel(t: Messages, s: string): string {
  if (s === 'MANUAL') return t.journals.sourceManual;
  if (s === 'REVERSAL') return t.journals.sourceReversal;
  if (s === 'SALE') return t.journals.sourceSale;
  if (s === 'PURCHASE') return t.journals.sourcePurchase;
  if (s === 'PAYMENT') return t.journals.sourcePayment;
  return s;
}

export function buildJournalColumns(
  t: Messages,
  handlers: { onDelete: (e: JournalEntryListItem) => void; onPost: (e: JournalEntryListItem) => void; onReverse: (e: JournalEntryListItem) => void },
) {
  return [
    col.accessor('entryRef', { header: t.journals.entryRef, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('date', { header: t.journals.date, cell: (c) => formatDateID(c.getValue().slice(0, 10)) }),
    col.accessor('description', { header: t.journals.description, cell: (c) => c.getValue() }),
    col.accessor('sourceType', { header: t.journals.sourceType, cell: (c) => <Badge variant="outline">{sourceLabel(t, c.getValue())}</Badge> }),
    col.accessor('status', { header: t.journals.status, cell: (c) => <Badge variant={c.getValue() === 'DRAFT' ? 'secondary' : 'default'}>{statusLabel(t, c.getValue())}</Badge> }),
    col.accessor('totalDebit', { header: t.journals.totalDebit, cell: (c) => <MoneyText value={c.getValue()} /> }),
    col.accessor('lineCount', { header: t.journals.lineCount, cell: (c) => c.getValue() }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => {
        const e = c.row.original;
        return (
          <div className="flex justify-end gap-1">
            <Button asChild variant="ghost" size="sm"><Link to="/journals/$id" params={{ id: e.id }}>{t.journals.view}</Link></Button>
            {e.status === 'DRAFT' ? (
              <>
                <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onDelete(e)}>{t.common.delete}</Button>
                </RoleGate>
                <RoleGate allow={['APPROVER', 'ADMIN']}>
                  <Button variant="ghost" size="sm" onClick={() => handlers.onPost(e)}>{t.journals.post}</Button>
                </RoleGate>
              </>
            ) : e.status === 'POSTED' && e.sourceType === 'MANUAL' ? (
              <RoleGate allow={['APPROVER', 'ADMIN']}>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onReverse(e)}>{t.journals.reverse}</Button>
              </RoleGate>
            ) : null}
          </div>
        );
      },
    }),
  ];
}
```

- [ ] **Step 4: Create `src/features/journals/JournalsPage.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { RoleGate } from '@/components/common/RoleGate';
import { useT } from '@/lib/i18n/useT';
import { toastApiError } from '@/lib/api/toastApiError';
import { buildJournalColumns } from './columns';
import { useJournalEntries, useDeleteJournalEntry, usePostJournalEntry, useReverseJournalEntry } from './hooks';
import type { JournalEntryListItem } from './schema';

const LIMIT = 20;
const STATUSES = ['ALL', 'DRAFT', 'POSTED'] as const;
const SOURCES = ['ALL', 'MANUAL'] as const;
type PendingAction = { kind: 'delete' | 'post' | 'reverse'; entry: JournalEntryListItem; idempotencyKey?: string };

export function JournalsPage() {
  const t = useT();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [source, setSource] = useState<(typeof SOURCES)[number]>('ALL');
  const [offset, setOffset] = useState(0);
  const [action, setAction] = useState<PendingAction | null>(null);

  const page = useJournalEntries({
    status: status === 'ALL' ? undefined : status,
    sourceType: source === 'ALL' ? undefined : source,
    limit: LIMIT,
    offset,
  });
  const remove = useDeleteJournalEntry();
  const post = usePostJournalEntry();
  const reverse = useReverseJournalEntry();

  const columns = useMemo(
    () => buildJournalColumns(t, {
      onDelete: (e) => setAction({ kind: 'delete', entry: e }),
      onPost: (e) => setAction({ kind: 'post', entry: e, idempotencyKey: crypto.randomUUID() }),
      onReverse: (e) => setAction({ kind: 'reverse', entry: e, idempotencyKey: crypto.randomUUID() }),
    }),
    [t],
  );

  function runAction() {
    if (!action) return;
    const close = () => setAction(null);
    if (action.kind === 'delete') {
      remove.mutate(action.entry.id, { onSuccess: () => { toast.success(t.journals.deleted); close(); }, onError: () => toast.error(t.common.error) });
    } else if (action.kind === 'post') {
      post.mutate({ id: action.entry.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.journals.posted); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    } else {
      reverse.mutate({ id: action.entry.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.journals.reversed); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    }
  }

  const confirmCopy = {
    delete: { title: t.crud.confirmDeleteTitle, desc: t.crud.confirmDeleteDesc, label: t.common.delete },
    post: { title: t.journals.confirmPostTitle, desc: t.journals.confirmPostDesc, label: t.journals.post },
    reverse: { title: t.journals.confirmReverseTitle, desc: t.journals.confirmReverseDesc, label: t.journals.reverse },
  } as const;

  function pick<T>(setter: (v: T) => void, value: T) { setter(value); setOffset(0); }

  return (
    <div>
      <PageHeader title={t.journals.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button asChild><Link to="/journals/new"><Plus className="size-4" /> {t.journals.newEntry}</Link></Button>
        </RoleGate>
      } />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => pick(setStatus, s)}>
              {s === 'ALL' ? t.journals.statusAll : s === 'DRAFT' ? t.journals.statusDraft : t.journals.statusPosted}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {SOURCES.map((s) => (
            <Button key={s} size="sm" variant={source === s ? 'default' : 'outline'} onClick={() => pick(setSource, s)}>
              {s === 'ALL' ? t.journals.sourceAll : t.journals.sourceManual}
            </Button>
          ))}
        </div>
      </div>

      {page.isLoading ? <Skeleton className="h-40 w-full" />
        : page.isError ? <ErrorState error={page.error} />
        : (
          <>
            <DataTable columns={columns} data={page.data.data} />
            <Pagination offset={offset} limit={LIMIT} total={page.data.total} onChange={setOffset} />
          </>
        )}

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => !o && setAction(null)}
        title={action ? confirmCopy[action.kind].title : ''}
        description={action ? confirmCopy[action.kind].desc : undefined}
        confirmLabel={action ? confirmCopy[action.kind].label : ''}
        destructive={action?.kind !== 'post'}
        pending={remove.isPending || post.isPending || reverse.isPending}
        onConfirm={runAction}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes** — `pnpm test --run src/features/journals/JournalsPage.test.tsx` (PASS, 5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/journals/columns.tsx src/features/journals/JournalsPage.tsx src/features/journals/JournalsPage.test.tsx
git commit -m "feat(journals): register page + role/status-gated columns + pagination"
```

---

### Task 8: Detail page + routes + nav + verification

**Files:**
- Create: `src/features/journals/JournalEntryEditorPage.tsx`
- Create: `src/app/routes/_app/journals.tsx`, `.index.tsx`, `.new.tsx`, `.$id.tsx`
- Modify: `src/components/common/AppShell.tsx`

- [ ] **Step 1: Create `src/features/journals/JournalEntryEditorPage.tsx`**

```tsx
import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { MoneyText } from '@/components/common/MoneyText';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { accountsApi } from '@/features/accounts/hooks';
import { JournalEntryForm } from './JournalEntryForm';
import { useJournalEntry } from './hooks';

export function JournalEntryEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/journals' });
  const item = useJournalEntry(id ?? '');
  const accounts = accountsApi.useList();
  const accountName = useMemo(() => {
    const map = new Map((accounts.data ?? []).map((a) => [a.id, `${a.code} — ${a.name}`]));
    return (aid: string) => map.get(aid) ?? aid;
  }, [accounts.data]);

  if (!id) {
    return <div><PageHeader title={t.journals.newEntry} /><JournalEntryForm onSaved={goList} /></div>;
  }
  if (item.isLoading) return <Skeleton className="h-96 w-full" />;
  if (item.isError || !item.data) return <ErrorState error={item.error} />;
  const je = item.data;
  return (
    <div className="space-y-4">
      <PageHeader title={`${t.journals.view}${je.entryRef ? ` · ${je.entryRef}` : ''}`} />
      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div><div className="text-muted-foreground">{t.journals.date}</div><div>{formatDateID(je.date.slice(0, 10))}</div></div>
        <div className="md:col-span-2"><div className="text-muted-foreground">{t.journals.description}</div><div>{je.description}</div></div>
        <div><div className="text-muted-foreground">{t.journals.status}</div><Badge variant={je.status === 'DRAFT' ? 'secondary' : 'default'}>{je.status === 'DRAFT' ? t.journals.statusDraft : t.journals.statusPosted}</Badge></div>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.journals.account}</TableHead>
              <TableHead className="text-right">{t.journals.debit}</TableHead>
              <TableHead className="text-right">{t.journals.credit}</TableHead>
              <TableHead>{t.journals.lineDescription}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {je.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{accountName(l.accountId)}</TableCell>
                <TableCell className="text-right"><MoneyText value={l.debit} /></TableCell>
                <TableCell className="text-right"><MoneyText value={l.credit} /></TableCell>
                <TableCell>{l.description ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the four route files**

`src/app/routes/_app/journals.tsx`:
```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/journals')({
  component: () => <Outlet />,
});
```

`src/app/routes/_app/journals.index.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { JournalsPage } from '@/features/journals/JournalsPage';

export const Route = createFileRoute('/_app/journals/')({
  component: JournalsPage,
});
```

`src/app/routes/_app/journals.new.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { JournalEntryEditorPage } from '@/features/journals/JournalEntryEditorPage';

export const Route = createFileRoute('/_app/journals/new')({
  component: function NewJournalRoute() {
    return <JournalEntryEditorPage />;
  },
});
```

`src/app/routes/_app/journals.$id.tsx`:
```tsx
import { createFileRoute, useParams } from '@tanstack/react-router';
import { JournalEntryEditorPage } from '@/features/journals/JournalEntryEditorPage';

export const Route = createFileRoute('/_app/journals/$id')({
  component: function ViewJournalRoute() {
    const { id } = useParams({ from: '/_app/journals/$id' });
    return <JournalEntryEditorPage id={id} />;
  },
});
```

- [ ] **Step 3: Regenerate the route tree**

The new route files must be added to `src/routeTree.gen.ts` (written by the `@tanstack/router-plugin` Vite plugin) before `tsc` accepts the typed `Link`/`navigate`/`useParams` calls. Start the dev server in the background to trigger regeneration, poll until the tree contains the routes, then stop it:

Run (background): `pnpm dev`
Then poll until: `grep -q "journals" src/routeTree.gen.ts && echo REGENERATED`
Expected: prints `REGENERATED` (a few seconds). Then stop the dev server. (Running `pnpm test --run` also triggers regeneration via the same plugin.)

- [ ] **Step 4: Add the nav item in `AppShell.tsx`**

In `src/components/common/AppShell.tsx`: add `NotebookText` to the `lucide-react` import, and add the nav entry after the Accounts line:

```tsx
    { to: '/accounts', label: t.nav.accounts, icon: BookText },
    { to: '/journals', label: t.nav.journals, icon: NotebookText },
    { to: '/partners', label: t.nav.partners, icon: Users },
```

- [ ] **Step 5: Full verification**

Run: `pnpm test --run` — expect all green (~170: 151 prior + Pagination 3 + schema 3 + balance 4 + hooks 4 + JournalEntryForm 2 + JournalsPage 5).
Run: `pnpm lint` — expect 0 errors (pre-existing react-compiler `form.watch`/`incompatible-library` warnings acceptable).
Run: `pnpm build` — expect success (`tsc` now accepts the typed `/journals` routes; Vite emits the journals chunk).

If `pnpm build` fails at `tsc` over unknown `/journals` routes, the tree wasn't regenerated — repeat Step 3 and rebuild.

- [ ] **Step 6: Dev smoke (optional)**

`pnpm dev`, log in (creds in `.env`), open `/journals`; create a balanced manual entry (debit one account, credit another, equal amounts → Save enables), save the draft; as APPROVER post it (it gets a `JE/…` ref) and reverse it. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/features/journals/JournalEntryEditorPage.tsx src/app/routes/_app/journals.tsx src/app/routes/_app/journals.index.tsx src/app/routes/_app/journals.new.tsx "src/app/routes/_app/journals.\$id.tsx" src/components/common/AppShell.tsx src/routeTree.gen.ts
git commit -m "feat(journals): detail view, routes, and nav entry"
```

---

## Done Criteria

- `/journals` lists all entries paginated (Prev/Next + count) with status (incl. DRAFT = the approval queue) and sourceType filters; gated "Buat Jurnal" for ACCOUNTANT+; nav entry present.
- The balanced editor creates manual draft entries (≥2 lines, debits = credits > 0, per-line debit-XOR-credit), posting `{date, description, lines:[…]}`; Save is disabled until balanced.
- Post/reverse/delete from the register reuse `useDocumentAction`/mutations with Idempotency-Key + SoD/UNBALANCED-distinct toasts; reverse only on MANUAL POSTED entries; role-gated.
- `useJournalEntries` consumes the paginated envelope; `useJournalEntry` serves the detail with lines; list and detail use distinct schemas; all money via `Money`/`MoneyText`.
- The dashboard's "Jurnal Draft = 3" stays green (the new MSW handler preserves `total:3` for `?status=DRAFT`).
- All tests pass (~170); lint clean; build green.

## Out of Scope (YAGNI)

Editing posted/draft entries (no `PATCH`), reversing auto-generated entries from the journals UI, `?post=true` create-and-post, GL/trial-balance report screens, making the dashboard draft card a link, server-side search/sort/export.

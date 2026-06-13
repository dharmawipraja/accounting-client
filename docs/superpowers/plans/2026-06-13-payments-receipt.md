# Plan 4a — Payments (Receipt) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build customer receipts — a full-page editor that allocates a received amount across a partner's open (POSTED, outstanding>0) sales invoices, with the draft→post→void lifecycle reused from sales invoices.

**Architecture:** Header fields go through React Hook Form + zod; the allocation rows are controlled local state keyed by invoice id (rows come from an async `useOpenInvoices(partnerId)` derivation). The payment total is computed from allocations via `Money` (never trusting a response field). Lifecycle reuses `useDocumentAction` + `toastApiError`; posted/void payments open read-only.

**Tech Stack:** React 19, TanStack Query v5 + Router, Zod v4, React Hook Form, shadcn/ui, decimal.js (`Money`), Vitest + RTL + MSW, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-13-payments-receipt-design.md`.

> **Note:** the live API was unreachable when this plan was written, so the `Payment` response schema below is **inferred** from `CreatePaymentDto` + the document envelope every other resource shares. It is deliberately **tolerant** (extra keys stripped, uncertain fields `nullish`), and the **total is computed from allocations** so the feature does not depend on an unverified field name. Task 1 includes a reconciliation step to run when the API is back up.

## Canonical interfaces

```ts
// src/features/payments/schema.ts
type PaymentAllocation = { id?: string; salesInvoiceId?: string | null; purchaseBillId?: string | null; amount: string };
type Payment = {
  id: string; paymentNumber?: number | null; paymentRef?: string | null;
  direction: 'RECEIPT' | 'DISBURSEMENT'; partnerId: string; date: string; cashAccountId: string;
  description?: string | null; status: string; total?: string | null;
  journalEntryId?: string | null; postedBy?: string | null; postedAt?: string | null;
  allocations: PaymentAllocation[];
};
type PaymentCreatePayload = { direction: 'RECEIPT'; partnerId: string; date: string; cashAccountId: string; description?: string; allocations: { salesInvoiceId: string; amount: string }[] };
type PaymentHeaderValues = { partnerId: string; date: string; cashAccountId: string; description: string };

// src/features/payments/useOpenInvoices.ts
function useOpenInvoices(partnerId?: string): SalesInvoice[];

// src/features/payments/hooks.ts
const paymentsApi = createResourceHooks<Payment, PaymentCreatePayload, Partial<PaymentCreatePayload>>(...);
function usePostPayment(): ReturnType<typeof useDocumentAction>;
function useVoidPayment(): ReturnType<typeof useDocumentAction>;
```

## File structure

```
src/features/payments/
  schema.ts (+ schema.test.ts)
  hooks.ts
  useOpenInvoices.ts (+ .test.tsx)
  AllocationTable.tsx
  PaymentTotals.tsx
  PaymentForm.tsx (+ PaymentForm.test.tsx)
  PaymentEditorPage.tsx
  columns.tsx
  PaymentsPage.tsx (+ PaymentsPage.test.tsx)
src/lib/query/keys.ts                 # add payments
src/lib/i18n/messages.id.ts           # add payments group
src/test/handlers.ts                  # payments CRUD + post/void; a POSTED open invoice
src/app/routes/_app/payments.tsx              # layout <Outlet/>
src/app/routes/_app/payments.index.tsx        # list
src/app/routes/_app/payments.new.tsx          # editor (new)
src/app/routes/_app/payments.$id.edit.tsx     # editor (edit)
```

---

## Task 1: Payment schema + hooks + keys (TDD) + live reconciliation

**Files:**
- Create: `src/features/payments/schema.ts`, `src/features/payments/schema.test.ts`, `src/features/payments/hooks.ts`
- Modify: `src/lib/query/keys.ts`

- [ ] **Step 1 (optional but preferred): reconcile against the live API if it is up**

If `VITE_API_BASE_URL` is reachable, run a one-off Node script (read `.env` for creds; do NOT commit it) that: PATCH `/company/settings { segregationOfDutiesEnabled:false }`; create a temp customer partner; create+post a sales invoice; `POST /payments { direction:'RECEIPT', partnerId, date, cashAccountId:<Kas 1-1000 id>, allocations:[{ salesInvoiceId, amount:<outstanding> }] }`; capture the draft + `GET /payments/:id` + `POST /payments/:id/post` responses; then **in a `finally`**: void the payment, void the invoice, delete the partner, and PATCH `segregationOfDutiesEnabled:true` (verify it's back to true). Use the captured field names (e.g. `paymentNumber`/`paymentRef`/`total`/`allocations[]`/`status` values) to adjust `paymentSchema` below. If the API is unreachable, proceed with the inferred schema as-is (it is tolerant).

- [ ] **Step 2: Write the failing test**

Create `src/features/payments/schema.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { paymentSchema } from './schema';

const draft = {
  id: 'pay1', paymentNumber: null, paymentRef: null, direction: 'RECEIPT', partnerId: 'p1',
  date: '2026-06-16T00:00:00.000Z', cashAccountId: 'kas', description: 'Terima', status: 'DRAFT',
  total: '1110000.0000', journalEntryId: null,
  allocations: [{ id: 'al1', salesInvoiceId: 'i1', purchaseBillId: null, amount: '1110000.0000' }],
};

describe('paymentSchema', () => {
  it('parses a draft payment and strips extra keys', () => {
    const r = paymentSchema.parse({ ...draft, createdBy: 'u', updatedAt: 'x' });
    expect(r.direction).toBe('RECEIPT');
    expect(r.allocations[0].salesInvoiceId).toBe('i1');
  });
  it('tolerates a posted payment with a numeric paymentNumber + ref', () => {
    const r = paymentSchema.parse({ ...draft, status: 'POSTED', paymentNumber: 1, paymentRef: 'PAY/2026/000001' });
    expect(r.status).toBe('POSTED');
    expect(r.paymentNumber).toBe(1);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test src/features/payments/schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Create the schema**

Create `src/features/payments/schema.ts`:
```ts
import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const paymentAllocationSchema = z.object({
  id: z.string().optional(),
  salesInvoiceId: z.string().nullish(),
  purchaseBillId: z.string().nullish(),
  amount: moneyString,
});
export type PaymentAllocation = z.infer<typeof paymentAllocationSchema>;

export const paymentSchema = z.object({
  id: z.string(),
  paymentNumber: z.number().nullish(),
  paymentRef: z.string().nullish(),
  direction: z.enum(['RECEIPT', 'DISBURSEMENT']),
  partnerId: z.string(),
  date: z.string(),
  cashAccountId: z.string(),
  description: z.string().nullish(),
  status: z.string(),
  total: moneyString.nullish(),
  journalEntryId: z.string().nullish(),
  postedBy: z.string().nullish(),
  postedAt: z.string().nullish(),
  allocations: z.array(paymentAllocationSchema),
});
export type Payment = z.infer<typeof paymentSchema>;

export type PaymentCreatePayload = {
  direction: 'RECEIPT';
  partnerId: string;
  date: string;
  cashAccountId: string;
  description?: string;
  allocations: { salesInvoiceId: string; amount: string }[];
};
export type PaymentUpdatePayload = Partial<PaymentCreatePayload>;
```

- [ ] **Step 5: Add keys + hooks**

In `src/lib/query/keys.ts` add to `queryKeys`:
```ts
  payments: createResourceKeys('payments'),
```
Create `src/features/payments/hooks.ts`:
```ts
import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
import { paymentSchema, type Payment, type PaymentCreatePayload, type PaymentUpdatePayload } from './schema';

export const paymentsApi = createResourceHooks<Payment, PaymentCreatePayload, PaymentUpdatePayload>({
  key: 'payments',
  basePath: '/payments',
  itemSchema: paymentSchema,
});

export const usePostPayment = () => useDocumentAction({ key: 'payments', basePath: '/payments', action: 'post' });
export const useVoidPayment = () => useDocumentAction({ key: 'payments', basePath: '/payments', action: 'void' });
```

- [ ] **Step 6: Run + build**

Run: `pnpm test src/features/payments/schema.test.ts && pnpm build`
Expected: PASS; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/features/payments/schema.ts src/features/payments/schema.test.ts src/features/payments/hooks.ts src/lib/query/keys.ts
git commit -m "feat: payment schema, hooks, and query keys"
```

---

## Task 2: i18n `payments` group

**Files:**
- Modify: `src/lib/i18n/messages.id.ts`

- [ ] **Step 1: Add the group**

Add to the `id` object in `src/lib/i18n/messages.id.ts`:
```ts
  payments: {
    title: 'Pembayaran',
    newPayment: 'Pembayaran Baru',
    editPayment: 'Ubah Pembayaran',
    view: 'Lihat',
    number: 'No.',
    partner: 'Pelanggan',
    date: 'Tanggal',
    cashAccount: 'Akun Kas',
    description: 'Keterangan',
    status: 'Status',
    selectCashAccount: 'Pilih akun kas',
    invoiceRef: 'No. Faktur',
    dueDate: 'Jatuh Tempo',
    outstanding: 'Sisa',
    allocation: 'Dialokasikan',
    payFull: 'Lunasi',
    totalReceived: 'Total Diterima',
    noOpenInvoices: 'Tidak ada faktur terbuka untuk pelanggan ini',
    selectPartnerFirst: 'Pilih pelanggan untuk melihat faktur terbuka',
    overAllocated: 'Melebihi sisa tagihan',
    atLeastOneAllocation: 'Alokasikan minimal satu faktur',
    savePayment: 'Simpan',
    post: 'Posting',
    void: 'Batalkan',
    confirmPostTitle: 'Posting pembayaran ini?',
    confirmPostDesc: 'Pembayaran akan diposting ke buku besar.',
    confirmVoidTitle: 'Batalkan pembayaran ini?',
    confirmVoidDesc: 'Posting akan dibalik (jurnal pembalik dibuat).',
    posted: 'Pembayaran diposting',
    voided: 'Pembayaran dibatalkan',
    readOnlyPosted: 'Pembayaran sudah diposting — hanya-baca.',
    readOnlyVoid: 'Pembayaran dibatalkan — hanya-baca.',
    statusAll: 'Semua',
    statusDraft: 'Draf',
    statusPosted: 'Diposting',
    statusVoid: 'Dibatalkan',
  },
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat: add payments i18n group"
```

---

## Task 3: `useOpenInvoices` (TDD)

**Files:**
- Create: `src/features/payments/useOpenInvoices.ts`, `src/features/payments/useOpenInvoices.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/payments/useOpenInvoices.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useOpenInvoices } from './useOpenInvoices';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const base = (over: Record<string, unknown>) => ({
  id: 'x', invoiceNumber: 1, invoiceRef: 'INV/1', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z',
  dueDate: null, description: null, status: 'POSTED', subtotal: '0.0000', taxTotal: '0.0000',
  withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000',
  paymentStatus: 'UNPAID', lines: [], ...over,
});

it('returns only POSTED, outstanding>0 invoices for the partner', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(http.get(`${API}/sales-invoices`, () => HttpResponse.json([
    base({ id: 'open', partnerId: 'p1' }),                         // ✓
    base({ id: 'draft', partnerId: 'p1', status: 'DRAFT' }),       // ✗ not posted
    base({ id: 'paid', partnerId: 'p1', outstanding: '0.0000' }),  // ✗ nothing outstanding
    base({ id: 'other', partnerId: 'p2' }),                        // ✗ other partner
  ])));
  const { result } = renderHook(() => useOpenInvoices('p1'), { wrapper });
  await waitFor(() => expect(result.current.map((i) => i.id)).toEqual(['open']));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/payments/useOpenInvoices.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/features/payments/useOpenInvoices.ts`:
```ts
import { useMemo } from 'react';
import { Money } from '@/lib/money/money';
import { salesInvoicesApi } from '@/features/sales-invoices/hooks';
import type { SalesInvoice } from '@/features/sales-invoices/schema';

/** Open invoices for a partner: POSTED + outstanding>0 (+ partner if given), sorted by date. */
export function useOpenInvoices(partnerId?: string): SalesInvoice[] {
  const list = salesInvoicesApi.useList();
  return useMemo(
    () =>
      (list.data ?? [])
        .filter((inv) => inv.status === 'POSTED'
          && Money.from(inv.outstanding).gt(Money.zero())
          && (!partnerId || inv.partnerId === partnerId))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [list.data, partnerId],
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/features/payments/useOpenInvoices.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/payments/useOpenInvoices.ts src/features/payments/useOpenInvoices.test.tsx
git commit -m "feat: useOpenInvoices derivation (POSTED + outstanding>0 + partner)"
```

---

## Task 4: MSW payment + open-invoice fixtures

**Files:**
- Modify: `src/test/handlers.ts`

- [ ] **Step 1: Add fixtures + handlers**

In `src/test/handlers.ts`, add an exported fixture + handlers (keep existing):
```ts
// --- payments (Plan 4a) ---
export const paymentFixtures = () => [
  { id: 'pay1', paymentNumber: null, paymentRef: null, direction: 'RECEIPT', partnerId: 'p1', date: '2026-06-16T00:00:00.000Z', cashAccountId: 'a1', description: 'Terima', status: 'DRAFT', total: '1110000.0000', journalEntryId: null, allocations: [{ id: 'al1', salesInvoiceId: 'i1', purchaseBillId: null, amount: '1110000.0000' }] },
];
// a POSTED open invoice to allocate against (used by the payment editor test)
export const openInvoiceFixture = () => ({ id: 'i1', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z', dueDate: '2026-07-15T00:00:00.000Z', description: null, status: 'POSTED', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] });
```
And inside `handlers`:
```ts
  http.get(`${API}/payments`, () => HttpResponse.json(paymentFixtures())),
  http.get(`${API}/payments/:id`, ({ params }) => HttpResponse.json({ ...paymentFixtures()[0], id: params.id })),
  http.post(`${API}/payments`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...paymentFixtures()[0], id: 'pay9', status: 'DRAFT', ...body });
  }),
  http.patch(`${API}/payments/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...paymentFixtures()[0], id: params.id, ...body });
  }),
  http.delete(`${API}/payments/:id`, () => HttpResponse.json({})),
  http.post(`${API}/payments/:id/post`, ({ params }) => HttpResponse.json({ ...paymentFixtures()[0], id: params.id, status: 'POSTED', paymentNumber: 1, paymentRef: 'PAY/2026/000001' })),
  http.post(`${API}/payments/:id/void`, ({ params }) => HttpResponse.json({ ...paymentFixtures()[0], id: params.id, status: 'VOID' })),
```

- [ ] **Step 2: Verify**

Run: `pnpm test src/test && pnpm build`
Expected: PASS / succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/test/handlers.ts
git commit -m "test: add MSW payment + open-invoice fixtures"
```

---

## Task 5: `PaymentTotals` + `AllocationTable`

**Files:**
- Create: `src/features/payments/PaymentTotals.tsx`, `src/features/payments/AllocationTable.tsx`

- [ ] **Step 1: Implement `PaymentTotals`**

Create `src/features/payments/PaymentTotals.tsx`:
```tsx
import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';

/** Sum the allocation amounts (decimal) into the Total Diterima. */
export function PaymentTotals({ amounts }: { amounts: Record<string, string> }) {
  const t = useT();
  const total = Object.values(amounts).reduce((acc, v) => {
    try { return acc.plus(Money.from(v || '0')); } catch { return acc; }
  }, Money.zero());
  return (
    <div className="ml-auto w-full max-w-xs rounded-lg border p-4 text-sm">
      <div className="flex justify-between font-semibold">
        <span className="text-muted-foreground">{t.payments.totalReceived}</span>
        <span className="font-mono tabular-nums">{total.toRupiah()}</span>
      </div>
    </div>
  );
}

/** Exported for reuse by the form's validation/payload building. */
export function sumAmounts(amounts: Record<string, string>): Money {
  return Object.values(amounts).reduce((acc, v) => {
    try { return acc.plus(Money.from(v || '0')); } catch { return acc; }
  }, Money.zero());
}
```

- [ ] **Step 2: Implement `AllocationTable`**

Create `src/features/payments/AllocationTable.tsx`:
```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';
import { MoneyText } from '@/components/common/MoneyText';
import { Money } from '@/lib/money/money';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import type { SalesInvoice } from '@/features/sales-invoices/schema';

interface Props {
  invoices: SalesInvoice[];
  amounts: Record<string, string>;
  onAmountChange: (invoiceId: string, raw: string) => void;
  readOnly?: boolean;
  partnerSelected: boolean;
}

export function AllocationTable({ invoices, amounts, onAmountChange, readOnly, partnerSelected }: Props) {
  const t = useT();
  if (!partnerSelected) return <p className="text-sm text-muted-foreground">{t.payments.selectPartnerFirst}</p>;
  if (invoices.length === 0) return <EmptyState message={t.payments.noOpenInvoices} />;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.payments.invoiceRef}</TableHead>
            <TableHead>{t.payments.dueDate}</TableHead>
            <TableHead className="text-right">{t.payments.outstanding}</TableHead>
            <TableHead className="text-right">{t.payments.allocation}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => {
            const over = (() => {
              try { return Money.from(amounts[inv.id] || '0').gt(Money.from(inv.outstanding)); } catch { return false; }
            })();
            return (
              <TableRow key={inv.id}>
                <TableCell>{inv.invoiceRef ?? '—'}</TableCell>
                <TableCell>{inv.dueDate ? formatDateID(inv.dueDate.slice(0, 10)) : '—'}</TableCell>
                <TableCell className="text-right"><MoneyText value={inv.outstanding} /></TableCell>
                <TableCell className="w-40">
                  <Input
                    className="text-right font-mono tabular-nums"
                    inputMode="decimal"
                    aria-label={`${t.payments.allocation} ${inv.invoiceRef ?? inv.id}`}
                    value={amounts[inv.id] ?? ''}
                    disabled={readOnly}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (next === '' || /^\d*\.?\d{0,4}$/.test(next)) onAmountChange(inv.id, next);
                    }}
                  />
                  {over ? <p role="alert" className="text-xs text-destructive">{t.payments.overAllocated}</p> : null}
                </TableCell>
                <TableCell>
                  {readOnly ? null : (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onAmountChange(inv.id, Money.from(inv.outstanding).toApi())}>
                      {t.payments.payFull}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds (consumed by `PaymentForm` next).

- [ ] **Step 4: Commit**

```bash
git add src/features/payments/PaymentTotals.tsx src/features/payments/AllocationTable.tsx
git commit -m "feat: AllocationTable + PaymentTotals"
```

---

## Task 6: `PaymentForm` (TDD)

**Files:**
- Create: `src/features/payments/PaymentForm.tsx`, `src/features/payments/PaymentForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/payments/PaymentForm.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API, openInvoiceFixture } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { PaymentForm } from './PaymentForm';

afterEach(() => useSession.getState().clear());

const accounts = [{ id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null }];
const partners = [{ id: 'p1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }];

function renderForm(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function commonHandlers() {
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
    http.get(`${API}/partners`, () => HttpResponse.json(partners)),
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([openInvoiceFixture()])),
  );
}

it('allocates via Lunasi and posts the RECEIPT payload', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  commonHandlers();
  let posted: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/payments`, async ({ request }) => {
    posted = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'pay9', paymentNumber: null, paymentRef: null, direction: 'RECEIPT', partnerId: 'p1', date: '2026-06-16T00:00:00.000Z', cashAccountId: 'a1', description: null, status: 'DRAFT', total: '1110000.0000', allocations: [{ salesInvoiceId: 'i1', amount: '1110000.0000' }] });
  }));
  const onSaved = vi.fn();
  renderForm(<PaymentForm mode="create" onSaved={onSaved} />);

  await user.click(screen.getByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-16');
  await user.click(screen.getByRole('combobox', { name: /akun kas/i }));
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.click(await screen.findByRole('button', { name: /lunasi/i }));   // fill full outstanding
  await user.click(screen.getByRole('button', { name: /simpan/i }));

  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ direction: 'RECEIPT', partnerId: 'p1', cashAccountId: 'a1', allocations: [{ salesInvoiceId: 'i1', amount: '1110000.0000' }] });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it('blocks save when nothing is allocated', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  commonHandlers();
  renderForm(<PaymentForm mode="create" onSaved={vi.fn()} />);
  await user.click(screen.getByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-16');
  await user.click(screen.getByRole('combobox', { name: /akun kas/i }));
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  expect(await screen.findByText(/minimal satu faktur/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/payments/PaymentForm.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PaymentForm`**

Create `src/features/payments/PaymentForm.tsx`:
```tsx
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PartnerSelect } from '@/components/common/PartnerSelect';
import { AccountSelect } from '@/components/common/AccountSelect';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';
import { useOpenInvoices } from './useOpenInvoices';
import { AllocationTable } from './AllocationTable';
import { PaymentTotals } from './PaymentTotals';
import { paymentsApi } from './hooks';
import type { Payment, PaymentHeaderValues } from './schema';

const headerSchema = z.object({
  partnerId: z.string().min(1, 'selectPartner'),
  date: z.string().min(1, 'required'),
  cashAccountId: z.string().min(1, 'selectCashAccount'),
  description: z.string(),
});

interface Props {
  mode: 'create' | 'edit';
  payment?: Payment;
  onSaved: () => void;
  readOnly?: boolean;
}

export function PaymentForm({ mode, payment, onSaved, readOnly }: Props) {
  const t = useT();
  const create = paymentsApi.useCreate();
  const update = paymentsApi.useUpdate();

  const form = useForm<PaymentHeaderValues>({
    resolver: zodResolver(headerSchema),
    defaultValues: payment
      ? { partnerId: payment.partnerId, date: payment.date.slice(0, 10), cashAccountId: payment.cashAccountId, description: payment.description ?? '' }
      : { partnerId: '', date: '', cashAccountId: '', description: '' },
  });

  const partnerId = form.watch('partnerId');
  const openInvoices = useOpenInvoices(partnerId);

  // allocations: invoiceId -> amount string. Seed from an existing payment's allocations on edit.
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    payment?.allocations.forEach((a) => { if (a.salesInvoiceId) seed[a.salesInvoiceId] = a.amount; });
    return seed;
  });
  const [allocError, setAllocError] = useState<string | null>(null);

  function buildAllocations() {
    return Object.entries(amounts)
      .filter(([, v]) => { try { return Money.from(v || '0').gt(Money.zero()); } catch { return false; } })
      .map(([salesInvoiceId, amount]) => ({ salesInvoiceId, amount: Money.from(amount).toApi() }));
  }

  function validateAllocations(): boolean {
    const allocs = buildAllocations();
    if (allocs.length === 0) { setAllocError(t.payments.atLeastOneAllocation); return false; }
    const over = openInvoices.some((inv) => {
      const v = amounts[inv.id];
      try { return v ? Money.from(v).gt(Money.from(inv.outstanding)) : false; } catch { return false; }
    });
    if (over) { setAllocError(t.payments.overAllocated); return false; }
    setAllocError(null);
    return true;
  }

  function onSubmit(values: PaymentHeaderValues) {
    if (!validateAllocations()) return;
    const payload = { direction: 'RECEIPT' as const, partnerId: values.partnerId, date: values.date, cashAccountId: values.cashAccountId, description: values.description || undefined, allocations: buildAllocations() };
    const onError = (err: unknown) => applyApiErrorToForm(err, form, t);
    if (mode === 'edit' && payment) {
      update.mutate({ id: payment.id, data: payload }, { onSuccess: () => { toast.success(t.crud.saved); onSaved(); }, onError });
    } else {
      create.mutate(payload, { onSuccess: () => { toast.success(t.crud.saved); onSaved(); }, onError });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {readOnly ? (
        <div className="rounded-md border border-muted bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {payment?.status === 'VOID' ? t.payments.readOnlyVoid : t.payments.readOnlyPosted}
          {payment?.paymentRef ? ` (${payment.paymentRef})` : ''}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>{t.payments.partner}</Label>
          <PartnerSelect value={form.watch('partnerId')} onChange={(id) => form.setValue('partnerId', id, { shouldValidate: true })} filter="customer" aria-label={t.payments.partner} placeholder={t.payments.partner} disabled={readOnly} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pdate">{t.payments.date}</Label>
          <Input id="pdate" type="date" aria-label={t.payments.date} disabled={readOnly} {...form.register('date')} />
        </div>
        <div className="space-y-1.5">
          <Label>{t.payments.cashAccount}</Label>
          <AccountSelect value={form.watch('cashAccountId')} onChange={(id) => form.setValue('cashAccountId', id, { shouldValidate: true })} aria-label={t.payments.cashAccount} placeholder={t.payments.selectCashAccount} disabled={readOnly} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pdesc">{t.payments.description}</Label>
          <Input id="pdesc" aria-label={t.payments.description} disabled={readOnly} {...form.register('description')} />
        </div>
      </div>

      <AllocationTable
        invoices={openInvoices}
        amounts={amounts}
        onAmountChange={(id, raw) => setAmounts((prev) => ({ ...prev, [id]: raw }))}
        readOnly={readOnly}
        partnerSelected={!!partnerId}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          {allocError ? <p role="alert" className="text-sm text-destructive">{allocError}</p> : null}
          {form.formState.errors.partnerId ? <p role="alert" className="text-sm text-destructive">{t.salesInvoices.selectPartner}</p> : null}
          {form.formState.errors.cashAccountId ? <p role="alert" className="text-sm text-destructive">{t.payments.selectCashAccount}</p> : null}
          {form.formState.errors.date ? <p role="alert" className="text-sm text-destructive">{t.salesInvoices.required}</p> : null}
          {form.formState.errors.root ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p> : null}
        </div>
        <PaymentTotals amounts={amounts} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSaved}>{t.common.cancel}</Button>
        {readOnly ? null : <Button type="submit" disabled={create.isPending || update.isPending}>{t.payments.savePayment}</Button>}
      </div>
    </form>
  );
}
```
> Header validation messages reuse the existing `salesInvoices.selectPartner`/`required` keys for partner/date; the allocation errors use the new `payments.*` keys.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/features/payments/PaymentForm.test.tsx`
Expected: PASS (2 tests).
> The customer `PartnerSelect` (aria-label "Pelanggan") and cash `AccountSelect` (aria-label "Akun Kas") are distinct comboboxes by name — target each via `getByRole('combobox', { name })`. Radix shims + `pointerEventsCheck:0` already configured.

- [ ] **Step 5: Commit**

```bash
git add src/features/payments/PaymentForm.tsx src/features/payments/PaymentForm.test.tsx
git commit -m "feat: PaymentForm with controlled allocation + validation"
```

---

## Task 7: `PaymentEditorPage` + routes

**Files:**
- Create: `src/features/payments/PaymentEditorPage.tsx`, `src/app/routes/_app/payments.tsx`, `src/app/routes/_app/payments.index.tsx`, `src/app/routes/_app/payments.new.tsx`, `src/app/routes/_app/payments.$id.edit.tsx`
- Note: `src/app/routes/_app/payments.tsx` already exists as a placeholder leaf — convert it to a layout.

- [ ] **Step 1: Editor page**

Create `src/features/payments/PaymentEditorPage.tsx`:
```tsx
import { useNavigate } from '@tanstack/react-router';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/useT';
import { PaymentForm } from './PaymentForm';
import { paymentsApi } from './hooks';

export function PaymentEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/payments' });
  const item = paymentsApi.useItem(id ?? '');

  if (!id) {
    return <div><PageHeader title={t.payments.newPayment} /><PaymentForm mode="create" onSaved={goList} /></div>;
  }
  if (item.isLoading) return <Skeleton className="h-96 w-full" />;
  if (item.isError || !item.data) return <ErrorState error={item.error} />;
  const readOnly = item.data.status !== 'DRAFT';
  return (
    <div>
      <PageHeader title={readOnly ? t.payments.view : t.payments.editPayment} />
      <PaymentForm mode="edit" payment={item.data} onSaved={goList} readOnly={readOnly} />
    </div>
  );
}
```

- [ ] **Step 2: Convert the route to a layout + add index/new/edit**

Replace `src/app/routes/_app/payments.tsx`:
```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';
export const Route = createFileRoute('/_app/payments')({ component: () => <Outlet /> });
```
Create `src/app/routes/_app/payments.index.tsx` (placeholder; replaced by the list in Task 9):
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { useT } from '@/lib/i18n/useT';
export const Route = createFileRoute('/_app/payments/')({
  component: function PaymentsIndex() { return <PageHeader title={useT().payments.title} />; },
});
```
Create `src/app/routes/_app/payments.new.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PaymentEditorPage } from '@/features/payments/PaymentEditorPage';
export const Route = createFileRoute('/_app/payments/new')({
  component: function NewPaymentRoute() { return <PaymentEditorPage />; },
});
```
Create `src/app/routes/_app/payments.$id.edit.tsx`:
```tsx
import { createFileRoute, useParams } from '@tanstack/react-router';
import { PaymentEditorPage } from '@/features/payments/PaymentEditorPage';
export const Route = createFileRoute('/_app/payments/$id/edit')({
  component: function EditPaymentRoute() {
    const { id } = useParams({ from: '/_app/payments/$id/edit' });
    return <PaymentEditorPage id={id} />;
  },
});
```

- [ ] **Step 3: Verify build + dev serve**

Run: `pnpm build` then non-interactively confirm:
```bash
pnpm dev --port 5175 >/tmp/v.log 2>&1 & P=$!; sleep 4
curl -sf http://localhost:5175/payments/new | grep -q 'id="root"' && echo "NEW OK"
curl -sf http://localhost:5175/payments | grep -q 'id="root"' && echo "INDEX OK"; kill $P
```
Expected: build succeeds; NEW OK / INDEX OK.

- [ ] **Step 4: Commit**

```bash
git add src/features/payments/PaymentEditorPage.tsx src/app/routes/_app/payments.tsx src/app/routes/_app/payments.index.tsx src/app/routes/_app/payments.new.tsx src/app/routes/_app/payments.\$id.edit.tsx src/routeTree.gen.ts
git commit -m "feat: payment editor page + new/edit routes (payments layout + index)"
```

---

## Task 8: `PaymentsPage` list + columns (TDD)

**Files:**
- Create: `src/features/payments/columns.tsx`, `src/features/payments/PaymentsPage.tsx`, `src/features/payments/PaymentsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/payments/PaymentsPage.test.tsx`:
```tsx
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { id as messages } from '@/lib/i18n/messages.id';
import { PaymentsPage } from './PaymentsPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => useSession.getState().clear());

const partners = [{ id: 'p1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }];
const accounts = [{ id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null }];
const draftPayment = { id: 'pay1', paymentNumber: null, paymentRef: null, direction: 'RECEIPT', partnerId: 'p1', date: '2026-06-16T00:00:00.000Z', cashAccountId: 'a1', description: 'x', status: 'DRAFT', total: '1110000.0000', allocations: [{ salesInvoiceId: 'i1', amount: '1110000.0000' }] };

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute();
  const index = createRoute({ getParentRoute: () => root, path: '/', component: () => <PaymentsPage /> });
  const newR = createRoute({ getParentRoute: () => root, path: '/payments/new', component: () => null });
  const editR = createRoute({ getParentRoute: () => root, path: '/payments/$id/edit', component: () => null });
  const router = createRouter({ routeTree: root.addChildren([index, newR, editR]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  return render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
}

it('lists payments with partner + cash-account joins; ACCOUNTANT no Posting', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/payments`, () => HttpResponse.json([draftPayment])),
    http.get(`${API}/partners`, () => HttpResponse.json(partners)),
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
  );
  renderPage();
  expect(await screen.findByText('Toko A')).toBeInTheDocument();
  expect(screen.getByText(/1-1000.*Kas|Kas/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Posting' })).not.toBeInTheDocument();
});

it('APPROVER posts a draft payment with an idempotency key', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  let seenKey: string | null = null;
  server.use(
    http.get(`${API}/payments`, () => HttpResponse.json([draftPayment])),
    http.get(`${API}/partners`, () => HttpResponse.json(partners)),
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
    http.post(`${API}/payments/pay1/post`, ({ request }) => { seenKey = request.headers.get('Idempotency-Key'); return HttpResponse.json({ ...draftPayment, status: 'POSTED', paymentNumber: 1, paymentRef: 'PAY/2026/000001' }); }),
  );
  renderPage();
  await screen.findByText('Toko A');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(seenKey).toBeTruthy());
});

it('shows the SoD message when post returns 403 SEGREGATION_OF_DUTIES', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  server.use(
    http.get(`${API}/payments`, () => HttpResponse.json([draftPayment])),
    http.get(`${API}/partners`, () => HttpResponse.json(partners)),
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
    http.post(`${API}/payments/pay1/post`, () => HttpResponse.json({ code: 'SEGREGATION_OF_DUTIES', message: 'no self-approve' }, { status: 403 })),
  );
  renderPage();
  await screen.findByText('Toko A');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(messages.roles.segregationOfDuties));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/payments/PaymentsPage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create columns**

Create `src/features/payments/columns.tsx`:
```tsx
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/common/MoneyText';
import { RoleGate } from '@/components/common/RoleGate';
import { Money } from '@/lib/money/money';
import { formatDateID } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import type { Payment } from './schema';

const col = createColumnHelper<Payment>();

function statusLabel(t: Messages, s: string): string {
  if (s === 'DRAFT') return t.payments.statusDraft;
  if (s === 'POSTED') return t.payments.statusPosted;
  return t.payments.statusVoid;
}

/** Payment total = sum of allocation amounts (decimal). */
export function paymentTotal(p: Payment): string {
  return p.allocations.reduce((acc, a) => acc.plus(Money.from(a.amount)), Money.zero()).toApi();
}

export function buildPaymentColumns(
  t: Messages,
  partnerName: (id: string) => string,
  accountName: (id: string) => string,
  handlers: { onDelete: (p: Payment) => void; onPost: (p: Payment) => void; onVoid: (p: Payment) => void },
) {
  return [
    col.accessor('paymentRef', { header: t.payments.number, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('partnerId', { header: t.payments.partner, cell: (c) => partnerName(c.getValue()) }),
    col.accessor('date', { header: t.payments.date, cell: (c) => formatDateID(c.getValue().slice(0, 10)) }),
    col.accessor('cashAccountId', { header: t.payments.cashAccount, cell: (c) => accountName(c.getValue()) }),
    col.display({ id: 'total', header: t.payments.totalReceived, cell: (c) => <MoneyText value={paymentTotal(c.row.original)} /> }),
    col.accessor('status', { header: t.payments.status, cell: (c) => <Badge variant={c.getValue() === 'DRAFT' ? 'secondary' : 'default'}>{statusLabel(t, c.getValue())}</Badge> }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => {
        const p = c.row.original;
        return (
          <div className="flex justify-end gap-1">
            {p.status === 'DRAFT' ? (
              <>
                <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
                  <Button asChild variant="ghost" size="sm"><Link to="/payments/$id/edit" params={{ id: p.id }}>{t.common.edit}</Link></Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onDelete(p)}>{t.common.delete}</Button>
                </RoleGate>
                <RoleGate allow={['APPROVER', 'ADMIN']}>
                  <Button variant="ghost" size="sm" onClick={() => handlers.onPost(p)}>{t.payments.post}</Button>
                </RoleGate>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/payments/$id/edit" params={{ id: p.id }}>{t.payments.view}</Link></Button>
                {p.status === 'POSTED' ? (
                  <RoleGate allow={['APPROVER', 'ADMIN']}>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onVoid(p)}>{t.payments.void}</Button>
                  </RoleGate>
                ) : null}
              </>
            )}
          </div>
        );
      },
    }),
  ];
}
```

- [ ] **Step 4: Create the page**

Create `src/features/payments/PaymentsPage.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { RoleGate } from '@/components/common/RoleGate';
import { useT } from '@/lib/i18n/useT';
import { toastApiError } from '@/lib/api/toastApiError';
import { partnersApi } from '@/features/partners/hooks';
import { accountsApi } from '@/features/accounts/hooks';
import { buildPaymentColumns } from './columns';
import { paymentsApi, usePostPayment, useVoidPayment } from './hooks';
import type { Payment } from './schema';

const STATUSES = ['ALL', 'DRAFT', 'POSTED', 'VOID'] as const;
type PendingAction = { kind: 'delete' | 'post' | 'void'; payment: Payment; idempotencyKey?: string };

export function PaymentsPage() {
  const t = useT();
  const list = paymentsApi.useList();
  const partners = partnersApi.useList();
  const accounts = accountsApi.useList();
  const remove = paymentsApi.useRemove();
  const post = usePostPayment();
  const voidPayment = useVoidPayment();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [action, setAction] = useState<PendingAction | null>(null);

  const partnerName = useMemo(() => {
    const map = new Map((partners.data ?? []).map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id;
  }, [partners.data]);
  const accountName = useMemo(() => {
    const map = new Map((accounts.data ?? []).map((a) => [a.id, `${a.code} — ${a.name}`]));
    return (id: string) => map.get(id) ?? id;
  }, [accounts.data]);

  const columns = useMemo(
    () => buildPaymentColumns(t, partnerName, accountName, {
      onDelete: (p) => setAction({ kind: 'delete', payment: p }),
      onPost: (p) => setAction({ kind: 'post', payment: p, idempotencyKey: crypto.randomUUID() }),
      onVoid: (p) => setAction({ kind: 'void', payment: p, idempotencyKey: crypto.randomUUID() }),
    }),
    [t, partnerName, accountName],
  );

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (list.data ?? []).filter((p) => {
      if (status !== 'ALL' && p.status !== status && !(status === 'VOID' && p.status.startsWith('VOID'))) return false;
      return !q || (p.paymentRef ?? '').toLowerCase().includes(q) || partnerName(p.partnerId).toLowerCase().includes(q);
    });
  }, [list.data, search, status, partnerName]);

  function runAction() {
    if (!action) return;
    const close = () => setAction(null);
    if (action.kind === 'delete') {
      remove.mutate(action.payment.id, { onSuccess: () => { toast.success(t.crud.deleted); close(); }, onError: () => toast.error(t.common.error) });
    } else if (action.kind === 'post') {
      post.mutate({ id: action.payment.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.payments.posted); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    } else {
      voidPayment.mutate({ id: action.payment.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.payments.voided); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    }
  }

  const confirmCopy = {
    delete: { title: t.crud.confirmDeleteTitle, desc: t.crud.confirmDeleteDesc, label: t.common.delete },
    post: { title: t.payments.confirmPostTitle, desc: t.payments.confirmPostDesc, label: t.payments.post },
    void: { title: t.payments.confirmVoidTitle, desc: t.payments.confirmVoidDesc, label: t.payments.void },
  } as const;

  return (
    <div>
      <PageHeader title={t.payments.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button asChild><Link to="/payments/new"><Plus className="size-4" /> {t.payments.newPayment}</Link></Button>
        </RoleGate>
      } />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
              {s === 'ALL' ? t.payments.statusAll : s === 'DRAFT' ? t.payments.statusDraft : s === 'POSTED' ? t.payments.statusPosted : t.payments.statusVoid}
            </Button>
          ))}
        </div>
      </div>

      {list.isLoading ? <Skeleton className="h-40 w-full" />
        : list.isError ? <ErrorState error={list.error} />
        : <DataTable columns={columns} data={rows} />}

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => !o && setAction(null)}
        title={action ? confirmCopy[action.kind].title : ''}
        description={action ? confirmCopy[action.kind].desc : undefined}
        confirmLabel={action ? confirmCopy[action.kind].label : ''}
        destructive={action?.kind !== 'post'}
        pending={remove.isPending || post.isPending || voidPayment.isPending}
        onConfirm={runAction}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test src/features/payments/PaymentsPage.test.tsx`
Expected: PASS (3 tests).
> Note: the status-filter buttons "Diposting"/"Dibatalkan" match `/posting/i`/`/batalkan/i`; the tests use exact names (`{ name: 'Posting' }`) to target the row/dialog action buttons (same lesson as the invoices list).

- [ ] **Step 6: Commit**

```bash
git add src/features/payments/columns.tsx src/features/payments/PaymentsPage.tsx src/features/payments/PaymentsPage.test.tsx
git commit -m "feat: payments list with status filter, joins, and post/void/delete actions"
```

---

## Task 9: Wire list route + full verification

**Files:**
- Modify: `src/app/routes/_app/payments.index.tsx`

- [ ] **Step 1: Render the list**

Replace `src/app/routes/_app/payments.index.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PaymentsPage } from '@/features/payments/PaymentsPage';
export const Route = createFileRoute('/_app/payments/')({ component: PaymentsPage });
```

- [ ] **Step 2: Full verification**

Run:
```bash
pnpm lint && pnpm test && pnpm build
```
Expected: lint 0 errors (benign react-compiler warnings OK); all tests pass; build succeeds.

- [ ] **Step 3: Manual smoke (optional, when the live API is up)**

`pnpm dev`, log in, open **Pembayaran**: "Pembayaran Baru" → pick a customer with posted invoices, allocate (Lunasi), Save; as APPROVER/ADMIN Posting/Batalkan (SoD message for self-post with a single user).

- [ ] **Step 4: Commit**

```bash
git add src/app/routes/_app/payments.index.tsx
git commit -m "feat: wire Payments list route"
```

---

## Done criteria for Plan 4a

- `/payments` lists receipts (status badge, partner + cash-account joins, status filter); ACCOUNTANT+ sees "Pembayaran Baru".
- `/payments/new` + `/payments/:id/edit` open the full-page editor: header (PartnerSelect customer, date, cash AccountSelect, description) + allocation table over the partner's open invoices (manual amount + "Lunasi", ≤ outstanding) + Total Diterima = sum.
- Create/edit/delete drafts; APPROVER/ADMIN post (idempotent, SoD-distinct via toastApiError) + void; posted/void open read-only; payment total computed from allocations (decimal).
- `Payment` schema verified against the live API (Task 1 reconciliation when the API is up) or shipped tolerant.
- `pnpm lint && pnpm test && pnpm build` green. (Dashboard is Plan 4b.)
```

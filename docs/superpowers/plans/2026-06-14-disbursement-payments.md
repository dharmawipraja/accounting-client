# Disbursement Payments (Plan 5b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the RECEIPT-only payments feature by a `direction` parameter so users can also pay vendors (`DISBURSEMENT`) by allocating cash across a vendor's open purchase bills.

**Architecture:** No new schema/lifecycle — the existing `paymentSchema` already models both directions. Generalize four surfaces: `useOpenInvoices`→`useOpenDocuments` (invoices for RECEIPT, bills for DISBURSEMENT, mapped to a neutral `OpenDocument`), `AllocationTable` (typed to `OpenDocument`), `PaymentForm` (a `direction` prop switching partner filter / source / allocation key / payload), and the list (direction badge + filter + two create buttons via a `?direction=` search param).

**Tech Stack:** React 19 + React Compiler, TanStack Router (file-based) + Query v5 + Table v8, React Hook Form + Zod v4, shadcn/ui, decimal.js `Money`, Vitest 4 + RTL + MSW v2.

**Reference spec:** `docs/superpowers/specs/2026-06-14-disbursement-payments-design.md`

---

## Ordering note

The two create buttons use typed `<Link to="/payments/new" search={{ direction }}>`. That only type-checks once `payments.new.tsx` declares `validateSearch` (Task 6). So **the full `tsc` build is deferred to Task 6**; the list task (Task 5) is verified with `pnpm test --run <file>` only (Vitest transpiles without type-checking). Tasks that touch no routes (1–4) build normally.

## File Structure

```
src/features/payments/
  useOpenDocuments.ts / .test.tsx   # NEW (Task 3) — replaces useOpenInvoices
  useOpenInvoices.ts / .test.tsx    # DELETED (Task 4)
  AllocationTable.tsx               # generalized to OpenDocument[] (Task 4)
  PaymentForm.tsx / .test.tsx       # direction-parameterized (Task 4)
  PaymentTotals.tsx                 # neutral total label (Task 5)
  columns.tsx                       # +direction badge, neutral total header (Task 5)
  PaymentsPage.tsx / .test.tsx      # +direction filter + two create buttons (Task 5)
  PaymentEditorPage.tsx             # +direction prop (Task 6)
  schema.ts                         # generalized payload type (Task 2)
src/app/routes/_app/payments.new.tsx # +validateSearch direction (Task 6)
src/lib/i18n/messages.id.ts         # +direction/document i18n (Task 1)
```

**Reuse (do NOT recreate):** `createResourceHooks`/`useDocumentAction`, `PartnerSelect` (`filter="customer"|"vendor"`), `AccountSelect`, `MoneyText`/`Money`, `RoleGate`, `ConfirmDialog`, `DataTable`, `EmptyState`, `formatDateID`. The `paymentSchema`/`paymentAllocationSchema` are already general — DO NOT change them. MSW `API` = `http://localhost:4000`; payments + purchase-bills CRUD/post/void handlers already exist (`src/test/handlers.ts`).

---

### Task 1: i18n additions

**Files:**
- Modify: `src/lib/i18n/messages.id.ts`

- [ ] **Step 1: Add keys to the `payments` group**

In `src/lib/i18n/messages.id.ts`, add these keys inside the existing `payments` group (keep all current keys; `export type Messages = typeof id;` stays intact):

```ts
    directionReceipt: 'Terima',
    directionDisbursement: 'Bayar',
    direction: 'Jenis',
    directionAll: 'Semua',
    newReceiptTitle: 'Terima Pembayaran',
    newDisbursementTitle: 'Bayar Tagihan',
    documentRef: 'Dokumen',
    noOpenDocuments: 'Tidak ada dokumen terbuka',
    amount: 'Jumlah',
    partnerVendor: 'Vendor',
```

- [ ] **Step 2: Verify** — Run: `pnpm build` (expected: succeeds, no TS errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat(payments): i18n for payment direction + open documents"
```

---

### Task 2: Generalized payload type

**Files:**
- Modify: `src/features/payments/schema.ts`

- [ ] **Step 1: Generalize `PaymentCreatePayload`**

In `src/features/payments/schema.ts`, replace the `PaymentCreatePayload` type (leave `paymentSchema`, `paymentAllocationSchema`, `Payment`, `PaymentUpdatePayload`, `PaymentHeaderValues` as they are) with:

```ts
export type PaymentAllocationInput = { salesInvoiceId?: string; purchaseBillId?: string; amount: string };
export type PaymentCreatePayload = {
  direction: 'RECEIPT' | 'DISBURSEMENT';
  partnerId: string;
  date: string;
  cashAccountId: string;
  description?: string;
  allocations: PaymentAllocationInput[];
};
```

(`PaymentUpdatePayload = Partial<PaymentCreatePayload>` is unchanged and now generalizes automatically.)

- [ ] **Step 2: Verify** — Run: `pnpm build`
Expected: succeeds — the existing `PaymentForm` builds `{ direction: 'RECEIPT' as const, … }` which still satisfies the widened type.

- [ ] **Step 3: Commit**

```bash
git add src/features/payments/schema.ts
git commit -m "feat(payments): generalize create payload to both directions"
```

---

### Task 3: `useOpenDocuments`

**Files:**
- Create: `src/features/payments/useOpenDocuments.ts`
- Test: `src/features/payments/useOpenDocuments.test.tsx`

(Leave `useOpenInvoices.ts` in place for now — it is removed in Task 4 once `PaymentForm` stops importing it.)

- [ ] **Step 1: Write the failing test** — create `src/features/payments/useOpenDocuments.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useOpenDocuments } from './useOpenDocuments';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const invoice = (over: Record<string, unknown>) => ({
  id: 'x', invoiceNumber: 1, invoiceRef: 'INV/1', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z',
  dueDate: null, description: null, status: 'POSTED', subtotal: '0.0000', taxTotal: '0.0000',
  withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000',
  paymentStatus: 'UNPAID', lines: [], ...over,
});
const bill = (over: Record<string, unknown>) => ({
  id: 'y', billNumber: 1, billRef: 'BILL/1', partnerId: 'v1', date: '2026-06-15T00:00:00.000Z',
  dueDate: null, description: null, status: 'POSTED', subtotal: '0.0000', taxTotal: '0.0000',
  withholdingTotal: '0.0000', total: '1000000.0000', amountPaid: '0.0000', outstanding: '1000000.0000',
  paymentStatus: 'UNPAID', lines: [], ...over,
});

it('RECEIPT → open POSTED invoices for the partner, mapped', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([
      invoice({ id: 'open', partnerId: 'p1' }),
      invoice({ id: 'draft', partnerId: 'p1', status: 'DRAFT' }),
      invoice({ id: 'paid', partnerId: 'p1', outstanding: '0.0000' }),
      invoice({ id: 'other', partnerId: 'p2' }),
    ])),
    http.get(`${API}/purchase-bills`, () => HttpResponse.json([])),
  );
  const { result } = renderHook(() => useOpenDocuments('RECEIPT', 'p1'), { wrapper });
  await waitFor(() => expect(result.current.map((d) => d.id)).toEqual(['open']));
  expect(result.current[0]).toMatchObject({ ref: 'INV/1', outstanding: '1110000.0000' });
});

it('DISBURSEMENT → open POSTED bills for the partner, mapped', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([])),
    http.get(`${API}/purchase-bills`, () => HttpResponse.json([
      bill({ id: 'openb', partnerId: 'v1' }),
      bill({ id: 'draftb', partnerId: 'v1', status: 'DRAFT' }),
      bill({ id: 'paidb', partnerId: 'v1', outstanding: '0.0000' }),
      bill({ id: 'otherb', partnerId: 'v2' }),
    ])),
  );
  const { result } = renderHook(() => useOpenDocuments('DISBURSEMENT', 'v1'), { wrapper });
  await waitFor(() => expect(result.current.map((d) => d.id)).toEqual(['openb']));
  expect(result.current[0]).toMatchObject({ ref: 'BILL/1', outstanding: '1000000.0000' });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/payments/useOpenDocuments.test.tsx` (FAIL: cannot resolve `./useOpenDocuments`).

- [ ] **Step 3: Write the implementation** — create `src/features/payments/useOpenDocuments.ts`:

```ts
import { useMemo } from 'react';
import { Money } from '@/lib/money/money';
import { salesInvoicesApi } from '@/features/sales-invoices/hooks';
import type { SalesInvoice } from '@/features/sales-invoices/schema';
import { purchaseBillsApi } from '@/features/purchase-bills/hooks';
import type { PurchaseBill } from '@/features/purchase-bills/schema';

export interface OpenDocument {
  id: string;
  ref: string | null;
  dueDate: string | null;
  outstanding: string;
}

function isOpen(r: { status: string; outstanding: string; partnerId: string }, partnerId?: string): boolean {
  return r.status === 'POSTED' && Money.from(r.outstanding).gt(Money.zero()) && (!partnerId || r.partnerId === partnerId);
}

const toInvoiceDoc = (inv: SalesInvoice): OpenDocument => ({ id: inv.id, ref: inv.invoiceRef ?? null, dueDate: inv.dueDate ?? null, outstanding: inv.outstanding });
const toBillDoc = (bill: PurchaseBill): OpenDocument => ({ id: bill.id, ref: bill.billRef ?? null, dueDate: bill.dueDate ?? null, outstanding: bill.outstanding });

/** Open documents to allocate a payment against:
 *  RECEIPT → POSTED sales invoices; DISBURSEMENT → POSTED purchase bills.
 *  Filtered to outstanding>0 (+ partner if given), sorted by date. */
export function useOpenDocuments(direction: 'RECEIPT' | 'DISBURSEMENT', partnerId?: string): OpenDocument[] {
  const invoices = salesInvoicesApi.useList();
  const bills = purchaseBillsApi.useList();
  return useMemo(() => {
    if (direction === 'RECEIPT') {
      return (invoices.data ?? []).filter((r) => isOpen(r, partnerId)).sort((a, b) => a.date.localeCompare(b.date)).map(toInvoiceDoc);
    }
    return (bills.data ?? []).filter((r) => isOpen(r, partnerId)).sort((a, b) => a.date.localeCompare(b.date)).map(toBillDoc);
  }, [direction, partnerId, invoices.data, bills.data]);
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/payments/useOpenDocuments.test.tsx` (PASS, 2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/payments/useOpenDocuments.ts src/features/payments/useOpenDocuments.test.tsx
git commit -m "feat(payments): useOpenDocuments (invoices for RECEIPT, bills for DISBURSEMENT)"
```

---

### Task 4: Generalize the editor — `AllocationTable` + `PaymentForm`

**Files:**
- Modify: `src/features/payments/AllocationTable.tsx`, `src/features/payments/PaymentForm.tsx`
- Modify: `src/features/payments/PaymentForm.test.tsx` (add a DISBURSEMENT test)
- Delete: `src/features/payments/useOpenInvoices.ts`, `src/features/payments/useOpenInvoices.test.tsx`

- [ ] **Step 1: Add the failing DISBURSEMENT test**

In `src/features/payments/PaymentForm.test.tsx`, add this test (keep all existing tests as-is):

```tsx
it('allocates via Lunasi and posts the DISBURSEMENT payload', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  const vendor = [{ id: 'v1', code: 'VEND-1', name: 'PT Pemasok', isCustomer: false, isVendor: true, isActive: true }];
  const openBill = { id: 'b1', billNumber: 1, billRef: 'BILL/2026/000001', fiscalYear: 2026, vendorInvoiceNo: null, partnerId: 'v1', date: '2026-06-15T00:00:00.000Z', dueDate: '2026-07-15T00:00:00.000Z', description: null, status: 'POSTED', subtotal: '1000000.0000', taxTotal: '0.0000', withholdingTotal: '0.0000', total: '1000000.0000', amountPaid: '0.0000', outstanding: '1000000.0000', paymentStatus: 'UNPAID', lines: [] };
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
    http.get(`${API}/partners`, () => HttpResponse.json(vendor)),
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([])),
    http.get(`${API}/purchase-bills`, () => HttpResponse.json([openBill])),
  );
  let posted: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/payments`, async ({ request }) => {
    posted = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'pay9', number: null, ref: null, fiscalYear: null, direction: 'DISBURSEMENT', partnerId: 'v1', date: '2026-06-16T00:00:00.000Z', cashAccountId: 'a1', description: null, status: 'DRAFT', amount: '1000000.0000', allocations: [{ purchaseBillId: 'b1', amount: '1000000.0000' }] });
  }));
  const onSaved = vi.fn();
  renderForm(<PaymentForm mode="create" direction="DISBURSEMENT" onSaved={onSaved} />);

  await user.click(screen.getByRole('combobox', { name: /vendor/i }));
  await user.click(await screen.findByRole('option', { name: /VEND-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-16');
  await user.click(screen.getByRole('combobox', { name: /akun kas/i }));
  await user.click(await screen.findByRole('option', { name: /1-1000/i }));
  await user.click(await screen.findByRole('button', { name: /lunasi/i }));
  await user.click(screen.getByRole('button', { name: /simpan/i }));

  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ direction: 'DISBURSEMENT', partnerId: 'v1', cashAccountId: 'a1', allocations: [{ purchaseBillId: 'b1', amount: '1000000.0000' }] });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});
```

- [ ] **Step 2: Run it to verify it fails** — `pnpm test --run src/features/payments/PaymentForm.test.tsx` (FAIL: `PaymentForm` has no `direction` prop / vendor combobox not found).

- [ ] **Step 3: Generalize `AllocationTable.tsx`** — replace the whole file with:

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';
import { MoneyText } from '@/components/common/MoneyText';
import { Money } from '@/lib/money/money';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import type { OpenDocument } from './useOpenDocuments';

interface Props {
  documents: OpenDocument[];
  amounts: Record<string, string>;
  onAmountChange: (documentId: string, raw: string) => void;
  readOnly?: boolean;
  partnerSelected: boolean;
}

export function AllocationTable({ documents, amounts, onAmountChange, readOnly, partnerSelected }: Props) {
  const t = useT();
  if (!partnerSelected) return <p className="text-sm text-muted-foreground">{t.payments.selectPartnerFirst}</p>;
  if (documents.length === 0) return <EmptyState message={t.payments.noOpenDocuments} />;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.payments.documentRef}</TableHead>
            <TableHead>{t.payments.dueDate}</TableHead>
            <TableHead className="text-right">{t.payments.outstanding}</TableHead>
            <TableHead className="text-right">{t.payments.allocation}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const over = (() => {
              try { return Money.from(amounts[doc.id] || '0').gt(Money.from(doc.outstanding)); } catch { return false; }
            })();
            return (
              <TableRow key={doc.id}>
                <TableCell>{doc.ref ?? '—'}</TableCell>
                <TableCell>{doc.dueDate ? formatDateID(doc.dueDate.slice(0, 10)) : '—'}</TableCell>
                <TableCell className="text-right"><MoneyText value={doc.outstanding} /></TableCell>
                <TableCell className="w-40">
                  <Input
                    className="text-right font-mono tabular-nums"
                    inputMode="decimal"
                    aria-label={`${t.payments.allocation} ${doc.ref ?? doc.id}`}
                    value={amounts[doc.id] ?? ''}
                    disabled={readOnly}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (next === '' || /^\d*\.?\d{0,4}$/.test(next)) onAmountChange(doc.id, next);
                    }}
                  />
                  {over ? <p role="alert" className="text-xs text-destructive">{t.payments.overAllocated}</p> : null}
                </TableCell>
                <TableCell>
                  {readOnly ? null : (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onAmountChange(doc.id, Money.from(doc.outstanding).toApi())}>
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

- [ ] **Step 4: Generalize `PaymentForm.tsx`** — apply these changes:

Replace the import `import { useOpenInvoices } from './useOpenInvoices';` with `import { useOpenDocuments } from './useOpenDocuments';`.

Add `direction` to the props and derive the effective direction:

```tsx
interface Props {
  mode: 'create' | 'edit';
  payment?: Payment;
  onSaved: () => void;
  readOnly?: boolean;
  direction?: 'RECEIPT' | 'DISBURSEMENT';
}

export function PaymentForm({ mode, payment, onSaved, readOnly, direction: directionProp = 'RECEIPT' }: Props) {
  const t = useT();
  const direction = payment?.direction ?? directionProp;
  const create = paymentsApi.useCreate();
  const update = paymentsApi.useUpdate();
```

Replace `const openInvoices = useOpenInvoices(partnerId);` with:

```tsx
  const openDocuments = useOpenDocuments(direction, partnerId);
```

Replace the `amounts` seed so it reads the right allocation key:

```tsx
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    payment?.allocations.forEach((a) => {
      const docId = direction === 'RECEIPT' ? a.salesInvoiceId : a.purchaseBillId;
      if (docId) seed[docId] = a.amount;
    });
    return seed;
  });
```

Replace `buildAllocations` to key by direction:

```tsx
  function buildAllocations() {
    return Object.entries(amounts)
      .filter(([, v]) => { try { return Money.from(v || '0').gt(Money.zero()); } catch { return false; } })
      .map(([id, amount]) => direction === 'RECEIPT'
        ? { salesInvoiceId: id, amount: Money.from(amount).toApi() }
        : { purchaseBillId: id, amount: Money.from(amount).toApi() });
  }
```

Replace the over-allocation check in `validateAllocations` to use `openDocuments`:

```tsx
    const over = openDocuments.some((doc) => {
      const v = amounts[doc.id];
      try { return v ? Money.from(v).gt(Money.from(doc.outstanding)) : false; } catch { return false; }
    });
```

Replace the payload's hardcoded direction in `onSubmit`:

```tsx
    const payload = { direction, partnerId: values.partnerId, date: values.date, cashAccountId: values.cashAccountId, description: values.description || undefined, allocations: buildAllocations() };
```

Make the partner field direction-aware (a `const` above the `return`, then use it in the `PartnerSelect`):

```tsx
  const partnerLabel = direction === 'RECEIPT' ? t.payments.partner : t.payments.partnerVendor;
```

```tsx
          <Label>{partnerLabel}</Label>
          <PartnerSelect value={form.watch('partnerId')} onChange={(id) => form.setValue('partnerId', id, { shouldValidate: true })} filter={direction === 'RECEIPT' ? 'customer' : 'vendor'} aria-label={partnerLabel} placeholder={partnerLabel} disabled={readOnly} />
```

Pass documents to `AllocationTable`:

```tsx
      <AllocationTable
        documents={openDocuments}
        amounts={amounts}
        onAmountChange={(id, raw) => setAmounts((prev) => ({ ...prev, [id]: raw }))}
        readOnly={readOnly}
        partnerSelected={!!partnerId}
      />
```

- [ ] **Step 5: Delete the superseded `useOpenInvoices`**

```bash
git rm src/features/payments/useOpenInvoices.ts src/features/payments/useOpenInvoices.test.tsx
```

Confirm nothing else imports it: `grep -rn "useOpenInvoices" src` → expect no matches.

- [ ] **Step 6: Run the payments editor tests** — `pnpm test --run src/features/payments/PaymentForm.test.tsx src/features/payments/useOpenDocuments.test.tsx`
Expected: PASS — the 4 existing `PaymentForm` tests (RECEIPT defaults) + the new DISBURSEMENT test + the 2 `useOpenDocuments` tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(payments): direction-parameterized PaymentForm + AllocationTable on OpenDocument"
```

---

### Task 5: List — direction column, filter, two create buttons

**Files:**
- Modify: `src/features/payments/columns.tsx`, `src/features/payments/PaymentTotals.tsx`, `src/features/payments/PaymentsPage.tsx`
- Modify: `src/features/payments/PaymentsPage.test.tsx` (add a direction-filter test)

> Verify this task with `pnpm test --run` only (NOT `pnpm build`) — the create-button `<Link search={{direction}}>` needs the `validateSearch` added in Task 6 to type-check.

- [ ] **Step 1: Add the failing direction-filter test**

In `src/features/payments/PaymentsPage.test.tsx`, add this test (keep the existing tests):

```tsx
it('filters by direction and shows both create buttons', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  const disb = { ...draftPayment, id: 'pay2', direction: 'DISBURSEMENT', partnerId: 'v1', ref: 'PAY-DSB/2026/000001', allocations: [{ purchaseBillId: 'b1', amount: '1000000.0000' }] };
  server.use(
    http.get(`${API}/payments`, () => HttpResponse.json([draftPayment, disb])),
    http.get(`${API}/partners`, () => HttpResponse.json([...partners, { id: 'v1', code: 'VEND-1', name: 'PT Pemasok', isCustomer: false, isVendor: true, isActive: true }])),
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
  );
  renderPage();
  expect(await screen.findByText('Toko A')).toBeInTheDocument();        // receipt row
  expect(screen.getByText('PT Pemasok')).toBeInTheDocument();          // disbursement row
  // two gated create buttons (rendered as links via Button asChild)
  expect(screen.getByRole('link', { name: /terima/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /bayar/i })).toBeInTheDocument();
  // filter to disbursements only (the filter is a <button>, distinct from the create <a>)
  await user.click(screen.getByRole('button', { name: 'Bayar' }));
  await waitFor(() => expect(screen.queryByText('Toko A')).not.toBeInTheDocument());
  expect(screen.getByText('PT Pemasok')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to verify it fails** — `pnpm test --run src/features/payments/PaymentsPage.test.tsx` (FAIL: no direction filter button / create links).

- [ ] **Step 3: Add the direction column to `columns.tsx`**

In `src/features/payments/columns.tsx`, add a direction-label helper next to `statusLabel`:

```ts
function directionLabel(t: Messages, d: string): string {
  return d === 'DISBURSEMENT' ? t.payments.directionDisbursement : t.payments.directionReceipt;
}
```

Then **replace** the existing `ref` → `total` column entries (the first five entries of the returned array) with these six — inserting the `direction` column after `ref` and changing the total header from `t.payments.totalReceived` to `t.payments.amount` (the `status` and `actions` columns below them stay unchanged):

```tsx
    col.accessor('ref', { header: t.payments.number, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('direction', { header: t.payments.direction, cell: (c) => <Badge variant="outline">{directionLabel(t, c.getValue())}</Badge> }),
    col.accessor('partnerId', { header: t.payments.partner, cell: (c) => partnerName(c.getValue()) }),
    col.accessor('date', { header: t.payments.date, cell: (c) => formatDateID(c.getValue().slice(0, 10)) }),
    col.accessor('cashAccountId', { header: t.payments.cashAccount, cell: (c) => accountName(c.getValue()) }),
    col.display({ id: 'total', header: t.payments.amount, cell: (c) => <MoneyText value={paymentTotal(c.row.original)} /> }),
```

- [ ] **Step 4: Neutralize the totals label in `PaymentTotals.tsx`**

In `src/features/payments/PaymentTotals.tsx`, change the label `{t.payments.totalReceived}` to `{t.payments.amount}` (the only change).

- [ ] **Step 5: Add the direction filter + two create buttons to `PaymentsPage.tsx`**

Add the directions constant next to `STATUSES`:

```ts
const DIRECTIONS = ['ALL', 'RECEIPT', 'DISBURSEMENT'] as const;
```

Add direction state next to the `status` state:

```tsx
  const [direction, setDirection] = useState<(typeof DIRECTIONS)[number]>('ALL');
```

Extend the `rows` filter to also filter by direction (add the direction guard; include `direction` in the deps):

```tsx
  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (list.data ?? []).filter((p) => {
      if (status !== 'ALL' && p.status !== status && !(status === 'VOID' && p.status.startsWith('VOID'))) return false;
      if (direction !== 'ALL' && p.direction !== direction) return false;
      return !q || (p.ref ?? '').toLowerCase().includes(q) || partnerName(p.partnerId).toLowerCase().includes(q);
    });
  }, [list.data, search, status, direction, partnerName]);
```

Replace the single-button `PageHeader` actions with two gated create buttons:

```tsx
      <PageHeader title={t.payments.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/payments/new" search={{ direction: 'RECEIPT' }}><Plus className="size-4" /> {t.payments.directionReceipt}</Link></Button>
            <Button asChild><Link to="/payments/new" search={{ direction: 'DISBURSEMENT' }}><Plus className="size-4" /> {t.payments.directionDisbursement}</Link></Button>
          </div>
        </RoleGate>
      } />
```

Add a direction filter row inside the existing filter `<div className="mb-4 flex flex-wrap gap-2">`, after the status-filter group:

```tsx
        <div className="flex gap-1">
          {DIRECTIONS.map((d) => (
            <Button key={d} size="sm" variant={direction === d ? 'default' : 'outline'} onClick={() => setDirection(d)}>
              {d === 'ALL' ? t.payments.directionAll : d === 'RECEIPT' ? t.payments.directionReceipt : t.payments.directionDisbursement}
            </Button>
          ))}
        </div>
```

- [ ] **Step 6: Run the list tests** — `pnpm test --run src/features/payments/PaymentsPage.test.tsx`
Expected: PASS — the new direction-filter test plus the existing list/post/void/SoD tests (unchanged; their button queries — `'Posting'`, `'Batalkan'` — don't collide with the `'Terima'`/`'Bayar'` filter labels).

- [ ] **Step 7: Commit**

```bash
git add src/features/payments/columns.tsx src/features/payments/PaymentTotals.tsx src/features/payments/PaymentsPage.tsx src/features/payments/PaymentsPage.test.tsx
git commit -m "feat(payments): list direction column + filter + two create buttons"
```

---

### Task 6: Routes + editor page + full verification

**Files:**
- Modify: `src/app/routes/_app/payments.new.tsx`, `src/features/payments/PaymentEditorPage.tsx`

- [ ] **Step 1: Add `validateSearch` + pass direction in `payments.new.tsx`**

Replace `src/app/routes/_app/payments.new.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PaymentEditorPage } from '@/features/payments/PaymentEditorPage';

type NewPaymentSearch = { direction: 'RECEIPT' | 'DISBURSEMENT' };

export const Route = createFileRoute('/_app/payments/new')({
  validateSearch: (search: Record<string, unknown>): NewPaymentSearch => ({
    direction: search.direction === 'DISBURSEMENT' ? 'DISBURSEMENT' : 'RECEIPT',
  }),
  component: function NewPaymentRoute() {
    const { direction } = Route.useSearch();
    return <PaymentEditorPage direction={direction} />;
  },
});
```

- [ ] **Step 2: Thread `direction` through `PaymentEditorPage.tsx`**

In `src/features/payments/PaymentEditorPage.tsx`, change the signature and the create branch (the edit branch is unchanged — `PaymentForm` derives direction from the loaded payment):

```tsx
export function PaymentEditorPage({ id, direction = 'RECEIPT' }: { id?: string; direction?: 'RECEIPT' | 'DISBURSEMENT' }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/payments' });
  const item = paymentsApi.useItem(id ?? '');

  if (!id) {
    const title = direction === 'DISBURSEMENT' ? t.payments.newDisbursementTitle : t.payments.newReceiptTitle;
    return <div><PageHeader title={title} /><PaymentForm mode="create" direction={direction} onSaved={goList} /></div>;
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

- [ ] **Step 3: Full verification**

Run: `pnpm test --run` — expect all green (~151: 148 prior + 3 net new — useOpenDocuments +2 / useOpenInvoices −1 / PaymentForm +1 / PaymentsPage +1).
Run: `pnpm lint` — expect 0 errors (pre-existing react-compiler `form.watch` warnings on form files are acceptable).
Run: `pnpm build` — expect success; `tsc` now accepts the typed `search={{direction}}` Links via the route's `validateSearch`.

> `payments.new.tsx` already exists in `src/routeTree.gen.ts`; adding `validateSearch` changes only the route's inferred search type (re-inferred by `tsc` through the existing import), so **no route-tree regeneration is needed**. If `tsc` unexpectedly complains the route's search is unknown, regenerate the tree by running `pnpm dev` briefly until `src/routeTree.gen.ts` is rewritten, then rebuild.

- [ ] **Step 4: Dev smoke (optional)**

`pnpm dev`, log in (creds in `.env`), open `/payments`; click **Bayar** → pick a vendor with an open POSTED bill → "Lunasi" → save the draft; as APPROVER post it and confirm it goes read-only with a `PAY-DSB/...` ref and the bill becomes PAID. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/app/routes/_app/payments.new.tsx src/features/payments/PaymentEditorPage.tsx
git commit -m "feat(payments): /payments/new?direction= search param + editor wiring"
```

---

## Done Criteria

- `/payments` lists receipts and disbursements with a direction badge + a direction filter (Semua/Terima/Bayar); two gated create buttons (Terima/Bayar) route to `/payments/new?direction=…`.
- The direction-parameterized editor pays a vendor by allocating across open POSTED bills (≤ outstanding, ≥1), posting `{ direction:'DISBURSEMENT', allocations:[{ purchaseBillId, amount }] }`; receipts still post `{ direction:'RECEIPT', allocations:[{ salesInvoiceId, amount }] }`.
- Post/void reuse `useDocumentAction` (idempotency + SoD-distinct toasts); posted/void payments open read-only with the `PAY-DSB/...` ref.
- `useOpenDocuments` serves both directions from the right source; `useOpenInvoices` removed; `paymentSchema` unchanged; all money via `Money`/`MoneyText`.
- All tests pass (~151); lint clean; build green.

## Out of Scope (YAGNI)

Multi-currency, partial-bill scheduling, payment batches/runs, bank reconciliation, an in-editor direction toggle, and disbursements against anything other than purchase bills.

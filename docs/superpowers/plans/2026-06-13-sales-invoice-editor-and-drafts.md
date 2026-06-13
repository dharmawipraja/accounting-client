# Plan 3a — Sales Invoice Editor + Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full-page sales-invoice draft editor (header + line-item table + debounced live `/tax/calculate` preview) and a status-badged list, so ACCOUNTANT+ can create, edit, delete, and list **draft** invoices. (Post/void/SoD is Plan 3b.)

**Architecture:** A full-page route editor uses React Hook Form `useFieldArray` for line items; per-line amount = `Money(qty)×unitPrice`; a debounced `useTaxPreview` hook calls `/tax/calculate` and a totals panel shows Subtotal → +PPN → −PPh → Total. CRUD goes through the existing `createResourceHooks`. Two new shared combobox components (`PartnerSelect`, `TaxCodeMultiSelect`) and the invoice Zod schema (reconciled live during planning) round it out.

**Tech Stack:** React 19, TanStack Query v5 + Router, Zod v4, React Hook Form (+ useFieldArray), shadcn/ui (popover/command), decimal.js (`Money`), Vitest + RTL + MSW, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-13-sales-invoices-design.md`.

---

## Reconciled API shapes (verified live during planning — use these)

**`SalesInvoice` (GET item / list):**
```
id, invoiceNumber (string|null — null for DRAFT), partnerId, date (ISO datetime),
dueDate (ISO datetime|null), description (string|null), status ("DRAFT"|"POSTED"|"VOID"…),
subtotal, taxTotal, withholdingTotal, total, amountPaid, outstanding, paymentStatus ("UNPAID"…),
lines: [{ id, lineNo, description, accountId, quantity, unitPrice, amount, taxCodeIds[] }]
```
- Dates round-trip as ISO datetimes in responses but are SENT as `YYYY-MM-DD`. Display/seed via the first 10 chars (`date.slice(0,10)`) to avoid timezone drift.
- `invoiceNumber` is null for drafts (assigned on post). `status` for a fresh draft is `"DRAFT"` (POSTED/VOID confirmed in 3b).

**`POST /tax/calculate` (preview):**
```
{ subtotal, taxes:[{taxCodeId, code, kind, base, amount, accountId}], settlementAmount, journalLines:[{accountId, debit?|credit?}] }
```
- SALE allows only `PPN_OUTPUT` + `PPH_PREPAID` tax kinds (others → 422). `settlementAmount` = subtotal + ΣPPN − ΣPPh = the customer-owed total. Requires `settlementAccountId` = AR control account (code `1-1200`).

---

## Canonical interfaces

```ts
// src/features/sales-invoices/schema.ts
type SalesInvoiceLine = { id: string; lineNo: number; description: string; accountId: string;
  quantity: string; unitPrice: string; amount: string; taxCodeIds: string[] };
type SalesInvoice = { id: string; invoiceNumber: string | null; partnerId: string; date: string;
  dueDate: string | null; description: string | null; status: string; subtotal: string;
  taxTotal: string; withholdingTotal: string; total: string; amountPaid: string; outstanding: string;
  paymentStatus: string | null; lines: SalesInvoiceLine[] };
type InvoiceLineFormValues = { description: string; accountId: string; quantity: string; unitPrice: string; taxCodeIds: string[] };
type InvoiceFormValues = { partnerId: string; date: string; dueDate: string; description: string; lines: InvoiceLineFormValues[] };
type SalesInvoiceCreatePayload = { partnerId: string; date: string; dueDate?: string; description?: string;
  lines: { description: string; accountId: string; quantity: string; unitPrice: string; taxCodeIds: string[] }[] };
type SalesInvoiceUpdatePayload = Partial<SalesInvoiceCreatePayload>;

// src/features/sales-invoices/useTaxPreview.ts
type TaxPreviewLine = { accountId: string; amount: string; taxCodeIds: string[] };
type TaxCalc = { subtotal: string; taxes: { taxCodeId: string; code: string; kind: string; base: string; amount: string; accountId: string }[]; settlementAmount: string; journalLines: { accountId: string; debit?: string; credit?: string }[] };
function useTaxPreview(args: { nature: 'SALE' | 'PURCHASE'; settlementAccountId?: string; lines: TaxPreviewLine[] }): { data?: TaxCalc; isLoading: boolean; error: ApiError | null };

// src/lib/hooks/useDebouncedValue.ts
function useDebouncedValue<T>(value: T, ms: number): T;

// src/components/common/PartnerSelect.tsx
interface PartnerSelectProps { value?: string; onChange: (id: string) => void; filter?: 'customer' | 'vendor' | 'all'; disabled?: boolean; placeholder?: string; 'aria-label'?: string }
// src/components/common/TaxCodeMultiSelect.tsx
interface TaxCodeMultiSelectProps { value: string[]; onChange: (ids: string[]) => void; allowedKinds: string[]; 'aria-label'?: string }
```

---

## File structure

```
src/features/sales-invoices/
  schema.ts (+ schema.test.ts)        # SalesInvoice + form + payload zod
  hooks.ts                            # createResourceHooks instance
  useTaxPreview.ts (+ .test.tsx)
  taxCalcSchema.ts                    # zod for /tax/calculate response
  columns.tsx
  InvoiceTotals.tsx
  InvoiceLineRow.tsx
  InvoiceForm.tsx (+ InvoiceForm.test.tsx)
  InvoiceEditorPage.tsx
  SalesInvoicesPage.tsx (+ .test.tsx)
src/components/common/PartnerSelect.tsx (+ .test.tsx)
src/components/common/TaxCodeMultiSelect.tsx (+ .test.tsx)
src/lib/hooks/useDebouncedValue.ts (+ .test.ts)
src/lib/query/keys.ts                 # add salesInvoices
src/lib/i18n/messages.id.ts           # add salesInvoices group
src/test/handlers.ts                  # sales-invoices CRUD + /tax/calculate
src/app/routes/_app/sales-invoices.tsx          # MODIFY: list
src/app/routes/_app/sales-invoices.new.tsx      # editor (new)
src/app/routes/_app/sales-invoices.$id.edit.tsx # editor (edit)
```

---

## Task 1: Invoice schema + hooks + query keys (TDD)

**Files:**
- Create: `src/features/sales-invoices/schema.ts`, `src/features/sales-invoices/schema.test.ts`, `src/features/sales-invoices/hooks.ts`
- Modify: `src/lib/query/keys.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/sales-invoices/schema.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { salesInvoiceSchema, invoiceFormSchema } from './schema';

const sample = {
  id: 'i1', invoiceNumber: null, partnerId: 'p1', date: '2026-06-13T00:00:00.000Z',
  dueDate: '2026-07-13T00:00:00.000Z', description: 'x', status: 'DRAFT',
  subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000',
  total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID',
  lines: [{ id: 'l1', lineNo: 1, description: 'Jasa', accountId: 'a1', quantity: '2.0000', unitPrice: '500000.0000', amount: '1000000.0000', taxCodeIds: ['t1'] }],
};

describe('salesInvoiceSchema', () => {
  it('parses the reconciled shape and strips extras', () => {
    const r = salesInvoiceSchema.parse({ ...sample, fiscalYear: null, createdBy: 'u', journalEntryId: null });
    expect(r.status).toBe('DRAFT');
    expect(r.lines[0].amount).toBe('1000000.0000');
    expect(r.invoiceNumber).toBeNull();
  });
});

describe('invoiceFormSchema', () => {
  it('requires partner, date, and at least one line', () => {
    expect(invoiceFormSchema.safeParse({ partnerId: '', date: '', dueDate: '', description: '', lines: [] }).success).toBe(false);
  });
  it('accepts a valid form', () => {
    const ok = invoiceFormSchema.safeParse({
      partnerId: 'p1', date: '2026-06-13', dueDate: '', description: '',
      lines: [{ description: 'Jasa', accountId: 'a1', quantity: '2', unitPrice: '500000', taxCodeIds: ['t1'] }],
    });
    expect(ok.success).toBe(true);
  });
  it('rejects a line with zero quantity', () => {
    const bad = invoiceFormSchema.safeParse({
      partnerId: 'p1', date: '2026-06-13', dueDate: '', description: '',
      lines: [{ description: 'Jasa', accountId: 'a1', quantity: '0', unitPrice: '5', taxCodeIds: [] }],
    });
    expect(bad.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/sales-invoices/schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the schema**

Create `src/features/sales-invoices/schema.ts`:
```ts
import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const salesInvoiceLineSchema = z.object({
  id: z.string(),
  lineNo: z.number(),
  description: z.string(),
  accountId: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  amount: z.string(),
  taxCodeIds: z.array(z.string()),
});
export type SalesInvoiceLine = z.infer<typeof salesInvoiceLineSchema>;

export const salesInvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string().nullish(),
  partnerId: z.string(),
  date: z.string(),
  dueDate: z.string().nullish(),
  description: z.string().nullish(),
  status: z.string(),
  subtotal: moneyString,
  taxTotal: moneyString,
  withholdingTotal: moneyString,
  total: moneyString,
  amountPaid: moneyString,
  outstanding: moneyString,
  paymentStatus: z.string().nullish(),
  lines: z.array(salesInvoiceLineSchema),
});
export type SalesInvoice = z.infer<typeof salesInvoiceSchema>;

const numericString = (msg: string) => z.string().regex(/^\d+(\.\d+)?$/, msg);

export const invoiceLineFormSchema = z.object({
  description: z.string().min(1),
  accountId: z.string().min(1, 'selectAccount'),
  quantity: numericString('invalidQuantity').refine((v) => Number(v) > 0, 'invalidQuantity'),
  unitPrice: numericString('invalidPrice'),
  taxCodeIds: z.array(z.string()),
});
export type InvoiceLineFormValues = z.infer<typeof invoiceLineFormSchema>;

export const invoiceFormSchema = z.object({
  partnerId: z.string().min(1, 'selectPartner'),
  date: z.string().min(1, 'required'),
  dueDate: z.string(),
  description: z.string(),
  lines: z.array(invoiceLineFormSchema).min(1, 'atLeastOneLine'),
});
export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export type SalesInvoiceCreatePayload = {
  partnerId: string; date: string; dueDate?: string; description?: string;
  lines: { description: string; accountId: string; quantity: string; unitPrice: string; taxCodeIds: string[] }[];
};
export type SalesInvoiceUpdatePayload = Partial<SalesInvoiceCreatePayload>;
```
> The numeric `quantity` uses `Number(v) > 0` only to validate positivity (not money math); the value stays a string. `Number()` on a quantity is acceptable — it is not a monetary amount.

- [ ] **Step 4: Add query keys + hooks**

In `src/lib/query/keys.ts`, add to `queryKeys`:
```ts
  salesInvoices: createResourceKeys('salesInvoices'),
```
Create `src/features/sales-invoices/hooks.ts`:
```ts
import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { salesInvoiceSchema, type SalesInvoice, type SalesInvoiceCreatePayload, type SalesInvoiceUpdatePayload } from './schema';

export const salesInvoicesApi = createResourceHooks<SalesInvoice, SalesInvoiceCreatePayload, SalesInvoiceUpdatePayload>({
  key: 'salesInvoices',
  basePath: '/sales-invoices',
  itemSchema: salesInvoiceSchema,
});
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test src/features/sales-invoices/schema.test.ts`
Expected: PASS. Then `pnpm build` succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/features/sales-invoices/schema.ts src/features/sales-invoices/schema.test.ts src/features/sales-invoices/hooks.ts src/lib/query/keys.ts
git commit -m "feat: sales invoice schema, hooks, and query keys"
```

---

## Task 2: i18n `salesInvoices` group

**Files:**
- Modify: `src/lib/i18n/messages.id.ts`

- [ ] **Step 1: Add the group**

In `src/lib/i18n/messages.id.ts`, add to the `id` object:
```ts
  salesInvoices: {
    title: 'Faktur Penjualan',
    newInvoice: 'Faktur Baru',
    editInvoice: 'Ubah Faktur',
    number: 'No. Faktur',
    partner: 'Pelanggan',
    date: 'Tanggal',
    dueDate: 'Jatuh Tempo',
    description: 'Keterangan',
    status: 'Status',
    statusAll: 'Semua',
    statusDraft: 'Draf',
    statusPosted: 'Diposting',
    statusVoid: 'Dibatalkan',
    lineDescription: 'Deskripsi',
    account: 'Akun',
    quantity: 'Qty',
    unitPrice: 'Harga Satuan',
    taxes: 'Pajak',
    lineAmount: 'Jumlah',
    addLine: 'Tambah baris',
    removeLine: 'Hapus baris',
    subtotal: 'Subtotal (DPP)',
    ppn: 'PPN',
    pphWithheld: 'PPh Dipotong',
    total: 'Total Tagihan',
    calculating: 'Menghitung…',
    selectPartner: 'Pilih pelanggan',
    selectAccount: 'Pilih akun',
    atLeastOneLine: 'Tambahkan minimal satu baris',
    invalidQuantity: 'Qty harus lebih dari 0',
    invalidPrice: 'Harga tidak valid',
    required: 'Wajib diisi',
    draft: 'Draf',
    saveDraft: 'Simpan Draf',
  },
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat: add salesInvoices i18n group"
```

---

## Task 3: `useDebouncedValue` hook (TDD)

**Files:**
- Create: `src/lib/hooks/useDebouncedValue.ts`, `src/lib/hooks/useDebouncedValue.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/hooks/useDebouncedValue.test.ts`:
```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('returns the latest value only after the delay', () => {
  const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 400), { initialProps: { v: 'a' } });
  expect(result.current).toBe('a');
  rerender({ v: 'b' });
  expect(result.current).toBe('a'); // not yet
  act(() => { vi.advanceTimersByTime(400); });
  expect(result.current).toBe('b');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/hooks/useDebouncedValue.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/hooks/useDebouncedValue.ts`:
```ts
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/lib/hooks/useDebouncedValue.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/useDebouncedValue.ts src/lib/hooks/useDebouncedValue.test.ts
git commit -m "feat: add useDebouncedValue hook"
```

---

## Task 4: `taxCalcSchema` + `useTaxPreview` (TDD)

**Files:**
- Create: `src/features/sales-invoices/taxCalcSchema.ts`, `src/features/sales-invoices/useTaxPreview.ts`, `src/features/sales-invoices/useTaxPreview.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/sales-invoices/useTaxPreview.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useTaxPreview } from './useTaxPreview';

afterEach(() => { useSession.getState().clear(); vi.useRealTimers(); });

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('does not call when there are no complete lines', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let called = false;
  server.use(http.post(`${API}/tax/calculate`, () => { called = true; return HttpResponse.json({}); }));
  renderHook(() => useTaxPreview({ nature: 'SALE', settlementAccountId: 'ar', lines: [] }), { wrapper });
  await new Promise((r) => setTimeout(r, 500));
  expect(called).toBe(false);
});

it('posts /tax/calculate and returns parsed totals for complete lines', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(http.post(`${API}/tax/calculate`, () => HttpResponse.json({
    subtotal: '1000000.0000',
    taxes: [{ taxCodeId: 't1', code: 'PPN-OUT-11', kind: 'PPN_OUTPUT', base: '1000000.0000', amount: '110000.0000', accountId: 'x' }],
    settlementAmount: '1110000.0000',
    journalLines: [],
  })));
  const { result } = renderHook(
    () => useTaxPreview({ nature: 'SALE', settlementAccountId: 'ar', lines: [{ accountId: 'rev', amount: '1000000.0000', taxCodeIds: ['t1'] }] }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.data?.settlementAmount).toBe('1110000.0000'), { timeout: 2000 });
  expect(result.current.data?.taxes[0].kind).toBe('PPN_OUTPUT');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/sales-invoices/useTaxPreview.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the schema + hook**

Create `src/features/sales-invoices/taxCalcSchema.ts`:
```ts
import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const taxCalcSchema = z.object({
  subtotal: moneyString,
  taxes: z.array(z.object({
    taxCodeId: z.string(), code: z.string(), kind: z.string(),
    base: moneyString, amount: moneyString, accountId: z.string(),
  })),
  settlementAmount: moneyString,
  journalLines: z.array(z.object({ accountId: z.string(), debit: moneyString.optional(), credit: moneyString.optional() })),
});
export type TaxCalc = z.infer<typeof taxCalcSchema>;
```
Create `src/features/sales-invoices/useTaxPreview.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { taxCalcSchema, type TaxCalc } from './taxCalcSchema';

export type TaxPreviewLine = { accountId: string; amount: string; taxCodeIds: string[] };

interface Args {
  nature: 'SALE' | 'PURCHASE';
  settlementAccountId?: string;
  lines: TaxPreviewLine[];
}

export function useTaxPreview(args: Args): { data?: TaxCalc; isLoading: boolean; error: ApiError | null } {
  const debounced = useDebouncedValue(JSON.stringify(args), 400);
  const parsed = JSON.parse(debounced) as Args;

  const completeLines = parsed.lines.filter(
    (l) => l.accountId && l.amount && Number(l.amount) > 0,
  );
  const enabled = !!parsed.settlementAccountId && completeLines.length > 0;

  const query = useQuery<TaxCalc, ApiError>({
    queryKey: ['taxCalc', debounced],
    enabled,
    queryFn: () =>
      apiFetch('/tax/calculate', {
        method: 'POST',
        body: { nature: parsed.nature, settlementAccountId: parsed.settlementAccountId, lines: completeLines },
        schema: taxCalcSchema,
      }),
  });

  return { data: query.data, isLoading: query.isFetching, error: (query.error as ApiError) ?? null };
}
```
> `Number(l.amount) > 0` only gates whether to call (a presence check); the amount string itself is computed by `Money` upstream and never floated for arithmetic.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/features/sales-invoices/useTaxPreview.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/sales-invoices/taxCalcSchema.ts src/features/sales-invoices/useTaxPreview.ts src/features/sales-invoices/useTaxPreview.test.tsx
git commit -m "feat: debounced useTaxPreview hook + tax-calc schema"
```

---

## Task 5: `PartnerSelect` (TDD)

**Files:**
- Create: `src/components/common/PartnerSelect.tsx`, `src/components/common/PartnerSelect.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/PartnerSelect.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { PartnerSelect } from './PartnerSelect';

afterEach(() => useSession.getState().clear());

function renderSelect(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const partners = [
  { id: 'c1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true },
  { id: 'v1', code: 'VEND-1', name: 'Pemasok B', isCustomer: false, isVendor: true, isActive: true },
  { id: 'x1', code: 'OLD-1', name: 'Nonaktif C', isCustomer: true, isVendor: false, isActive: false },
];

it('lists only active customers when filter=customer and selects by id', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  server.use(http.get(`${API}/partners`, () => HttpResponse.json(partners)));
  const onChange = vi.fn();
  renderSelect(<PartnerSelect filter="customer" onChange={onChange} placeholder="Pilih pelanggan" aria-label="Pelanggan" />);
  await user.click(screen.getByRole('combobox', { name: /pelanggan/i }));
  expect(await screen.findByRole('option', { name: /CUST-1.*Toko A/i })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /VEND-1/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /OLD-1/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole('option', { name: /CUST-1.*Toko A/i }));
  expect(onChange).toHaveBeenCalledWith('c1');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/components/common/PartnerSelect.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/common/PartnerSelect.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';
import { partnersApi } from '@/features/partners/hooks';

interface PartnerSelectProps {
  value?: string;
  onChange: (id: string) => void;
  filter?: 'customer' | 'vendor' | 'all';
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}

export function PartnerSelect({ value, onChange, filter = 'all', disabled, placeholder, 'aria-label': ariaLabel }: PartnerSelectProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const list = partnersApi.useList();

  const options = useMemo(
    () =>
      (list.data ?? [])
        .filter((p) => p.isActive && (filter === 'all' || (filter === 'customer' ? p.isCustomer : p.isVendor)))
        .sort((a, b) => a.code.localeCompare(b.code)),
    [list.data, filter],
  );
  const selected = options.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={ariaLabel}
          disabled={disabled} className="w-full justify-between font-normal">
          {selected ? `${selected.code} — ${selected.name}` : (placeholder ?? t.common.search)}
          <ChevronsUpDown className="ml-2 size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t.common.search} />
          <CommandList>
            <CommandEmpty>{t.common.noData}</CommandEmpty>
            <CommandGroup>
              {options.map((p) => (
                <CommandItem key={p.id} value={`${p.code} ${p.name}`} onSelect={() => { onChange(p.id); setOpen(false); }}>
                  <Check className={cn('mr-2 size-4', p.id === value ? 'opacity-100' : 'opacity-0')} />
                  {p.code} — {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/components/common/PartnerSelect.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/PartnerSelect.tsx src/components/common/PartnerSelect.test.tsx
git commit -m "feat: PartnerSelect combobox (customer/vendor filter)"
```

---

## Task 6: `TaxCodeMultiSelect` (TDD)

**Files:**
- Create: `src/components/common/TaxCodeMultiSelect.tsx`, `src/components/common/TaxCodeMultiSelect.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/TaxCodeMultiSelect.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { TaxCodeMultiSelect } from './TaxCodeMultiSelect';

afterEach(() => useSession.getState().clear());

function renderMS(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const codes = [
  { id: 'out', code: 'PPN-OUT-11', name: 'PPN Keluaran', kind: 'PPN_OUTPUT', rate: '0.11', taxAccountId: 'a', isActive: true },
  { id: 'inp', code: 'PPN-IN-11', name: 'PPN Masukan', kind: 'PPN_INPUT', rate: '0.11', taxAccountId: 'a', isActive: true },
  { id: 'pre', code: 'PPH23-PRE', name: 'PPh Prepaid', kind: 'PPH_PREPAID', rate: '0.02', taxAccountId: 'a', isActive: true },
];

it('offers only allowed kinds and toggles selection by id', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  server.use(http.get(`${API}/tax/codes`, () => HttpResponse.json(codes)));
  const onChange = vi.fn();
  renderMS(<TaxCodeMultiSelect value={[]} onChange={onChange} allowedKinds={['PPN_OUTPUT', 'PPH_PREPAID']} aria-label="Pajak" />);
  await user.click(screen.getByRole('combobox', { name: /pajak/i }));
  expect(await screen.findByRole('option', { name: /PPN-OUT-11/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /PPH23-PRE/i })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /PPN-IN-11/i })).not.toBeInTheDocument(); // PPN_INPUT excluded
  await user.click(screen.getByRole('option', { name: /PPN-OUT-11/i }));
  expect(onChange).toHaveBeenCalledWith(['out']);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/components/common/TaxCodeMultiSelect.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/common/TaxCodeMultiSelect.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';
import { taxCodesApi } from '@/features/tax-codes/hooks';

interface TaxCodeMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  allowedKinds: string[];
  disabled?: boolean;
  'aria-label'?: string;
}

export function TaxCodeMultiSelect({ value, onChange, allowedKinds, disabled, 'aria-label': ariaLabel }: TaxCodeMultiSelectProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const list = taxCodesApi.useList();

  const options = useMemo(
    () => (list.data ?? []).filter((c) => c.isActive && allowedKinds.includes(c.kind)),
    [list.data, allowedKinds],
  );
  const selectedCodes = options.filter((o) => value.includes(o.id));

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={ariaLabel}
          disabled={disabled} className="h-auto min-h-9 w-full justify-between font-normal">
          <span className="flex flex-wrap gap-1">
            {selectedCodes.length === 0
              ? <span className="text-muted-foreground">{t.salesInvoices.taxes}</span>
              : selectedCodes.map((c) => <Badge key={c.id} variant="secondary">{c.code}</Badge>)}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t.common.search} />
          <CommandList>
            <CommandEmpty>{t.common.noData}</CommandEmpty>
            <CommandGroup>
              {options.map((c) => (
                <CommandItem key={c.id} value={`${c.code} ${c.name}`} onSelect={() => toggle(c.id)}>
                  <Check className={cn('mr-2 size-4', value.includes(c.id) ? 'opacity-100' : 'opacity-0')} />
                  {c.code} — {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/components/common/TaxCodeMultiSelect.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/TaxCodeMultiSelect.tsx src/components/common/TaxCodeMultiSelect.test.tsx
git commit -m "feat: TaxCodeMultiSelect (kind-filtered multi-select)"
```

---

## Task 7: MSW sales-invoice + tax/calculate fixtures

**Files:**
- Modify: `src/test/handlers.ts`

- [ ] **Step 1: Add fixtures + handlers**

In `src/test/handlers.ts`, add an exported fixture and handlers (keep existing):
```ts
// --- sales invoices (Plan 3a) ---
export const salesInvoiceFixtures = () => [
  { id: 'i1', invoiceNumber: null, partnerId: 'p1', date: '2026-06-13T00:00:00.000Z', dueDate: '2026-07-13T00:00:00.000Z', description: 'Inv 1', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [{ id: 'l1', lineNo: 1, description: 'Jasa', accountId: 'a2', quantity: '2.0000', unitPrice: '500000.0000', amount: '1000000.0000', taxCodeIds: ['t1'] }] },
];
```
And inside `handlers`:
```ts
  http.get(`${API}/sales-invoices`, () => HttpResponse.json(salesInvoiceFixtures())),
  http.get(`${API}/sales-invoices/:id`, ({ params }) => HttpResponse.json({ ...salesInvoiceFixtures()[0], id: params.id })),
  http.post(`${API}/sales-invoices`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...salesInvoiceFixtures()[0], id: 'i9', ...body, status: 'DRAFT' });
  }),
  http.patch(`${API}/sales-invoices/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...salesInvoiceFixtures()[0], id: params.id, ...body });
  }),
  http.delete(`${API}/sales-invoices/:id`, () => HttpResponse.json({})),
  http.post(`${API}/tax/calculate`, async ({ request }) => {
    const body = (await request.json()) as { lines: { amount: string }[] };
    const subtotal = body.lines.reduce((s, l) => s + Number(l.amount), 0);
    return HttpResponse.json({
      subtotal: subtotal.toFixed(4),
      taxes: [{ taxCodeId: 't1', code: 'PPN-OUT-11', kind: 'PPN_OUTPUT', base: subtotal.toFixed(4), amount: (subtotal * 0.11).toFixed(4), accountId: 'ppn' }],
      settlementAmount: (subtotal * 1.11).toFixed(4),
      journalLines: [],
    });
  }),
```
> This `/tax/calculate` stub uses `Number()` for fixture math only — it is test scaffolding, not app code. The app keeps money as decimal strings.

- [ ] **Step 2: Verify existing tests still pass**

Run: `pnpm test src/test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/test/handlers.ts
git commit -m "test: add MSW sales-invoice + tax/calculate fixtures"
```

---

## Task 8: `InvoiceTotals` panel (TDD)

**Files:**
- Create: `src/features/sales-invoices/InvoiceTotals.tsx`, `src/features/sales-invoices/InvoiceTotals.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/sales-invoices/InvoiceTotals.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { InvoiceTotals } from './InvoiceTotals';

afterEach(() => useSession.getState().clear());

function renderTotals(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('shows subtotal, PPN, PPh, and total from the tax preview', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(http.post(`${API}/tax/calculate`, () => HttpResponse.json({
    subtotal: '1000000.0000',
    taxes: [
      { taxCodeId: 't1', code: 'PPN-OUT-11', kind: 'PPN_OUTPUT', base: '1000000.0000', amount: '110000.0000', accountId: 'x' },
      { taxCodeId: 't2', code: 'PPH23-PRE', kind: 'PPH_PREPAID', base: '1000000.0000', amount: '20000.0000', accountId: 'y' },
    ],
    settlementAmount: '1090000.0000',
    journalLines: [],
  })));
  renderTotals(<InvoiceTotals settlementAccountId="ar" lines={[{ accountId: 'rev', amount: '1000000.0000', taxCodeIds: ['t1', 't2'] }]} />);
  expect(await screen.findByText(/Rp\s?1\.090\.000/)).toBeInTheDocument(); // total (settlementAmount)
  expect(screen.getByText(/Rp\s?110\.000/)).toBeInTheDocument(); // PPN
  expect(screen.getByText(/Rp\s?20\.000/)).toBeInTheDocument();  // PPh
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/sales-invoices/InvoiceTotals.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/features/sales-invoices/InvoiceTotals.tsx`:
```tsx
import { Money } from '@/lib/money/money';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';
import { useTaxPreview, type TaxPreviewLine } from './useTaxPreview';

function sumByKind(taxes: { kind: string; amount: string }[], prefix: string): Money {
  return taxes.filter((x) => x.kind.startsWith(prefix)).reduce((acc, x) => acc.plus(Money.from(x.amount)), Money.zero());
}

export function InvoiceTotals({ settlementAccountId, lines }: { settlementAccountId?: string; lines: TaxPreviewLine[] }) {
  const t = useT();
  const { data, isLoading, error } = useTaxPreview({ nature: 'SALE', settlementAccountId, lines });

  const ppn = data ? sumByKind(data.taxes, 'PPN') : Money.zero();
  const pph = data ? sumByKind(data.taxes, 'PPH') : Money.zero();

  return (
    <div className="ml-auto w-full max-w-xs space-y-1 rounded-lg border p-4 text-sm">
      {isLoading ? <p className="text-muted-foreground">{t.salesInvoices.calculating}</p> : null}
      {error instanceof ApiError ? <p role="alert" className="text-destructive">{error.message}</p> : null}
      <Row label={t.salesInvoices.subtotal} value={data ? Money.from(data.subtotal).toRupiah() : Money.zero().toRupiah()} />
      <Row label={`+ ${t.salesInvoices.ppn}`} value={ppn.toRupiah()} />
      <Row label={`− ${t.salesInvoices.pphWithheld}`} value={pph.toRupiah()} />
      <div className="border-t pt-1">
        <Row label={t.salesInvoices.total} value={data ? Money.from(data.settlementAmount).toRupiah() : Money.zero().toRupiah()} bold />
      </div>
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

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/features/sales-invoices/InvoiceTotals.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/sales-invoices/InvoiceTotals.tsx src/features/sales-invoices/InvoiceTotals.test.tsx
git commit -m "feat: InvoiceTotals live tax preview panel"
```

---

## Task 9: `InvoiceLineRow`

**Files:**
- Create: `src/features/sales-invoices/InvoiceLineRow.tsx`

- [ ] **Step 1: Implement the row**

Create `src/features/sales-invoices/InvoiceLineRow.tsx`:
```tsx
import { Trash2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { AccountSelect } from '@/components/common/AccountSelect';
import { MoneyInput } from '@/components/common/MoneyInput';
import { TaxCodeMultiSelect } from '@/components/common/TaxCodeMultiSelect';
import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';
import type { InvoiceFormValues } from './schema';

const SALE_KINDS = ['PPN_OUTPUT', 'PPH_PREPAID'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function InvoiceLineRow({ form, index, onRemove }: { form: UseFormReturn<InvoiceFormValues>; index: number; onRemove: () => void }) {
  const t = useT();
  const line = form.watch(`lines.${index}`);
  const amount = (() => {
    try { return Money.from(line.quantity || '0').times(line.unitPrice || '0').toRupiah(); }
    catch { return Money.zero().toRupiah(); }
  })();

  return (
    <TableRow>
      <TableCell><Input aria-label={t.salesInvoices.lineDescription} {...form.register(`lines.${index}.description`)} /></TableCell>
      <TableCell className="min-w-48">
        <AccountSelect value={line.accountId} onChange={(id) => form.setValue(`lines.${index}.accountId`, id, { shouldValidate: true })} aria-label={t.salesInvoices.account} placeholder={t.salesInvoices.selectAccount} />
      </TableCell>
      <TableCell className="w-20"><Input className="text-right" inputMode="decimal" aria-label={t.salesInvoices.quantity} {...form.register(`lines.${index}.quantity`)} /></TableCell>
      <TableCell className="w-32">
        <MoneyInput value={line.unitPrice} onChange={(v) => form.setValue(`lines.${index}.unitPrice`, v)} aria-label={t.salesInvoices.unitPrice} />
      </TableCell>
      <TableCell className="min-w-40">
        <TaxCodeMultiSelect value={line.taxCodeIds} onChange={(ids) => form.setValue(`lines.${index}.taxCodeIds`, ids)} allowedKinds={SALE_KINDS} aria-label={t.salesInvoices.taxes} />
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">{amount}</TableCell>
      <TableCell><Button type="button" variant="ghost" size="icon" aria-label={t.salesInvoices.removeLine} onClick={onRemove}><Trash2 className="size-4" /></Button></TableCell>
    </TableRow>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: succeeds (this row is consumed by `InvoiceForm` in Task 10; build will fully resolve after Task 10. If `tsc` flags it as unused, proceed to Task 10 which imports it).

- [ ] **Step 3: Commit**

```bash
git add src/features/sales-invoices/InvoiceLineRow.tsx
git commit -m "feat: InvoiceLineRow with decimal line amount"
```

---

## Task 10: `InvoiceForm` (TDD)

**Files:**
- Create: `src/features/sales-invoices/InvoiceForm.tsx`, `src/features/sales-invoices/InvoiceForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/sales-invoices/InvoiceForm.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { InvoiceForm } from './InvoiceForm';

afterEach(() => useSession.getState().clear());

const accounts = [
  { id: 'ar', code: '1-1200', name: 'Piutang Usaha', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null },
  { id: 'rev', code: '4-1000', name: 'Pendapatan', type: 'REVENUE', subtype: 'REVENUE', normalBalance: 'CREDIT', isPostable: true, isActive: true, parentId: null },
];
const partners = [{ id: 'c1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }];

function renderForm(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('creates a draft: picks partner + line and posts the lines payload', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
    http.get(`${API}/partners`, () => HttpResponse.json(partners)),
    http.get(`${API}/tax/codes`, () => HttpResponse.json([])),
  );
  let posted: any = null;
  server.use(http.post(`${API}/sales-invoices`, async ({ request }) => { posted = await request.json(); return HttpResponse.json({ id: 'i9' }); }));
  const onSaved = vi.fn();
  renderForm(<InvoiceForm mode="create" onSaved={onSaved} />);

  await user.click(screen.getByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-13');
  await user.type(screen.getByLabelText(/deskripsi/i), 'Jasa konsultasi');
  await user.click(screen.getByRole('combobox', { name: /akun/i }));
  await user.click(await screen.findByRole('option', { name: /4-1000/i }));
  await user.clear(screen.getByLabelText(/qty/i));
  await user.type(screen.getByLabelText(/qty/i), '2');
  await user.type(screen.getByLabelText(/harga satuan/i), '500000');
  await user.click(screen.getByRole('button', { name: /simpan draf/i }));

  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ partnerId: 'c1', date: '2026-06-13', lines: [{ accountId: 'rev', quantity: '2', unitPrice: '500000' }] });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it('blocks save with no lines / no partner', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
    http.get(`${API}/partners`, () => HttpResponse.json(partners)),
    http.get(`${API}/tax/codes`, () => HttpResponse.json([])),
  );
  renderForm(<InvoiceForm mode="create" onSaved={vi.fn()} startEmpty />);
  await user.click(screen.getByRole('button', { name: /simpan draf/i }));
  expect(await screen.findByText(/minimal satu baris|pilih pelanggan|wajib diisi/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/sales-invoices/InvoiceForm.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `InvoiceForm`**

Create `src/features/sales-invoices/InvoiceForm.tsx`:
```tsx
import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PartnerSelect } from '@/components/common/PartnerSelect';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';
import { accountsApi } from '@/features/accounts/hooks';
import { InvoiceLineRow } from './InvoiceLineRow';
import { InvoiceTotals } from './InvoiceTotals';
import { salesInvoicesApi } from './hooks';
import { invoiceFormSchema, type InvoiceFormValues, type SalesInvoice } from './schema';

const EMPTY_LINE = { description: '', accountId: '', quantity: '1', unitPrice: '0', taxCodeIds: [] as string[] };

function toFormValues(inv: SalesInvoice): InvoiceFormValues {
  return {
    partnerId: inv.partnerId,
    date: inv.date.slice(0, 10),
    dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : '',
    description: inv.description ?? '',
    lines: inv.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
  };
}

interface Props {
  mode: 'create' | 'edit';
  invoice?: SalesInvoice;
  onSaved: () => void;
  startEmpty?: boolean; // create with no initial line (for validation tests)
}

export function InvoiceForm({ mode, invoice, onSaved, startEmpty }: Props) {
  const t = useT();
  const create = salesInvoicesApi.useCreate();
  const update = salesInvoicesApi.useUpdate();
  const accounts = accountsApi.useList();
  const arAccountId = accounts.data?.find((a) => a.code === '1-1200')?.id;

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: invoice
      ? toFormValues(invoice)
      : { partnerId: '', date: '', dueDate: '', description: '', lines: startEmpty ? [] : [{ ...EMPTY_LINE }] },
  });
  const lines = useFieldArray({ control: form.control, name: 'lines' });

  const watched = form.watch('lines');
  const previewLines = useMemo(
    () => (watched ?? [])
      .filter((l) => l.accountId)
      .map((l) => ({ accountId: l.accountId, amount: safeAmount(l.quantity, l.unitPrice), taxCodeIds: l.taxCodeIds })),
    [watched],
  );

  function onSubmit(values: InvoiceFormValues) {
    const payload = {
      partnerId: values.partnerId, date: values.date,
      dueDate: values.dueDate || undefined, description: values.description || undefined,
      lines: values.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    };
    const onError = (err: unknown) => applyApiErrorToForm(err, form, t);
    if (mode === 'edit' && invoice) {
      update.mutate({ id: invoice.id, data: payload }, { onSuccess: () => { toast.success(t.crud.saved); onSaved(); }, onError });
    } else {
      create.mutate(payload, { onSuccess: () => { toast.success(t.crud.saved); onSaved(); }, onError });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>{t.salesInvoices.partner}</Label>
          <PartnerSelect value={form.watch('partnerId')} onChange={(id) => form.setValue('partnerId', id, { shouldValidate: true })} filter="customer" aria-label={t.salesInvoices.partner} placeholder={t.salesInvoices.selectPartner} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">{t.salesInvoices.date}</Label>
          <Input id="date" type="date" aria-label={t.salesInvoices.date} {...form.register('date')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDate">{t.salesInvoices.dueDate}</Label>
          <Input id="dueDate" type="date" aria-label={t.salesInvoices.dueDate} {...form.register('dueDate')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">{t.salesInvoices.description}</Label>
          <Input id="desc" aria-label={t.salesInvoices.description} {...form.register('description')} />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.salesInvoices.lineDescription}</TableHead>
              <TableHead>{t.salesInvoices.account}</TableHead>
              <TableHead className="text-right">{t.salesInvoices.quantity}</TableHead>
              <TableHead className="text-right">{t.salesInvoices.unitPrice}</TableHead>
              <TableHead>{t.salesInvoices.taxes}</TableHead>
              <TableHead className="text-right">{t.salesInvoices.lineAmount}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.fields.map((f, i) => (
              <InvoiceLineRow key={f.id} form={form} index={i} onRemove={() => lines.remove(i)} />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-start justify-between gap-4">
        <Button type="button" variant="outline" onClick={() => lines.append({ ...EMPTY_LINE })}>
          <Plus className="size-4" /> {t.salesInvoices.addLine}
        </Button>
        <InvoiceTotals settlementAccountId={arAccountId} lines={previewLines} />
      </div>

      {form.formState.errors.lines?.root || form.formState.errors.lines ? (
        <p role="alert" className="text-sm text-destructive">{t.salesInvoices.atLeastOneLine}</p>
      ) : null}
      {form.formState.errors.partnerId ? (
        <p role="alert" className="text-sm text-destructive">{t.salesInvoices.selectPartner}</p>
      ) : null}
      {form.formState.errors.date ? (
        <p role="alert" className="text-sm text-destructive">{t.salesInvoices.required}</p>
      ) : null}
      {form.formState.errors.root ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSaved}>{t.common.cancel}</Button>
        <Button type="submit" disabled={create.isPending || update.isPending}>{t.salesInvoices.saveDraft}</Button>
      </div>
    </form>
  );
}

function safeAmount(qty: string, price: string): string {
  try { return Money.from(qty || '0').times(price || '0').toApi(); } catch { return '0'; }
}
```
> `Cancel` calls `onSaved` (the page passes a navigate-to-list callback for both save and cancel).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/features/sales-invoices/InvoiceForm.test.tsx`
Expected: PASS (2 tests).
> Radix comboboxes + the jsdom shims (already in `src/test/setup.ts`) + `pointerEventsCheck: 0` make the partner/account pickers driveable. Date inputs are native `type="date"` — `userEvent.type(..., '2026-06-13')` sets them.

- [ ] **Step 5: Commit**

```bash
git add src/features/sales-invoices/InvoiceForm.tsx src/features/sales-invoices/InvoiceForm.test.tsx
git commit -m "feat: InvoiceForm with line field-array and live totals"
```

---

## Task 11: `InvoiceEditorPage` + editor routes

**Files:**
- Create: `src/features/sales-invoices/InvoiceEditorPage.tsx`, `src/app/routes/_app/sales-invoices.new.tsx`, `src/app/routes/_app/sales-invoices.$id.edit.tsx`

- [ ] **Step 1: Implement the editor page**

Create `src/features/sales-invoices/InvoiceEditorPage.tsx`:
```tsx
import { useNavigate } from '@tanstack/react-router';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
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
  if (item.isLoading) return <Skeleton className="h-96 w-full" />;
  if (item.isError || !item.data) return <ErrorState error={item.error} />;
  return (
    <div>
      <PageHeader title={t.salesInvoices.editInvoice} />
      <InvoiceForm mode="edit" invoice={item.data} onSaved={goList} />
    </div>
  );
}
```
Create `src/app/routes/_app/sales-invoices.new.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { InvoiceEditorPage } from '@/features/sales-invoices/InvoiceEditorPage';

export const Route = createFileRoute('/_app/sales-invoices/new')({
  component: () => <InvoiceEditorPage />,
});
```
Create `src/app/routes/_app/sales-invoices.$id.edit.tsx`:
```tsx
import { createFileRoute, useParams } from '@tanstack/react-router';
import { InvoiceEditorPage } from '@/features/sales-invoices/InvoiceEditorPage';

export const Route = createFileRoute('/_app/sales-invoices/$id/edit')({
  component: function EditRoute() {
    const { id } = useParams({ from: '/_app/sales-invoices/$id/edit' });
    return <InvoiceEditorPage id={id} />;
  },
});
```
> The component arrow for the `/new` route is anonymous; if the React-Compiler ESLint flags the inline arrow, wrap it in a named function `function NewRoute() { return <InvoiceEditorPage />; }`.

- [ ] **Step 2: Verify build (route tree regenerates)**

Run: `pnpm build`
Expected: succeeds; `routeTree.gen.ts` includes `/sales-invoices/new` and `/sales-invoices/$id/edit`.

- [ ] **Step 3: Commit**

```bash
git add src/features/sales-invoices/InvoiceEditorPage.tsx src/app/routes/_app/sales-invoices.new.tsx src/app/routes/_app/sales-invoices.\$id.edit.tsx src/routeTree.gen.ts
git commit -m "feat: invoice editor page + new/edit routes"
```

---

## Task 12: `SalesInvoicesPage` list (TDD)

**Files:**
- Create: `src/features/sales-invoices/columns.tsx`, `src/features/sales-invoices/SalesInvoicesPage.tsx`, `src/features/sales-invoices/SalesInvoicesPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/sales-invoices/SalesInvoicesPage.test.tsx`:
```tsx
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { SalesInvoicesPage } from './SalesInvoicesPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute();
  const index = createRoute({ getParentRoute: () => root, path: '/', component: () => <SalesInvoicesPage /> });
  const newR = createRoute({ getParentRoute: () => root, path: '/sales-invoices/new', component: () => null });
  const editR = createRoute({ getParentRoute: () => root, path: '/sales-invoices/$id/edit', component: () => null });
  const router = createRouter({ routeTree: root.addChildren([index, newR, editR]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  return render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
}

it('lists invoices with partner name (joined) and a Draft status, gated New for ACCOUNTANT', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([
      { id: 'i1', invoiceNumber: null, partnerId: 'p1', date: '2026-06-13T00:00:00.000Z', dueDate: null, description: 'x', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] },
    ])),
    http.get(`${API}/partners`, () => HttpResponse.json([{ id: 'p1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }])),
  );
  renderPage();
  expect(await screen.findByText('Toko A')).toBeInTheDocument();      // joined partner name
  expect(screen.getByText(/draf/i)).toBeInTheDocument();             // status badge
  expect(screen.getByRole('link', { name: /faktur baru/i })).toBeInTheDocument();
});

it('hides New for VIEWER', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json([])),
    http.get(`${API}/partners`, () => HttpResponse.json([])),
  );
  renderPage();
  expect(await screen.findByText(/tidak ada data/i)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /faktur baru/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/sales-invoices/SalesInvoicesPage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the columns**

Create `src/features/sales-invoices/columns.tsx`:
```tsx
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/common/MoneyText';
import { RoleGate } from '@/components/common/RoleGate';
import { formatDateID } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import type { SalesInvoice } from './schema';

const col = createColumnHelper<SalesInvoice>();

function statusLabel(t: Messages, status: string): string {
  if (status === 'DRAFT') return t.salesInvoices.statusDraft;
  if (status === 'POSTED') return t.salesInvoices.statusPosted;
  return t.salesInvoices.statusVoid;
}

export function buildInvoiceColumns(t: Messages, partnerName: (id: string) => string) {
  return [
    col.accessor('invoiceNumber', { header: t.salesInvoices.number, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('partnerId', { header: t.salesInvoices.partner, cell: (c) => partnerName(c.getValue()) }),
    col.accessor('date', { header: t.salesInvoices.date, cell: (c) => formatDateID(c.getValue().slice(0, 10)) }),
    col.accessor('status', {
      header: t.salesInvoices.status,
      cell: (c) => <Badge variant={c.getValue() === 'DRAFT' ? 'secondary' : 'default'}>{statusLabel(t, c.getValue())}</Badge>,
    }),
    col.accessor('total', { header: t.salesInvoices.total, cell: (c) => <MoneyText value={c.getValue()} /> }),
    col.display({
      id: 'actions',
      header: '',
      // 3a: draft Edit link (ACCOUNTANT+). Delete/Post/Void row actions are added in Plan 3b.
      cell: (c) =>
        c.row.original.status === 'DRAFT' ? (
          <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
            <Button asChild variant="ghost" size="sm">
              <Link to="/sales-invoices/$id/edit" params={{ id: c.row.original.id }}>{t.common.edit}</Link>
            </Button>
          </RoleGate>
        ) : null,
    }),
  ];
}
```

- [ ] **Step 4: Create the page**

Create `src/features/sales-invoices/SalesInvoicesPage.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/common/DataTable';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { RoleGate } from '@/components/common/RoleGate';
import { useT } from '@/lib/i18n/useT';
import { partnersApi } from '@/features/partners/hooks';
import { buildInvoiceColumns } from './columns';
import { salesInvoicesApi } from './hooks';

const STATUSES = ['ALL', 'DRAFT', 'POSTED', 'VOID'] as const;

export function SalesInvoicesPage() {
  const t = useT();
  const list = salesInvoicesApi.useList();
  const partners = partnersApi.useList();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');

  const partnerName = useMemo(() => {
    const map = new Map((partners.data ?? []).map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id;
  }, [partners.data]);

  const columns = useMemo(() => buildInvoiceColumns(t, partnerName), [t, partnerName]);

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (list.data ?? []).filter((inv) => {
      if (status !== 'ALL' && inv.status !== status && !(status === 'VOID' && inv.status.startsWith('VOID'))) return false;
      return !q || (inv.invoiceNumber ?? '').toLowerCase().includes(q) || partnerName(inv.partnerId).toLowerCase().includes(q);
    });
  }, [list.data, search, status, partnerName]);

  return (
    <div>
      <PageHeader title={t.salesInvoices.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button asChild><Link to="/sales-invoices/new"><Plus className="size-4" /> {t.salesInvoices.newInvoice}</Link></Button>
        </RoleGate>
      } />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
              {s === 'ALL' ? t.salesInvoices.statusAll : s === 'DRAFT' ? t.salesInvoices.statusDraft : s === 'POSTED' ? t.salesInvoices.statusPosted : t.salesInvoices.statusVoid}
            </Button>
          ))}
        </div>
      </div>

      {list.isLoading ? <Skeleton className="h-40 w-full" />
        : list.isError ? <ErrorState error={list.error} />
        : <DataTable columns={columns} data={rows} />}
    </div>
  );
}
```
> The `ALL` filter label uses the literal "Semua"; if you prefer, add `crud.all = 'Semua'` to i18n and use `t.crud.all` instead of the `replace` expression (cleaner — do this if convenient).

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test src/features/sales-invoices/SalesInvoicesPage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/sales-invoices/columns.tsx src/features/sales-invoices/SalesInvoicesPage.tsx src/features/sales-invoices/SalesInvoicesPage.test.tsx
git commit -m "feat: sales invoices list with status filter and partner join"
```

---

## Task 13: Wire the list route + full verification

**Files:**
- Modify: `src/app/routes/_app/sales-invoices.tsx`

- [ ] **Step 1: Render the list**

Replace `src/app/routes/_app/sales-invoices.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { SalesInvoicesPage } from '@/features/sales-invoices/SalesInvoicesPage';

export const Route = createFileRoute('/_app/sales-invoices')({
  component: SalesInvoicesPage,
});
```
> Note: the existing `_app/sales-invoices.tsx` is the index for `/sales-invoices`. With `/sales-invoices/new` and `/sales-invoices/$id/edit` as siblings, confirm TanStack Router treats `sales-invoices.tsx` as the exact `/sales-invoices` route (it does — flat-file naming). If the router instead nests, rename to `sales-invoices.index.tsx`; the build/route tree will tell you.

- [ ] **Step 2: Full verification**

Run:
```bash
pnpm lint && pnpm test && pnpm build
```
Expected: lint 0 errors (benign react-compiler warnings OK); all tests pass; build succeeds with the new routes.

- [ ] **Step 3: Manual smoke (optional, live API in `.env`)**

`pnpm dev`, log in, open **Faktur Penjualan**: "Faktur Baru" opens the editor; pick a customer (create one in Mitra Bisnis first if empty), add a line (revenue account, qty, price, PPN tax), watch the totals panel compute live; Save Draf returns to the list showing the draft.

- [ ] **Step 4: Commit**

```bash
git add src/app/routes/_app/sales-invoices.tsx
git commit -m "feat: wire Sales Invoices list route"
```

---

## Done criteria for Plan 3a

- `/sales-invoices` lists invoices (status badge, partner-name join, status filter); ACCOUNTANT+ sees "Faktur Baru".
- `/sales-invoices/new` and `/sales-invoices/:id/edit` open the full-page editor: header (PartnerSelect, dates, description) + line table (AccountSelect, qty, MoneyInput price, TaxCodeMultiSelect, decimal line amount) + a debounced live `/tax/calculate` totals panel.
- Create a draft (editor → Save Draf → list) and edit a draft (list row "Ubah" link → editor) both work; money is decimal end-to-end; SALE tax kinds filtered to PPN_OUTPUT/PPH_PREPAID. (Delete-draft, Post, and Void row actions land in Plan 3b.)
- `PartnerSelect`, `TaxCodeMultiSelect`, `useTaxPreview`, `useDebouncedValue` built, tested, reusable.
- `pnpm lint && pnpm test && pnpm build` green.
- Ready for Plan 3b (post/void/approval: `useDocumentAction`, `toastApiError`, idempotent post/void with SoD, role-gated row actions, the Draft approval queue).
```

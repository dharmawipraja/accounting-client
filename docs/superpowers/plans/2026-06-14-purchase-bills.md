# Purchase Bills (Plan 5a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the accounts-payable `/purchase-bills` feature — draft editor, CRUD, post/void lifecycle, and a status-filtered list — mirroring the sales-invoice stack and reusing all existing infrastructure.

**Architecture:** Promote the already-`nature`-parameterized tax engine (`useTaxPreview`/`taxCalcSchema`/totals) out of `features/sales-invoices/` into a shared `features/documents/` module; build `purchase-bills` as its own feature consuming it. Differences from sales invoices: `nature:'PURCHASE'`, `PartnerSelect filter="vendor"`, AP settlement `2-1000`, tax kinds `PPN_INPUT`+`PPH_PAYABLE`, `billNumber`/`billRef` fields, and an optional `vendorInvoiceNo`.

**Tech Stack:** React 19 + React Compiler, TanStack Router (file-based) + Query v5 + Table v8, React Hook Form + Zod v4, shadcn/ui, decimal.js `Money`, Vitest 4 + RTL + MSW v2.

**Reference spec:** `docs/superpowers/specs/2026-06-14-purchase-bills-design.md`

---

## Ordering note (important)

TanStack Router typed `Link`/`navigate` only type-check once a route exists in the generated `src/routeTree.gen.ts`. So: **routes + nav + the full `tsc` build come last (Task 7).** Component tasks that reference `/purchase-bills/*` routes (Task 6) are verified with `pnpm test --run <file>` (Vitest transpiles without type-checking, so typed-route errors don't block runtime tests). Tasks that touch no routes (1–5) may build normally.

## File Structure

```
src/features/documents/            # NEW shared module (Task 1)
  taxCalcSchema.ts                 # moved from sales-invoices
  useTaxPreview.ts                 # moved from sales-invoices
  useTaxPreview.test.tsx           # moved
  DocumentTotals.tsx               # generalized InvoiceTotals (nature prop)
  DocumentTotals.test.tsx          # moved+renamed from InvoiceTotals.test.tsx
src/features/purchase-bills/       # NEW feature
  schema.ts / schema.test.ts       # Task 3
  hooks.ts / hooks.test.tsx        # Task 4
  BillLineRow.tsx                  # Task 5
  BillForm.tsx / BillForm.test.tsx / BillForm.readonly.test.tsx  # Task 5
  columns.tsx                      # Task 6
  PurchaseBillsPage.tsx / .test.tsx# Task 6
  BillEditorPage.tsx               # Task 7
src/app/routes/_app/purchase-bills{,.index,.new,.$id.edit}.tsx   # Task 7
```

Modify: `src/features/sales-invoices/InvoiceForm.tsx` (Task 1, import swap), `src/lib/i18n/messages.id.ts` (Tasks 1+2), `src/lib/query/keys.ts` (Task 2), `src/test/handlers.ts` (Task 4), `src/components/common/AppShell.tsx` (Task 7).

**Reuse (do NOT recreate):** `createResourceHooks`, `useDocumentAction` (`{id, idempotencyKey}` mutate), `applyApiErrorToForm`, `toastApiError`, `PartnerSelect` (`filter="vendor"`), `AccountSelect`, `TaxCodeMultiSelect` (`allowedKinds`), `MoneyInput`, `MoneyText`, `RoleGate`, `ConfirmDialog`, `DataTable`, `ErrorState`, `PageHeader`, `Money` (`src/lib/money/money.ts`), `moneyString` (`src/lib/schemas/common.ts`), `formatDateID`. MSW `API` = `http://localhost:4000`; `/tax/calculate` stub already exists and is `nature`-agnostic.

---

### Task 1: Promote the shared tax core to `features/documents/`

**Files:**
- Move: `src/features/sales-invoices/{useTaxPreview.ts, taxCalcSchema.ts, useTaxPreview.test.tsx}` → `src/features/documents/`
- Move+rename: `src/features/sales-invoices/InvoiceTotals.test.tsx` → `src/features/documents/DocumentTotals.test.tsx`
- Create: `src/features/documents/DocumentTotals.tsx`
- Delete: `src/features/sales-invoices/InvoiceTotals.tsx`
- Modify: `src/features/sales-invoices/InvoiceForm.tsx`, `src/lib/i18n/messages.id.ts`

- [ ] **Step 1: Add the `documents` i18n group**

In `src/lib/i18n/messages.id.ts`, add this group (e.g. immediately before the `salesInvoices` group). Keep `export type Messages = typeof id;` intact.

```ts
  documents: {
    subtotal: 'Subtotal (DPP)',
    ppn: 'PPN',
    pphWithheld: 'PPh Dipotong',
    total: 'Total Tagihan',
    calculating: 'Menghitung…',
  },
```

- [ ] **Step 2: Move the shared files (preserve git history)**

```bash
mkdir -p src/features/documents
git mv src/features/sales-invoices/useTaxPreview.ts src/features/documents/useTaxPreview.ts
git mv src/features/sales-invoices/taxCalcSchema.ts src/features/documents/taxCalcSchema.ts
git mv src/features/sales-invoices/useTaxPreview.test.tsx src/features/documents/useTaxPreview.test.tsx
git mv src/features/sales-invoices/InvoiceTotals.test.tsx src/features/documents/DocumentTotals.test.tsx
git rm src/features/sales-invoices/InvoiceTotals.tsx
```

`useTaxPreview.ts` imports `./taxCalcSchema` and `useTaxPreview.test.tsx` imports `./useTaxPreview` — both still resolve in the new directory, no edits needed.

- [ ] **Step 3: Create `src/features/documents/DocumentTotals.tsx`** (generalized from InvoiceTotals; takes `nature`, reads `t.documents.*`)

```tsx
import { Money } from '@/lib/money/money';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';
import { useTaxPreview, type TaxPreviewLine } from './useTaxPreview';

function sumByKind(taxes: { kind: string; amount: string }[], prefix: string): Money {
  return taxes.filter((x) => x.kind.startsWith(prefix)).reduce((acc, x) => acc.plus(Money.from(x.amount)), Money.zero());
}

export function DocumentTotals({ nature, settlementAccountId, lines }: { nature: 'SALE' | 'PURCHASE'; settlementAccountId?: string; lines: TaxPreviewLine[] }) {
  const t = useT();
  const { data, isLoading, error } = useTaxPreview({ nature, settlementAccountId, lines });
  const ppn = data ? sumByKind(data.taxes, 'PPN') : Money.zero();
  const pph = data ? sumByKind(data.taxes, 'PPH') : Money.zero();

  return (
    <div className="ml-auto w-full max-w-xs space-y-1 rounded-lg border p-4 text-sm">
      {isLoading ? <p className="text-muted-foreground">{t.documents.calculating}</p> : null}
      {error instanceof ApiError ? <p role="alert" className="text-destructive">{error.message}</p> : null}
      <Row label={t.documents.subtotal} value={data ? Money.from(data.subtotal).toRupiah() : Money.zero().toRupiah()} />
      <Row label={`+ ${t.documents.ppn}`} value={ppn.toRupiah()} />
      <Row label={`− ${t.documents.pphWithheld}`} value={pph.toRupiah()} />
      <div className="border-t pt-1">
        <Row label={t.documents.total} value={data ? Money.from(data.settlementAmount).toRupiah() : Money.zero().toRupiah()} bold />
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

- [ ] **Step 4: Point the moved test at `DocumentTotals`**

In `src/features/documents/DocumentTotals.test.tsx`, change the import and the render call (everything else, incl. the Rp assertions, stays):

```tsx
import { DocumentTotals } from './DocumentTotals';
// …
renderTotals(<DocumentTotals nature="SALE" settlementAccountId="ar" lines={[{ accountId: 'rev', amount: '1000000.0000', taxCodeIds: ['t1', 't2'] }]} />);
```

- [ ] **Step 5: Update `InvoiceForm.tsx` to use `DocumentTotals`**

In `src/features/sales-invoices/InvoiceForm.tsx`: replace `import { InvoiceTotals } from './InvoiceTotals';` with `import { DocumentTotals } from '@/features/documents/DocumentTotals';`, and replace the JSX `<InvoiceTotals settlementAccountId={arAccountId} lines={previewLines} />` with:

```tsx
        <DocumentTotals nature="SALE" settlementAccountId={arAccountId} lines={previewLines} />
```

- [ ] **Step 6: Confirm nothing else references the moved/deleted modules**

Run: `grep -rn "sales-invoices/useTaxPreview\|sales-invoices/taxCalcSchema\|sales-invoices/InvoiceTotals\|from './InvoiceTotals'\|from './useTaxPreview'\|from './taxCalcSchema'" src/features/sales-invoices`
Expected: no matches (only `InvoiceForm` referenced totals, now updated). If any remain, update them to `@/features/documents/…`.

- [ ] **Step 7: Verify tests + types**

Run: `pnpm test --run src/features/documents src/features/sales-invoices`
Expected: all green (the moved `useTaxPreview`/`DocumentTotals` suites + the full sales-invoice suites).
Run: `pnpm build`
Expected: build succeeds (no new routes touched).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(documents): extract shared tax core (useTaxPreview/taxCalcSchema/DocumentTotals)"
```

---

### Task 2: Purchase-bills i18n group + query keys

**Files:**
- Modify: `src/lib/i18n/messages.id.ts`, `src/lib/query/keys.ts`

- [ ] **Step 1: Add `nav.purchaseBills` and the `purchaseBills` group**

In `src/lib/i18n/messages.id.ts`, add to the `nav` group: `purchaseBills: 'Faktur Pembelian',`. Then add this group (e.g. after `salesInvoices`):

```ts
  purchaseBills: {
    title: 'Faktur Pembelian',
    newBill: 'Tagihan Baru',
    editBill: 'Ubah Tagihan',
    number: 'No.',
    vendorInvoiceNo: 'No. Faktur Vendor',
    partner: 'Vendor',
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
    total: 'Total Tagihan',
    selectPartner: 'Pilih vendor',
    selectAccount: 'Pilih akun',
    atLeastOneLine: 'Tambahkan minimal satu baris',
    required: 'Wajib diisi',
    saveDraft: 'Simpan Draf',
    post: 'Posting',
    void: 'Batalkan',
    view: 'Lihat',
    confirmPostTitle: 'Posting tagihan ini?',
    confirmPostDesc: 'Tagihan akan diposting ke buku besar dan tidak bisa diubah lagi.',
    confirmVoidTitle: 'Batalkan tagihan ini?',
    confirmVoidDesc: 'Posting akan dibalik (jurnal pembalik dibuat).',
    posted: 'Tagihan diposting',
    voided: 'Tagihan dibatalkan',
    readOnlyPosted: 'Tagihan sudah diposting — hanya-baca.',
    readOnlyVoid: 'Tagihan dibatalkan — hanya-baca.',
  },
```

- [ ] **Step 2: Add the `purchaseBills` query keys**

In `src/lib/query/keys.ts`, add to `queryKeys` (after `payments`): `purchaseBills: createResourceKeys('purchaseBills'),`.

- [ ] **Step 3: Verify**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/messages.id.ts src/lib/query/keys.ts
git commit -m "feat(purchase-bills): i18n group + query keys"
```

---

### Task 3: Schema (`schema.ts`)

**Files:**
- Create: `src/features/purchase-bills/schema.ts`
- Test: `src/features/purchase-bills/schema.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/features/purchase-bills/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { purchaseBillSchema, billFormSchema } from './schema';

const sample = {
  id: 'b1', billNumber: null, billRef: null, vendorInvoiceNo: 'VINV-77', partnerId: 'v1',
  date: '2026-06-15T00:00:00.000Z', dueDate: '2026-07-15T00:00:00.000Z', description: 'x', status: 'DRAFT',
  subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000',
  total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID',
  lines: [{ id: 'l1', purchaseBillId: 'b1', lineNo: 1, description: 'Jasa', accountId: 'a1', quantity: '1.0000', unitPrice: '1000000.0000', amount: '1000000.0000', taxCodeIds: ['t1'] }],
};

describe('purchaseBillSchema', () => {
  it('parses the reconciled draft shape and strips extras', () => {
    const r = purchaseBillSchema.parse({ ...sample, fiscalYear: null, createdBy: 'u' });
    expect(r.status).toBe('DRAFT');
    expect(r.vendorInvoiceNo).toBe('VINV-77');
    expect(r.lines[0].purchaseBillId).toBe('b1');
    expect(r.billRef).toBeNull();
  });
  it('parses a POSTED bill (billNumber + billRef + fiscalYear)', () => {
    const r = purchaseBillSchema.parse({ ...sample, status: 'POSTED', billNumber: 1, billRef: 'BILL/2026/000001', fiscalYear: 2026, journalEntryId: 'j1' });
    expect(r.status).toBe('POSTED');
    expect(r.billNumber).toBe(1);
    expect(r.billRef).toBe('BILL/2026/000001');
  });
});

describe('billFormSchema', () => {
  it('requires partner, date, and at least one line', () => {
    expect(billFormSchema.safeParse({ partnerId: '', date: '', dueDate: '', vendorInvoiceNo: '', description: '', lines: [] }).success).toBe(false);
  });
  it('accepts a valid form', () => {
    const ok = billFormSchema.safeParse({
      partnerId: 'v1', date: '2026-06-15', dueDate: '', vendorInvoiceNo: '', description: '',
      lines: [{ description: 'Jasa', accountId: 'a1', quantity: '1', unitPrice: '1000000', taxCodeIds: ['t1'] }],
    });
    expect(ok.success).toBe(true);
  });
  it('rejects a line with zero quantity', () => {
    const bad = billFormSchema.safeParse({
      partnerId: 'v1', date: '2026-06-15', dueDate: '', vendorInvoiceNo: '', description: '',
      lines: [{ description: 'Jasa', accountId: 'a1', quantity: '0', unitPrice: '5', taxCodeIds: [] }],
    });
    expect(bad.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/purchase-bills/schema.test.ts` (FAIL: cannot resolve `./schema`).

- [ ] **Step 3: Write the implementation** — create `src/features/purchase-bills/schema.ts`:

```ts
import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const purchaseBillLineSchema = z.object({
  id: z.string(),
  purchaseBillId: z.string().nullish(),
  lineNo: z.number(),
  description: z.string(),
  accountId: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  amount: z.string(),
  taxCodeIds: z.array(z.string()),
});
export type PurchaseBillLine = z.infer<typeof purchaseBillLineSchema>;

export const purchaseBillSchema = z.object({
  id: z.string(),
  billNumber: z.number().nullish(),
  billRef: z.string().nullish(),
  fiscalYear: z.number().nullish(),
  vendorInvoiceNo: z.string().nullish(),
  postedBy: z.string().nullish(),
  postedAt: z.string().nullish(),
  journalEntryId: z.string().nullish(),
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
  lines: z.array(purchaseBillLineSchema),
});
export type PurchaseBill = z.infer<typeof purchaseBillSchema>;

const numericString = (msg: string) => z.string().regex(/^\d+(\.\d+)?$/, msg);

export const billLineFormSchema = z.object({
  description: z.string().min(1),
  accountId: z.string().min(1, 'selectAccount'),
  quantity: numericString('invalidQuantity').refine((v) => Number(v) > 0, 'invalidQuantity'),
  unitPrice: numericString('invalidPrice'),
  taxCodeIds: z.array(z.string()),
});
export type BillLineFormValues = z.infer<typeof billLineFormSchema>;

export const billFormSchema = z.object({
  partnerId: z.string().min(1, 'selectPartner'),
  date: z.string().min(1, 'required'),
  dueDate: z.string(),
  vendorInvoiceNo: z.string(),
  description: z.string(),
  lines: z.array(billLineFormSchema).min(1, 'atLeastOneLine'),
});
export type BillFormValues = z.infer<typeof billFormSchema>;

export type PurchaseBillCreatePayload = {
  partnerId: string;
  date: string;
  dueDate?: string;
  vendorInvoiceNo?: string;
  description?: string;
  lines: { description: string; accountId: string; quantity: string; unitPrice: string; taxCodeIds: string[] }[];
};
export type PurchaseBillUpdatePayload = Partial<PurchaseBillCreatePayload>;
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/purchase-bills/schema.test.ts` (PASS, 5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/purchase-bills/schema.ts src/features/purchase-bills/schema.test.ts
git commit -m "feat(purchase-bills): tolerant schema + form schema"
```

---

### Task 4: Hooks + MSW handlers (`hooks.ts`)

**Files:**
- Modify: `src/test/handlers.ts`
- Create: `src/features/purchase-bills/hooks.ts`
- Test: `src/features/purchase-bills/hooks.test.tsx`

- [ ] **Step 1: Add purchase-bill fixtures + handlers to MSW**

In `src/test/handlers.ts`, add this fixture near the other `*Fixtures` exports:

```ts
// --- purchase bills (Plan 5a) ---
export const purchaseBillFixtures = () => [
  { id: 'b1', billNumber: null, billRef: null, fiscalYear: null, vendorInvoiceNo: 'VINV-77', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z', dueDate: '2026-07-15T00:00:00.000Z', description: 'Bill 1', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [{ id: 'l1', purchaseBillId: 'b1', lineNo: 1, description: 'Jasa', accountId: 'a2', quantity: '1.0000', unitPrice: '1000000.0000', amount: '1000000.0000', taxCodeIds: ['t1'] }] },
];
```

Then add these handlers to the exported `handlers` array (next to the sales-invoice handlers):

```ts
  http.get(`${API}/purchase-bills`, () => HttpResponse.json(purchaseBillFixtures())),
  http.get(`${API}/purchase-bills/:id`, ({ params }) => HttpResponse.json({ ...purchaseBillFixtures()[0], id: params.id })),
  http.post(`${API}/purchase-bills`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...purchaseBillFixtures()[0], id: 'b9', ...body, status: 'DRAFT' });
  }),
  http.patch(`${API}/purchase-bills/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...purchaseBillFixtures()[0], id: params.id, ...body });
  }),
  http.delete(`${API}/purchase-bills/:id`, () => HttpResponse.json({})),
  http.post(`${API}/purchase-bills/:id/post`, ({ params }) =>
    HttpResponse.json({ ...purchaseBillFixtures()[0], id: params.id, status: 'POSTED', billNumber: 1, billRef: 'BILL/2026/000001', fiscalYear: 2026, postedBy: 'u', postedAt: '2026-06-15T00:00:00.000Z', journalEntryId: 'j1' }),
  ),
  http.post(`${API}/purchase-bills/:id/void`, ({ params }) =>
    HttpResponse.json({ ...purchaseBillFixtures()[0], id: params.id, status: 'VOID', billNumber: 1, billRef: 'BILL/2026/000001', fiscalYear: 2026, journalEntryId: 'j1' }),
  ),
```

- [ ] **Step 2: Write the failing test** — create `src/features/purchase-bills/hooks.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { purchaseBillsApi, usePostBill } from './hooks';

afterEach(() => useSession.getState().clear());

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('useList loads purchase bills from the API', async () => {
  const { result } = renderHook(() => purchaseBillsApi.useList(), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.[0].id).toBe('b1');
});

it('usePostBill posts to the bill post endpoint', async () => {
  const { result } = renderHook(() => usePostBill(), { wrapper: makeWrapper() });
  result.current.mutate({ id: 'b1', idempotencyKey: 'k1' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

- [ ] **Step 3: Run test to verify it fails** — `pnpm test --run src/features/purchase-bills/hooks.test.tsx` (FAIL: cannot resolve `./hooks`).

- [ ] **Step 4: Write the implementation** — create `src/features/purchase-bills/hooks.ts`:

```ts
import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
import {
  purchaseBillSchema,
  type PurchaseBill,
  type PurchaseBillCreatePayload,
  type PurchaseBillUpdatePayload,
} from './schema';

export const purchaseBillsApi = createResourceHooks<
  PurchaseBill,
  PurchaseBillCreatePayload,
  PurchaseBillUpdatePayload
>({
  key: 'purchaseBills',
  basePath: '/purchase-bills',
  itemSchema: purchaseBillSchema,
});

export const usePostBill = () => useDocumentAction({ key: 'purchaseBills', basePath: '/purchase-bills', action: 'post' });
export const useVoidBill = () => useDocumentAction({ key: 'purchaseBills', basePath: '/purchase-bills', action: 'void' });
```

- [ ] **Step 5: Run test to verify it passes** — `pnpm test --run src/features/purchase-bills/hooks.test.tsx` (PASS, 2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/test/handlers.ts src/features/purchase-bills/hooks.ts src/features/purchase-bills/hooks.test.tsx
git commit -m "feat(purchase-bills): resource + lifecycle hooks + MSW handlers"
```

---

### Task 5: Bill editor — `BillLineRow` + `BillForm`

**Files:**
- Create: `src/features/purchase-bills/BillLineRow.tsx`
- Create: `src/features/purchase-bills/BillForm.tsx`
- Test: `src/features/purchase-bills/BillForm.test.tsx`, `src/features/purchase-bills/BillForm.readonly.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/purchase-bills/BillForm.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { BillForm } from './BillForm';

afterEach(() => useSession.getState().clear());

const accounts = [
  { id: 'ap', code: '2-1000', name: 'Utang Usaha', type: 'LIABILITY', subtype: 'CURRENT_LIABILITY', normalBalance: 'CREDIT', isPostable: true, isActive: true, parentId: null },
  { id: 'exp', code: '5-1000', name: 'HPP', type: 'EXPENSE', subtype: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null },
];
const partners = [{ id: 'v1', code: 'VEND-1', name: 'PT Pemasok', isCustomer: false, isVendor: true, isActive: true }];

function renderForm(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('creates a draft: vendor + line → posts the PURCHASE payload (nature=PURCHASE, vendorInvoiceNo)', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let taxNature: string | null = null;
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)),
    http.get(`${API}/partners`, () => HttpResponse.json(partners)),
    http.get(`${API}/tax/codes`, () => HttpResponse.json([])),
    http.post(`${API}/tax/calculate`, async ({ request }) => {
      const b = (await request.json()) as { nature: string };
      taxNature = b.nature;
      return HttpResponse.json({ subtotal: '1000000.0000', taxes: [], settlementAmount: '1000000.0000', journalLines: [] });
    }),
  );
  let posted: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/purchase-bills`, async ({ request }) => {
    posted = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'b9', billNumber: null, billRef: null, vendorInvoiceNo: 'VINV-1', partnerId: 'v1', date: '2026-06-15T00:00:00.000Z', dueDate: null, description: 'x', status: 'DRAFT', subtotal: '0.0000', taxTotal: '0.0000', withholdingTotal: '0.0000', total: '0.0000', amountPaid: '0.0000', outstanding: '0.0000', paymentStatus: 'UNPAID', lines: [] });
  }));
  const onSaved = vi.fn();
  renderForm(<BillForm mode="create" onSaved={onSaved} />);

  await user.click(screen.getByRole('combobox', { name: /vendor/i }));
  await user.click(await screen.findByRole('option', { name: /VEND-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-15');
  await user.type(screen.getByLabelText(/no\. faktur vendor/i), 'VINV-1');
  await user.click(screen.getByRole('combobox', { name: /akun/i }));
  await user.click(await screen.findByRole('option', { name: /5-1000/i }));
  await user.clear(screen.getByLabelText(/qty/i));
  await user.type(screen.getByLabelText(/qty/i), '1');
  await user.type(screen.getByLabelText(/harga satuan/i), '1000000');
  await user.click(screen.getByRole('button', { name: /simpan draf/i }));

  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ partnerId: 'v1', date: '2026-06-15', vendorInvoiceNo: 'VINV-1', lines: [{ accountId: 'exp', quantity: '1', unitPrice: '1000000' }] });
  await waitFor(() => expect(taxNature).toBe('PURCHASE'));
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
  renderForm(<BillForm mode="create" onSaved={vi.fn()} startEmpty />);
  await user.click(screen.getByRole('button', { name: /simpan draf/i }));
  expect((await screen.findAllByText(/minimal satu baris|pilih vendor|wajib diisi/i)).length).toBeGreaterThan(0);
});
```

Create `src/features/purchase-bills/BillForm.readonly.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { BillForm } from './BillForm';
import type { PurchaseBill } from './schema';

afterEach(() => useSession.getState().clear());

const posted: PurchaseBill = {
  id: 'b1', billNumber: 1, billRef: 'BILL/2026/000001', fiscalYear: 2026, vendorInvoiceNo: 'VINV-9', partnerId: 'v1',
  date: '2026-06-15T00:00:00.000Z', dueDate: null, description: 'x', status: 'POSTED', subtotal: '1000000.0000', taxTotal: '110000.0000',
  withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000',
  paymentStatus: 'UNPAID', postedBy: 'u', postedAt: '2026-06-15T00:00:00.000Z', journalEntryId: 'j1',
  lines: [{ id: 'l1', purchaseBillId: 'b1', lineNo: 1, description: 'Jasa', accountId: 'exp', quantity: '1.0000', unitPrice: '1000000.0000', amount: '1000000.0000', taxCodeIds: [] }],
};

function renderForm(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('renders a posted bill read-only: disabled fields, banner, no Save', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json([{ id: 'exp', code: '5-1000', name: 'HPP', type: 'EXPENSE', subtype: 'EXPENSE', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null }])),
    http.get(`${API}/partners`, () => HttpResponse.json([{ id: 'v1', code: 'VEND-1', name: 'PT Pemasok', isCustomer: false, isVendor: true, isActive: true }])),
    http.get(`${API}/tax/codes`, () => HttpResponse.json([])),
  );
  renderForm(<BillForm mode="edit" bill={posted} onSaved={vi.fn()} readOnly />);
  expect(await screen.findByText(/hanya-baca/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /simpan draf/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /tambah baris/i })).not.toBeInTheDocument();
  expect(screen.getByLabelText(/tanggal/i)).toBeDisabled();
});
```

- [ ] **Step 2: Run tests to verify they fail** — `pnpm test --run src/features/purchase-bills/BillForm.test.tsx src/features/purchase-bills/BillForm.readonly.test.tsx` (FAIL: cannot resolve `./BillForm`).

- [ ] **Step 3: Create `src/features/purchase-bills/BillLineRow.tsx`**

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
import type { BillFormValues } from './schema';

const PURCHASE_KINDS = ['PPN_INPUT', 'PPH_PAYABLE'];

export function BillLineRow({ form, index, onRemove, readOnly }: { form: UseFormReturn<BillFormValues>; index: number; onRemove: () => void; readOnly?: boolean }) {
  const t = useT();
  const line = form.watch(`lines.${index}`);
  const amount = (() => {
    try { return Money.from(line.quantity || '0').times(line.unitPrice || '0').toRupiah(); }
    catch { return Money.zero().toRupiah(); }
  })();

  return (
    <TableRow>
      <TableCell><Input aria-label={t.purchaseBills.lineDescription} disabled={readOnly} {...form.register(`lines.${index}.description`)} /></TableCell>
      <TableCell className="min-w-48">
        <AccountSelect value={line.accountId} onChange={(id) => form.setValue(`lines.${index}.accountId`, id, { shouldValidate: true })} aria-label={t.purchaseBills.account} placeholder={t.purchaseBills.selectAccount} disabled={readOnly} />
      </TableCell>
      <TableCell className="w-20"><Input className="text-right" inputMode="decimal" aria-label={t.purchaseBills.quantity} disabled={readOnly} {...form.register(`lines.${index}.quantity`)} /></TableCell>
      <TableCell className="w-32">
        <MoneyInput value={line.unitPrice} onChange={(v) => form.setValue(`lines.${index}.unitPrice`, v)} aria-label={t.purchaseBills.unitPrice} disabled={readOnly} />
      </TableCell>
      <TableCell className="min-w-40">
        <TaxCodeMultiSelect value={line.taxCodeIds} onChange={(ids) => form.setValue(`lines.${index}.taxCodeIds`, ids)} allowedKinds={PURCHASE_KINDS} aria-label={t.purchaseBills.taxes} disabled={readOnly} />
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">{amount}</TableCell>
      <TableCell>{readOnly ? null : <Button type="button" variant="ghost" size="icon" aria-label={t.purchaseBills.removeLine} onClick={onRemove}><Trash2 className="size-4" /></Button>}</TableCell>
    </TableRow>
  );
}
```

- [ ] **Step 4: Create `src/features/purchase-bills/BillForm.tsx`**

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
import { DocumentTotals } from '@/features/documents/DocumentTotals';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';
import { accountsApi } from '@/features/accounts/hooks';
import { BillLineRow } from './BillLineRow';
import { purchaseBillsApi } from './hooks';
import { billFormSchema, type BillFormValues, type PurchaseBill } from './schema';

const EMPTY_LINE = { description: '', accountId: '', quantity: '1', unitPrice: '', taxCodeIds: [] as string[] };

function toFormValues(bill: PurchaseBill): BillFormValues {
  return {
    partnerId: bill.partnerId,
    date: bill.date.slice(0, 10),
    dueDate: bill.dueDate ? bill.dueDate.slice(0, 10) : '',
    vendorInvoiceNo: bill.vendorInvoiceNo ?? '',
    description: bill.description ?? '',
    lines: bill.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
  };
}

interface Props {
  mode: 'create' | 'edit';
  bill?: PurchaseBill;
  onSaved: () => void;
  startEmpty?: boolean;
  readOnly?: boolean;
}

export function BillForm({ mode, bill, onSaved, startEmpty, readOnly }: Props) {
  const t = useT();
  const create = purchaseBillsApi.useCreate();
  const update = purchaseBillsApi.useUpdate();
  const accounts = accountsApi.useList();
  const apAccountId = accounts.data?.find((a) => a.code === '2-1000')?.id;

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: bill
      ? toFormValues(bill)
      : { partnerId: '', date: '', dueDate: '', vendorInvoiceNo: '', description: '', lines: startEmpty ? [] : [{ ...EMPTY_LINE }] },
  });
  const lines = useFieldArray({ control: form.control, name: 'lines' });

  const watched = form.watch('lines');
  const previewLines = useMemo(
    () => (watched ?? []).filter((l) => l.accountId).map((l) => ({ accountId: l.accountId, amount: safeAmount(l.quantity, l.unitPrice), taxCodeIds: l.taxCodeIds })),
    [watched],
  );

  function onSubmit(values: BillFormValues) {
    const payload = {
      partnerId: values.partnerId,
      date: values.date,
      dueDate: values.dueDate || undefined,
      vendorInvoiceNo: values.vendorInvoiceNo || undefined,
      description: values.description || undefined,
      lines: values.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    };
    const onError = (err: unknown) => applyApiErrorToForm(err, form, t);
    if (mode === 'edit' && bill) {
      update.mutate({ id: bill.id, data: payload }, { onSuccess: () => { toast.success(t.crud.saved); onSaved(); }, onError });
    } else {
      create.mutate(payload, { onSuccess: () => { toast.success(t.crud.saved); onSaved(); }, onError });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {readOnly ? (
        <div className="rounded-md border border-muted bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {bill?.status === 'VOID' ? t.purchaseBills.readOnlyVoid : t.purchaseBills.readOnlyPosted}
          {bill?.billRef ? ` (${bill.billRef})` : ''}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="space-y-1.5">
          <Label>{t.purchaseBills.partner}</Label>
          <PartnerSelect value={form.watch('partnerId')} onChange={(id) => form.setValue('partnerId', id, { shouldValidate: true })} filter="vendor" aria-label={t.purchaseBills.partner} placeholder={t.purchaseBills.selectPartner} disabled={readOnly} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">{t.purchaseBills.date}</Label>
          <Input id="date" type="date" aria-label={t.purchaseBills.date} disabled={readOnly} {...form.register('date')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDate">{t.purchaseBills.dueDate}</Label>
          <Input id="dueDate" type="date" aria-label={t.purchaseBills.dueDate} disabled={readOnly} {...form.register('dueDate')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vinv">{t.purchaseBills.vendorInvoiceNo}</Label>
          <Input id="vinv" aria-label={t.purchaseBills.vendorInvoiceNo} disabled={readOnly} {...form.register('vendorInvoiceNo')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">{t.purchaseBills.description}</Label>
          <Input id="desc" aria-label={t.purchaseBills.description} disabled={readOnly} {...form.register('description')} />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.purchaseBills.lineDescription}</TableHead>
              <TableHead>{t.purchaseBills.account}</TableHead>
              <TableHead className="text-right">{t.purchaseBills.quantity}</TableHead>
              <TableHead className="text-right">{t.purchaseBills.unitPrice}</TableHead>
              <TableHead>{t.purchaseBills.taxes}</TableHead>
              <TableHead className="text-right">{t.purchaseBills.lineAmount}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.fields.map((f, i) => (
              <BillLineRow key={f.id} form={form} index={i} onRemove={() => lines.remove(i)} readOnly={readOnly} />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-start justify-between gap-4">
        {readOnly ? <div /> : (
          <Button type="button" variant="outline" onClick={() => lines.append({ ...EMPTY_LINE })}>
            <Plus className="size-4" /> {t.purchaseBills.addLine}
          </Button>
        )}
        <DocumentTotals nature="PURCHASE" settlementAccountId={apAccountId} lines={previewLines} />
      </div>

      {form.formState.errors.lines ? (<p role="alert" className="text-sm text-destructive">{t.purchaseBills.atLeastOneLine}</p>) : null}
      {form.formState.errors.partnerId ? (<p role="alert" className="text-sm text-destructive">{t.purchaseBills.selectPartner}</p>) : null}
      {form.formState.errors.date ? (<p role="alert" className="text-sm text-destructive">{t.purchaseBills.required}</p>) : null}
      {form.formState.errors.root ? (<p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSaved}>{t.common.cancel}</Button>
        {readOnly ? null : (<Button type="submit" disabled={create.isPending || update.isPending}>{t.purchaseBills.saveDraft}</Button>)}
      </div>
    </form>
  );
}

function safeAmount(qty: string, price: string): string {
  try { return Money.from(qty || '0').times(price || '0').toApi(); } catch { return '0'; }
}
```

- [ ] **Step 5: Run tests to verify they pass** — `pnpm test --run src/features/purchase-bills/BillForm.test.tsx src/features/purchase-bills/BillForm.readonly.test.tsx` (PASS, 3 tests total).

- [ ] **Step 6: Commit**

```bash
git add src/features/purchase-bills/BillLineRow.tsx src/features/purchase-bills/BillForm.tsx src/features/purchase-bills/BillForm.test.tsx src/features/purchase-bills/BillForm.readonly.test.tsx
git commit -m "feat(purchase-bills): draft editor (BillForm + BillLineRow)"
```

---

### Task 6: List — `columns` + `PurchaseBillsPage`

**Files:**
- Create: `src/features/purchase-bills/columns.tsx`
- Create: `src/features/purchase-bills/PurchaseBillsPage.tsx`
- Test: `src/features/purchase-bills/PurchaseBillsPage.test.tsx`

> Note: this task is verified with `pnpm test --run` (Vitest), NOT `pnpm build` — `columns`/`PurchaseBillsPage` reference `/purchase-bills/*` routes that don't exist until Task 7, so a full `tsc` would flag the typed `Link` until then. The full build runs in Task 7.

- [ ] **Step 1: Write the failing test** — create `src/features/purchase-bills/PurchaseBillsPage.test.tsx`:

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
import { PurchaseBillsPage } from './PurchaseBillsPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => useSession.getState().clear());

const onePartner = [{ id: 'p1', code: 'VEND-1', name: 'PT Pemasok', isCustomer: false, isVendor: true, isActive: true }];
const draftBill = { id: 'b1', billNumber: null, billRef: null, vendorInvoiceNo: 'VINV-1', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z', dueDate: null, description: 'x', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] };
const postedBill = { ...draftBill, id: 'b2', billNumber: 1, billRef: 'BILL/2026/000001', status: 'POSTED' };

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute();
  const index = createRoute({ getParentRoute: () => root, path: '/', component: () => <PurchaseBillsPage /> });
  const newR = createRoute({ getParentRoute: () => root, path: '/purchase-bills/new', component: () => null });
  const editR = createRoute({ getParentRoute: () => root, path: '/purchase-bills/$id/edit', component: () => null });
  const router = createRouter({ routeTree: root.addChildren([index, newR, editR]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  return render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
}

it('lists bills with the joined vendor name; ACCOUNTANT sees New but not Posting', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/purchase-bills`, () => HttpResponse.json([draftBill])),
    http.get(`${API}/partners`, () => HttpResponse.json(onePartner)),
  );
  renderPage();
  expect(await screen.findByText('PT Pemasok')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /tagihan baru/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Posting' })).not.toBeInTheDocument();
});

it('APPROVER posts a draft with an idempotency key', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  let seenKey: string | null = null;
  server.use(
    http.get(`${API}/purchase-bills`, () => HttpResponse.json([draftBill])),
    http.get(`${API}/partners`, () => HttpResponse.json(onePartner)),
    http.post(`${API}/purchase-bills/b1/post`, ({ request }) => { seenKey = request.headers.get('Idempotency-Key'); return HttpResponse.json({ ...draftBill, status: 'POSTED', billNumber: 1, billRef: 'BILL/2026/000001' }); }),
  );
  renderPage();
  await screen.findByText('PT Pemasok');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(seenKey).toBeTruthy());
});

it('shows the SoD message when post returns 403 SEGREGATION_OF_DUTIES', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  server.use(
    http.get(`${API}/purchase-bills`, () => HttpResponse.json([draftBill])),
    http.get(`${API}/partners`, () => HttpResponse.json(onePartner)),
    http.post(`${API}/purchase-bills/b1/post`, () => HttpResponse.json({ code: 'SEGREGATION_OF_DUTIES', message: 'no self-approve' }, { status: 403 })),
  );
  renderPage();
  await screen.findByText('PT Pemasok');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(messages.roles.segregationOfDuties));
});

it('APPROVER voids a posted bill', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '2', email: 'b@b.c', role: 'APPROVER' });
  let voided = false;
  server.use(
    http.get(`${API}/purchase-bills`, () => HttpResponse.json([postedBill])),
    http.get(`${API}/partners`, () => HttpResponse.json(onePartner)),
    http.post(`${API}/purchase-bills/b2/void`, () => { voided = true; return HttpResponse.json({ ...postedBill, status: 'VOID' }); }),
  );
  renderPage();
  await screen.findByText('PT Pemasok');
  await user.click(screen.getByRole('button', { name: 'Batalkan' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Batalkan' }));
  await waitFor(() => expect(voided).toBe(true));
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/purchase-bills/PurchaseBillsPage.test.tsx` (FAIL: cannot resolve `./PurchaseBillsPage`).

- [ ] **Step 3: Create `src/features/purchase-bills/columns.tsx`**

```tsx
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/common/MoneyText';
import { RoleGate } from '@/components/common/RoleGate';
import { formatDateID } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import type { PurchaseBill } from './schema';

const col = createColumnHelper<PurchaseBill>();

function statusLabel(t: Messages, status: string): string {
  if (status === 'DRAFT') return t.purchaseBills.statusDraft;
  if (status === 'POSTED') return t.purchaseBills.statusPosted;
  return t.purchaseBills.statusVoid;
}

export function buildBillColumns(
  t: Messages,
  partnerName: (id: string) => string,
  handlers: { onDelete: (bill: PurchaseBill) => void; onPost: (bill: PurchaseBill) => void; onVoid: (bill: PurchaseBill) => void },
) {
  return [
    col.accessor('billRef', { header: t.purchaseBills.number, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('partnerId', { header: t.purchaseBills.partner, cell: (c) => partnerName(c.getValue()) }),
    col.accessor('date', { header: t.purchaseBills.date, cell: (c) => formatDateID(c.getValue().slice(0, 10)) }),
    col.accessor('vendorInvoiceNo', { header: t.purchaseBills.vendorInvoiceNo, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('status', { header: t.purchaseBills.status, cell: (c) => <Badge variant={c.getValue() === 'DRAFT' ? 'secondary' : 'default'}>{statusLabel(t, c.getValue())}</Badge> }),
    col.accessor('total', { header: t.purchaseBills.total, cell: (c) => <MoneyText value={c.getValue()} /> }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => {
        const bill = c.row.original;
        return (
          <div className="flex justify-end gap-1">
            {bill.status === 'DRAFT' ? (
              <>
                <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
                  <Button asChild variant="ghost" size="sm"><Link to="/purchase-bills/$id/edit" params={{ id: bill.id }}>{t.common.edit}</Link></Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onDelete(bill)}>{t.common.delete}</Button>
                </RoleGate>
                <RoleGate allow={['APPROVER', 'ADMIN']}>
                  <Button variant="ghost" size="sm" onClick={() => handlers.onPost(bill)}>{t.purchaseBills.post}</Button>
                </RoleGate>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/purchase-bills/$id/edit" params={{ id: bill.id }}>{t.purchaseBills.view}</Link></Button>
                {bill.status === 'POSTED' ? (
                  <RoleGate allow={['APPROVER', 'ADMIN']}>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlers.onVoid(bill)}>{t.purchaseBills.void}</Button>
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

- [ ] **Step 4: Create `src/features/purchase-bills/PurchaseBillsPage.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { RoleGate } from '@/components/common/RoleGate';
import { useT } from '@/lib/i18n/useT';
import { toastApiError } from '@/lib/api/toastApiError';
import { partnersApi } from '@/features/partners/hooks';
import { buildBillColumns } from './columns';
import { purchaseBillsApi, usePostBill, useVoidBill } from './hooks';
import type { PurchaseBill } from './schema';

const STATUSES = ['ALL', 'DRAFT', 'POSTED', 'VOID'] as const;

type PendingAction = { kind: 'delete' | 'post' | 'void'; bill: PurchaseBill; idempotencyKey?: string };

export function PurchaseBillsPage() {
  const t = useT();
  const list = purchaseBillsApi.useList();
  const partners = partnersApi.useList();
  const remove = purchaseBillsApi.useRemove();
  const post = usePostBill();
  const voidBill = useVoidBill();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [action, setAction] = useState<PendingAction | null>(null);

  const partnerName = useMemo(() => {
    const map = new Map((partners.data ?? []).map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? id;
  }, [partners.data]);

  const columns = useMemo(
    () => buildBillColumns(t, partnerName, {
      onDelete: (bill) => setAction({ kind: 'delete', bill }),
      onPost: (bill) => setAction({ kind: 'post', bill, idempotencyKey: crypto.randomUUID() }),
      onVoid: (bill) => setAction({ kind: 'void', bill, idempotencyKey: crypto.randomUUID() }),
    }),
    [t, partnerName],
  );

  function runAction() {
    if (!action) return;
    const close = () => setAction(null);
    if (action.kind === 'delete') {
      remove.mutate(action.bill.id, { onSuccess: () => { toast.success(t.crud.deleted); close(); }, onError: () => toast.error(t.common.error) });
    } else if (action.kind === 'post') {
      post.mutate({ id: action.bill.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.purchaseBills.posted); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    } else {
      voidBill.mutate({ id: action.bill.id, idempotencyKey: action.idempotencyKey! }, { onSuccess: () => { toast.success(t.purchaseBills.voided); close(); }, onError: (e) => { toastApiError(e, t); close(); } });
    }
  }

  const confirmCopy = {
    delete: { title: t.crud.confirmDeleteTitle, desc: t.crud.confirmDeleteDesc, label: t.common.delete },
    post: { title: t.purchaseBills.confirmPostTitle, desc: t.purchaseBills.confirmPostDesc, label: t.purchaseBills.post },
    void: { title: t.purchaseBills.confirmVoidTitle, desc: t.purchaseBills.confirmVoidDesc, label: t.purchaseBills.void },
  } as const;

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (list.data ?? []).filter((bill) => {
      if (status !== 'ALL' && bill.status !== status && !(status === 'VOID' && bill.status.startsWith('VOID'))) return false;
      return !q || (bill.billRef ?? '').toLowerCase().includes(q) || partnerName(bill.partnerId).toLowerCase().includes(q);
    });
  }, [list.data, search, status, partnerName]);

  return (
    <div>
      <PageHeader title={t.purchaseBills.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button asChild><Link to="/purchase-bills/new"><Plus className="size-4" /> {t.purchaseBills.newBill}</Link></Button>
        </RoleGate>
      } />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
              {s === 'ALL' ? t.purchaseBills.statusAll : s === 'DRAFT' ? t.purchaseBills.statusDraft : s === 'POSTED' ? t.purchaseBills.statusPosted : t.purchaseBills.statusVoid}
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
        pending={remove.isPending || post.isPending || voidBill.isPending}
        onConfirm={runAction}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes** — `pnpm test --run src/features/purchase-bills/PurchaseBillsPage.test.tsx` (PASS, 4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/purchase-bills/columns.tsx src/features/purchase-bills/PurchaseBillsPage.tsx src/features/purchase-bills/PurchaseBillsPage.test.tsx
git commit -m "feat(purchase-bills): list page + role-gated columns"
```

---

### Task 7: Editor page + routes + nav + full verification

**Files:**
- Create: `src/features/purchase-bills/BillEditorPage.tsx`
- Create: `src/app/routes/_app/purchase-bills.tsx`, `.index.tsx`, `.new.tsx`, `.$id.edit.tsx`
- Modify: `src/components/common/AppShell.tsx`

- [ ] **Step 1: Create `src/features/purchase-bills/BillEditorPage.tsx`**

```tsx
import { useNavigate } from '@tanstack/react-router';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n/useT';
import { BillForm } from './BillForm';
import { purchaseBillsApi } from './hooks';

export function BillEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/purchase-bills' });
  const item = purchaseBillsApi.useItem(id ?? '');

  if (!id) {
    return (
      <div>
        <PageHeader title={t.purchaseBills.newBill} />
        <BillForm mode="create" onSaved={goList} />
      </div>
    );
  }
  if (item.isLoading) return <Skeleton className="h-96 w-full" />;
  if (item.isError || !item.data) return <ErrorState error={item.error} />;
  const readOnly = item.data.status !== 'DRAFT';
  return (
    <div>
      <PageHeader title={readOnly ? t.purchaseBills.view : t.purchaseBills.editBill} />
      <BillForm mode="edit" bill={item.data} onSaved={goList} readOnly={readOnly} />
    </div>
  );
}
```

- [ ] **Step 2: Create the four route files**

`src/app/routes/_app/purchase-bills.tsx`:

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/purchase-bills')({
  component: () => <Outlet />,
});
```

`src/app/routes/_app/purchase-bills.index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PurchaseBillsPage } from '@/features/purchase-bills/PurchaseBillsPage';

export const Route = createFileRoute('/_app/purchase-bills/')({
  component: PurchaseBillsPage,
});
```

`src/app/routes/_app/purchase-bills.new.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { BillEditorPage } from '@/features/purchase-bills/BillEditorPage';

export const Route = createFileRoute('/_app/purchase-bills/new')({
  component: function NewBillRoute() {
    return <BillEditorPage />;
  },
});
```

`src/app/routes/_app/purchase-bills.$id.edit.tsx`:

```tsx
import { createFileRoute, useParams } from '@tanstack/react-router';
import { BillEditorPage } from '@/features/purchase-bills/BillEditorPage';

export const Route = createFileRoute('/_app/purchase-bills/$id/edit')({
  component: function EditBillRoute() {
    const { id } = useParams({ from: '/_app/purchase-bills/$id/edit' });
    return <BillEditorPage id={id} />;
  },
});
```

- [ ] **Step 3: Regenerate the route tree**

The new route files must be added to `src/routeTree.gen.ts` (written by the `@tanstack/router-plugin` Vite plugin) before `tsc` will accept the typed `Link`/`navigate` calls. Start the dev server in the background to trigger regeneration, wait until the tree contains the routes, then stop it:

Run (background): `pnpm dev`
Then poll until this succeeds: `grep -q "purchase-bills" src/routeTree.gen.ts && echo REGENERATED`
Expected: prints `REGENERATED` (a few seconds). Then stop the dev server.

- [ ] **Step 4: Add the nav item in `AppShell.tsx`**

In `src/components/common/AppShell.tsx`: add `ReceiptText` to the `lucide-react` import, and add the nav entry after the Sales Invoices line:

```tsx
import {
  BookText,
  LayoutDashboard,
  Users,
  Receipt,
  ReceiptText,
  Percent,
  Wallet,
  LogOut,
} from 'lucide-react';
// …inside the `nav` array, after the sales-invoices entry:
    { to: '/sales-invoices', label: t.nav.salesInvoices, icon: Receipt },
    { to: '/purchase-bills', label: t.nav.purchaseBills, icon: ReceiptText },
    { to: '/payments', label: t.nav.payments, icon: Wallet },
```

(If `ReceiptText` is unavailable in the installed `lucide-react`, use `FileText` instead.)

- [ ] **Step 5: Full verification**

Run: `pnpm test --run`
Expected: all green — 134 (pre-feature) + new dashboard count was 134 at last merge; this feature adds schema(5) + hooks(2) + BillForm(3) + PurchaseBillsPage(4) = 14 new, and the tax-core tests were moved (not added). Expected total **148 passed**.
Run: `pnpm lint`
Expected: 0 errors (pre-existing react-compiler warnings on form/table files are acceptable; `BillForm`/`BillLineRow` follow the same accepted `form.watch` pattern).
Run: `pnpm build`
Expected: succeeds — `tsc -b` now accepts the typed routes, Vite emits the `purchase-bills` chunk.

- [ ] **Step 6: Dev smoke (optional)**

`pnpm dev`, log in (creds in `.env`), open `/purchase-bills`; create a bill against a vendor with a PPN_INPUT line (totals compute via `/tax/calculate`), save the draft, then as APPROVER post it and confirm it goes read-only with a `BILL/…` ref. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/features/purchase-bills/BillEditorPage.tsx src/app/routes/_app/purchase-bills.tsx src/app/routes/_app/purchase-bills.index.tsx src/app/routes/_app/purchase-bills.new.tsx "src/app/routes/_app/purchase-bills.\$id.edit.tsx" src/components/common/AppShell.tsx src/routeTree.gen.ts
git commit -m "feat(purchase-bills): editor page, routes, and nav entry"
```

---

## Done Criteria

- `/purchase-bills` lists bills (status filter, vendor-name join, search), gated "Buat" for ACCOUNTANT+, nav entry present.
- Draft editor creates/updates bills against vendors, with PPN_INPUT/PPH_PAYABLE tax codes, AP `2-1000` settlement, live `/tax/calculate` totals (`nature:'PURCHASE'`), and an optional `vendorInvoiceNo`.
- Post/void with Idempotency-Key + SoD-distinct error toasts; role-gated (APPROVER/ADMIN); posted/void bills open read-only with the `billRef`.
- The shared tax core lives in `src/features/documents/` and is consumed by both features; sales-invoice suites stay green.
- All money via `Money`/`MoneyText` (no floats); responses validated by the tolerant `purchaseBillSchema`.
- All tests pass (~148); lint clean; build green.

## Out of Scope (YAGNI)

DISBURSEMENT payments against bills (separate slice), PO matching / partial receipts / recurring bills / attachments, editing posted bills, and full generalization of the invoice/bill editor.

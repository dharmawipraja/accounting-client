# DocumentEditor Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the near-identical `InvoiceForm` + `BillForm` (and `InvoiceLineRow`/`BillLineRow`) into one config-driven `DocumentEditor` (+ generic `DocumentLineRow`) in `src/features/documents/`, parameterized by nature, with a type-safe `extraHeaderField` for the bill-only `vendorInvoiceNo`.

**Architecture:** `DocumentEditor<TItem, TFormValues, TCreate, TUpdate>({ config, mode, doc, readOnly, onSaved })` owns the RHF setup, the `lines` field array, the `previewLines`/`<DocumentTotals>` preview, the create/edit submit, and the readOnly mode. A `DocumentEditorConfig` (mirroring card 1's `DocumentListConfig`) supplies nature/account-code/tax-kinds/partner-filter, the form schema, `toFormValues`/`toPayload`, injected `create`/`update` mutations, an explicit `labels` struct, `docRef`, and an optional `extraHeaderField`. Shared schema primitives (`numericString`, `documentLineFormSchema`, `documentHeaderSchema`, `EMPTY_LINE`, `safeAmount`) move to `documents/`. Each feature keeps a thin `useXxxEditorConfig()` hook + its page wrapper; the per-feature `*Form`/`*LineRow` components are deleted.

**Tech Stack:** React 19, TypeScript (strict), react-hook-form + @hookform/resolvers/zod, Zod v4, TanStack Query/Table, decimal.js (`Money`), MSW v2, Vitest 4 + RTL.

## Global Constraints

- **i18n:** every user-facing string via `useT()`; no hardcoded copy; no em-dashes. The editor reads `t.crud.saved`, `t.common.cancel`, and passes `t` to `applyApiErrorToForm`; all document copy comes from `config.labels` (built from `useT()` in the config hook). The `${code} — ${name}` in account display is a data-format string (existing), not new UI copy.
- **Money:** decimal.js via `Money` (`safeAmount` = `Money.from(qty||'0').times(price||'0').toApi()`; line-row display amount = `.toRupiah()`); never JS floats.
- **Async UI:** `QueryState` wrapping stays in the editor pages (unchanged).
- **Redesign-preserve:** routes, nav labels, form-field names, aria-labels, and DOM structure unchanged — the migrated editors render identically (the existing tests are the proof).
- **Typecheck reality:** `pnpm exec tsc --noEmit` does NOT typecheck test files in this repo; **`pnpm run build` (`tsc -b && vite build`) is the real typecheck** and must pass. Run it before each commit.
- **Pre-existing ESLint warnings** (React-Compiler / react-hook-form `watch()` / TanStack Table — 9 total) are expected; do not "fix" them. Do not introduce new lint errors or `eslint-disable` for rules-of-hooks (use `use`-prefixed names where a hook is called).
- **Commands:** Build/typecheck `pnpm run build` · Tests `pnpm test --run` · one file `pnpm test --run <path>` · Lint `pnpm run lint`.

## File Structure

- **Create** `src/features/documents/documentFormSchema.ts` — `numericString`, `documentLineFormSchema` + `DocumentLineFormValues`, `documentHeaderSchema` + `DocumentHeaderValues`, `EMPTY_LINE`, `safeAmount`.
- **Create** `src/features/documents/documentFormSchema.test.ts` — tests for the moved line/header schema.
- **Create** `src/features/documents/DocumentLineRow.tsx` — generic line row.
- **Create** `src/features/documents/DocumentEditor.tsx` — config types + the editor component.
- **Create** `src/features/documents/DocumentEditor.test.tsx` — authoritative interface suite (synthetic config + MSW).
- **Create** `src/features/sales-invoices/editorConfig.ts` — `useInvoiceEditorConfig()`.
- **Create** `src/features/purchase-bills/editorConfig.ts` — `useBillEditorConfig()`.
- **Modify** `src/features/sales-invoices/schema.ts`, `src/features/purchase-bills/schema.ts` — compose form schemas from the shared base; keep back-compat exports + response schemas + payload types.
- **Modify** `src/features/sales-invoices/InvoiceEditorPage.tsx`, `src/features/purchase-bills/BillEditorPage.tsx` — render `<DocumentEditor config={...} .../>`.
- **Modify (repoint, assertions unchanged)** `src/features/sales-invoices/InvoiceForm.test.tsx`, `InvoiceForm.readonly.test.tsx`, `src/features/purchase-bills/BillForm.test.tsx`, `BillForm.readonly.test.tsx`.
- **Delete** `src/features/sales-invoices/InvoiceForm.tsx`, `InvoiceLineRow.tsx`, `src/features/purchase-bills/BillForm.tsx`, `BillLineRow.tsx`.
- **Unchanged:** `DocumentTotals.tsx` (props `{ nature, settlementAccountId, lines }`), `useTaxPreview`, `taxCalcSchema`, the route files (they import the *EditorPage*, not the form), both `hooks.ts`, both `schema.test.ts`.

**Interface reference:**
- `DocumentTotals` props: `{ nature: 'SALE'|'PURCHASE', settlementAccountId?: string, lines: { accountId; amount; taxCodeIds }[] }`.
- `salesInvoicesApi`/`purchaseBillsApi` via `createResourceHooks`: `useCreate()` → `UseMutationResult<TItem, ApiError, TCreate>`, `useUpdate()` → `UseMutationResult<TItem, ApiError, { id: string; data: TUpdate }>`, `useItem(id)`.
- `applyApiErrorToForm(err, form, t)` (`@/lib/api/form-errors`). `PartnerSelect` (`filter`, `value`, `onChange`, `aria-label`, `placeholder`, `disabled`). `AccountSelect`, `MoneyInput`, `TaxCodeMultiSelect` (`allowedKinds`), `Money` (`@/lib/money/money`), `cn` (`@/lib/utils`).

---

### Task 1: Shared form-schema primitives in `documents/`

**Files:**
- Create: `src/features/documents/documentFormSchema.ts`
- Test: `src/features/documents/documentFormSchema.test.ts`
- Modify: `src/features/sales-invoices/schema.ts`, `src/features/purchase-bills/schema.ts`

**Interfaces:**
- Produces: `numericString`, `documentLineFormSchema`, `DocumentLineFormValues`, `documentHeaderSchema`, `DocumentHeaderValues`, `EMPTY_LINE`, `safeAmount` — consumed by Tasks 2–4. Feature schemas keep `invoiceFormSchema`/`InvoiceFormValues`/`invoiceLineFormSchema`, `billFormSchema`/`BillFormValues`/`billLineFormSchema`, the response schemas, and the payload types (back-compat).

- [ ] **Step 1: Write the failing test**

Create `src/features/documents/documentFormSchema.test.ts`:

```ts
import { expect, it, describe } from 'vitest';
import { documentLineFormSchema, documentHeaderSchema, EMPTY_LINE, safeAmount } from './documentFormSchema';

describe('documentLineFormSchema', () => {
  it('accepts a valid line', () => {
    expect(documentLineFormSchema.safeParse({ description: 'x', accountId: 'a1', quantity: '2', unitPrice: '1000', taxCodeIds: [] }).success).toBe(true);
  });
  it('rejects zero quantity', () => {
    expect(documentLineFormSchema.safeParse({ description: 'x', accountId: 'a1', quantity: '0', unitPrice: '1000', taxCodeIds: [] }).success).toBe(false);
  });
  it('rejects a missing account', () => {
    expect(documentLineFormSchema.safeParse({ description: 'x', accountId: '', quantity: '1', unitPrice: '1000', taxCodeIds: [] }).success).toBe(false);
  });
});

describe('documentHeaderSchema', () => {
  it('requires partner, date, and at least one line', () => {
    const r = documentHeaderSchema.safeParse({ partnerId: '', date: '', dueDate: '', description: '', lines: [] });
    expect(r.success).toBe(false);
  });
  it('accepts a valid header', () => {
    const r = documentHeaderSchema.safeParse({ partnerId: 'p1', date: '2026-06-25', dueDate: '', description: '', lines: [{ ...EMPTY_LINE, accountId: 'a1', unitPrice: '1000' }] });
    expect(r.success).toBe(true);
  });
});

describe('safeAmount', () => {
  it('multiplies as decimal strings', () => {
    expect(safeAmount('2', '500000')).toBe('1000000.0000');
  });
  it('returns 0 on garbage input', () => {
    expect(safeAmount('abc', 'x')).toBe('0');
  });
});
```

- [ ] **Step 2: Run it to verify failure**

Run: `pnpm test --run src/features/documents/documentFormSchema.test.ts`
Expected: FAIL — cannot resolve `./documentFormSchema`.

- [ ] **Step 3: Create the shared module**

Create `src/features/documents/documentFormSchema.ts`:

```ts
import { z } from 'zod';
import { Money } from '@/lib/money/money';

export const numericString = (msg: string) => z.string().regex(/^\d+(\.\d+)?$/, msg);

export const documentLineFormSchema = z.object({
  description: z.string().min(1),
  accountId: z.string().min(1, 'selectAccount'),
  quantity: numericString('invalidQuantity').refine((v) => Number(v) > 0, 'invalidQuantity'),
  unitPrice: numericString('invalidPrice'),
  taxCodeIds: z.array(z.string()),
});
export type DocumentLineFormValues = z.infer<typeof documentLineFormSchema>;

export const documentHeaderSchema = z.object({
  partnerId: z.string().min(1, 'selectPartner'),
  date: z.string().min(1, 'required'),
  dueDate: z.string(),
  description: z.string(),
  lines: z.array(documentLineFormSchema).min(1, 'atLeastOneLine'),
});
export type DocumentHeaderValues = z.infer<typeof documentHeaderSchema>;

export const EMPTY_LINE: DocumentLineFormValues = {
  description: '', accountId: '', quantity: '1', unitPrice: '', taxCodeIds: [],
};

export function safeAmount(qty: string, price: string): string {
  try {
    return Money.from(qty || '0').times(price || '0').toApi();
  } catch {
    return '0';
  }
}
```

- [ ] **Step 4: Refactor `sales-invoices/schema.ts` to compose from the base (keep exports)**

In `src/features/sales-invoices/schema.ts`, replace the local `numericString`, `invoiceLineFormSchema`, and `invoiceFormSchema` block (the current lines `const numericString = ...` through `export type InvoiceFormValues = ...`) with re-exports/compositions from the shared module. Keep the `salesInvoiceSchema` response schema and the payload types unchanged. Add the import at the top and replace the block:

```ts
// add to the top imports:
import { documentLineFormSchema, documentHeaderSchema, type DocumentLineFormValues } from '@/features/documents/documentFormSchema';

// replace the old numericString + invoiceLineFormSchema + invoiceFormSchema definitions with:
export const invoiceLineFormSchema = documentLineFormSchema;
export type InvoiceLineFormValues = DocumentLineFormValues;

export const invoiceFormSchema = documentHeaderSchema;
export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
```

(`z` is already imported in the file. The `salesInvoiceSchema`, `SalesInvoiceLine`, `SalesInvoice`, `SalesInvoiceCreatePayload`, `SalesInvoiceUpdatePayload` exports stay exactly as they are.)

- [ ] **Step 5: Refactor `purchase-bills/schema.ts` to extend the base (keep exports)**

In `src/features/purchase-bills/schema.ts`, replace the local `numericString`, `billLineFormSchema`, and `billFormSchema` block with:

```ts
// add to the top imports:
import { documentLineFormSchema, documentHeaderSchema, type DocumentLineFormValues } from '@/features/documents/documentFormSchema';

// replace the old numericString + billLineFormSchema + billFormSchema definitions with:
export const billLineFormSchema = documentLineFormSchema;
export type BillLineFormValues = DocumentLineFormValues;

export const billFormSchema = documentHeaderSchema.extend({ vendorInvoiceNo: z.string() });
export type BillFormValues = z.infer<typeof billFormSchema>;
```

(`purchaseBillSchema`, `PurchaseBillLine`, `PurchaseBill`, `PurchaseBillCreatePayload`, `PurchaseBillUpdatePayload` stay unchanged.)

- [ ] **Step 6: Run the new + existing schema tests**

Run: `pnpm test --run src/features/documents/documentFormSchema.test.ts src/features/sales-invoices/schema.test.ts src/features/purchase-bills/schema.test.ts`
Expected: PASS. The new module's 7 tests pass; the two feature `schema.test.ts` suites pass unchanged (the form/line schemas are now the shared ones, but the exported names + parse behavior are identical — `billFormSchema` still requires `vendorInvoiceNo`).

- [ ] **Step 7: Build (real typecheck) + commit**

Run: `pnpm run build` → succeeds (0 TS errors).

```bash
git add src/features/documents/documentFormSchema.ts src/features/documents/documentFormSchema.test.ts src/features/sales-invoices/schema.ts src/features/purchase-bills/schema.ts
git commit -m "refactor(documents): shared document form-schema primitives

numericString + documentLineFormSchema + documentHeaderSchema + EMPTY_LINE +
safeAmount move to features/documents/; feature schemas compose from the base
(invoice == base; bill extends with vendorInvoiceNo)."
```

---

### Task 2: `DocumentEditor` + `DocumentLineRow` + interface suite

**Files:**
- Create: `src/features/documents/DocumentLineRow.tsx`
- Create: `src/features/documents/DocumentEditor.tsx`
- Test: `src/features/documents/DocumentEditor.test.tsx`

**Interfaces:**
- Consumes: Task 1's `documentFormSchema` exports; `DocumentTotals`; `applyApiErrorToForm`; `accountsApi`; `Money`; `cn`.
- Produces: `DocumentEditor`, `DocumentEditorConfig<TItem, TFormValues, TCreate, TUpdate>`, `DocumentEditorLabels`, `ExtraHeaderField<TFormValues>`, `DocumentLineRow`, `DocumentLineRowLabels`. Consumed by Tasks 3–4.

- [ ] **Step 1: Create the generic `DocumentLineRow`**

Create `src/features/documents/DocumentLineRow.tsx`:

```tsx
import { Trash2 } from 'lucide-react';
import type { Path, UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { AccountSelect } from '@/components/common/AccountSelect';
import { MoneyInput } from '@/components/common/MoneyInput';
import { TaxCodeMultiSelect } from '@/components/common/TaxCodeMultiSelect';
import { Money } from '@/lib/money/money';
import type { DocumentHeaderValues } from './documentFormSchema';

export interface DocumentLineRowLabels {
  lineDescription: string;
  account: string;
  selectAccount: string;
  quantity: string;
  unitPrice: string;
  taxes: string;
  removeLine: string;
}

export function DocumentLineRow<TForm extends DocumentHeaderValues>({
  form, index, onRemove, readOnly, allowedTaxKinds, labels,
}: {
  form: UseFormReturn<TForm>;
  index: number;
  onRemove: () => void;
  readOnly?: boolean;
  allowedTaxKinds: string[];
  labels: DocumentLineRowLabels;
}) {
  // `lines.${index}.*` paths are valid because TForm extends DocumentHeaderValues (which has `lines`).
  const p = (field: string) => `lines.${index}.${field}` as Path<TForm>;
  const line = form.watch(`lines.${index}` as Path<TForm>) as DocumentHeaderValues['lines'][number];
  const amount = (() => {
    try { return Money.from(line.quantity || '0').times(line.unitPrice || '0').toRupiah(); }
    catch { return Money.zero().toRupiah(); }
  })();

  return (
    <TableRow>
      <TableCell><Input aria-label={labels.lineDescription} disabled={readOnly} {...form.register(p('description'))} /></TableCell>
      <TableCell className="min-w-48">
        <AccountSelect value={line.accountId} onChange={(id) => form.setValue(p('accountId'), id as never, { shouldValidate: true })} aria-label={labels.account} placeholder={labels.selectAccount} disabled={readOnly} />
      </TableCell>
      <TableCell className="w-20"><Input className="text-right" inputMode="decimal" aria-label={labels.quantity} disabled={readOnly} {...form.register(p('quantity'))} /></TableCell>
      <TableCell className="w-32">
        <MoneyInput value={line.unitPrice} onChange={(v) => form.setValue(p('unitPrice'), v as never)} aria-label={labels.unitPrice} disabled={readOnly} />
      </TableCell>
      <TableCell className="min-w-40">
        <TaxCodeMultiSelect value={line.taxCodeIds} onChange={(ids) => form.setValue(p('taxCodeIds'), ids as never)} allowedKinds={allowedTaxKinds} aria-label={labels.taxes} disabled={readOnly} />
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">{amount}</TableCell>
      <TableCell>{readOnly ? null : <Button type="button" variant="ghost" size="icon" aria-label={labels.removeLine} onClick={onRemove}><Trash2 className="size-4" /></Button>}</TableCell>
    </TableRow>
  );
}
```

- [ ] **Step 2: Write the failing interface test**

Create `src/features/documents/DocumentEditor.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { id as messages } from '@/lib/i18n/messages.id';
import { useT } from '@/lib/i18n/useT';
import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { DocumentEditor, type DocumentEditorConfig, type DocumentEditorLabels } from './DocumentEditor';
import { documentHeaderSchema, EMPTY_LINE, type DocumentHeaderValues } from './documentFormSchema';

afterEach(() => useSession.getState().clear());

// A synthetic "test-docs" resource exercises the real create/update path through MSW.
const testItemSchema = z.object({ id: z.string(), status: z.string(), partnerId: z.string() });
type TestItem = z.infer<typeof testItemSchema>;
type TestCreate = { partnerId: string; date: string; dueDate?: string; description?: string; lines: unknown[] };
const testApi = createResourceHooks<TestItem, TestCreate, Partial<TestCreate>>({ key: 'test-docs', basePath: '/test-docs', itemSchema: testItemSchema });

const accounts = [{ id: 'ar', code: '1-1200', name: 'Piutang', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null }];
const partners = [{ id: 'c1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }];

function labels(t: ReturnType<typeof useT>): DocumentEditorLabels {
  return {
    partner: t.salesInvoices.partner, selectPartner: t.salesInvoices.selectPartner, date: t.salesInvoices.date,
    dueDate: t.salesInvoices.dueDate, description: t.salesInvoices.description, vendorInvoiceNo: t.purchaseBills.vendorInvoiceNo,
    lineDescription: t.salesInvoices.lineDescription, account: t.salesInvoices.account, selectAccount: t.salesInvoices.selectAccount,
    quantity: t.salesInvoices.quantity, unitPrice: t.salesInvoices.unitPrice, taxes: t.salesInvoices.taxes, lineAmount: t.salesInvoices.lineAmount,
    addLine: t.salesInvoices.addLine, removeLine: t.salesInvoices.removeLine, atLeastOneLine: t.salesInvoices.atLeastOneLine,
    required: t.salesInvoices.required, saveDraft: t.salesInvoices.saveDraft, readOnlyPosted: t.salesInvoices.readOnlyPosted, readOnlyVoid: t.salesInvoices.readOnlyVoid,
  };
}

function useTestConfig(withExtra: boolean): DocumentEditorConfig<TestItem, DocumentHeaderValues, TestCreate> {
  const t = useT();
  return {
    nature: 'SALE', settlementAccountCode: '1-1200', allowedTaxKinds: ['PPN_OUTPUT'], partnerFilter: 'customer',
    formSchema: documentHeaderSchema,
    emptyForm: { partnerId: '', date: '', dueDate: '', description: '', lines: [{ ...EMPTY_LINE }] },
    toFormValues: (item) => ({ partnerId: item.partnerId, date: '2026-06-25', dueDate: '', description: '', lines: [{ ...EMPTY_LINE, accountId: 'ar', unitPrice: '1000' }] }),
    toPayload: (v) => ({ partnerId: v.partnerId, date: v.date, dueDate: v.dueDate || undefined, description: v.description || undefined, lines: v.lines }),
    create: testApi.useCreate(),
    update: testApi.useUpdate(),
    labels: labels(t),
    docRef: (item) => item.id,
    extraHeaderField: withExtra ? { name: 'description', label: t.purchaseBills.vendorInvoiceNo, inputId: 'vinv' } : undefined,
  };
}

function Harness({ withExtra = false, ...props }: { withExtra?: boolean; mode: 'create' | 'edit'; doc?: TestItem; readOnly?: boolean; onSaved: () => void; startEmpty?: boolean }) {
  const config = useTestConfig(withExtra);
  return <DocumentEditor config={config} {...props} />;
}

function renderEditor(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function baseHandlers() {
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: partners, total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/tax/codes`, () => HttpResponse.json(paged([]))),
  );
}

it('creates a draft and posts the payload', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  baseHandlers();
  let posted: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/test-docs`, async ({ request }) => {
    posted = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'x9', status: 'DRAFT', partnerId: 'c1' });
  }));
  const onSaved = vi.fn();
  renderEditor(<Harness mode="create" onSaved={onSaved} />);

  await user.click(screen.getByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-25');
  await user.click(screen.getByRole('combobox', { name: /akun/i }));
  await user.click(await screen.findByRole('option', { name: /1-1200/i }));
  await user.clear(screen.getByLabelText(/qty/i));
  await user.type(screen.getByLabelText(/qty/i), '2');
  await user.type(screen.getByLabelText(/harga satuan/i), '500000');
  await user.click(screen.getByRole('button', { name: /simpan draf/i }));

  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ partnerId: 'c1', date: '2026-06-25', lines: [{ accountId: 'ar', quantity: '2', unitPrice: '500000' }] });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it('blocks save when empty (validation errors)', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  baseHandlers();
  renderEditor(<Harness mode="create" onSaved={vi.fn()} startEmpty />);
  await user.click(screen.getByRole('button', { name: /simpan draf/i }));
  expect((await screen.findAllByText(/minimal satu baris|pilih pelanggan|wajib diisi/i)).length).toBeGreaterThan(0);
});

it('renders read-only: banner, disabled date, no Save / Add', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  baseHandlers();
  renderEditor(<Harness mode="edit" doc={{ id: 'x1', status: 'POSTED', partnerId: 'c1' }} readOnly onSaved={vi.fn()} />);
  expect(await screen.findByText(/hanya-baca/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /simpan draf/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /tambah baris/i })).not.toBeInTheDocument();
  expect(screen.getByLabelText(/tanggal/i)).toBeDisabled();
});

it('renders the extraHeaderField only when configured', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  baseHandlers();
  const { unmount } = renderEditor(<Harness mode="create" onSaved={vi.fn()} />);
  await screen.findByLabelText(/tanggal/i);
  expect(screen.queryByLabelText(/no\. faktur vendor/i)).not.toBeInTheDocument();
  unmount();
  renderEditor(<Harness withExtra mode="create" onSaved={vi.fn()} />);
  expect(await screen.findByLabelText(/no\. faktur vendor/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run it to verify failure**

Run: `pnpm test --run src/features/documents/DocumentEditor.test.tsx`
Expected: FAIL — cannot resolve `./DocumentEditor`.

- [ ] **Step 4: Create `DocumentEditor.tsx`**

Create `src/features/documents/DocumentEditor.tsx`:

```tsx
import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type Path } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ZodType } from 'zod';
import type { UseMutationResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PartnerSelect } from '@/components/common/PartnerSelect';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/lib/api/errors';
import { accountsApi } from '@/features/accounts/hooks';
import { DocumentTotals } from './DocumentTotals';
import { DocumentLineRow } from './DocumentLineRow';
import { EMPTY_LINE, safeAmount, type DocumentHeaderValues } from './documentFormSchema';

export interface DocumentEditorLabels {
  partner: string; selectPartner: string; date: string; dueDate: string; description: string;
  vendorInvoiceNo: string; lineDescription: string; account: string; selectAccount: string;
  quantity: string; unitPrice: string; taxes: string; lineAmount: string; addLine: string;
  removeLine: string; atLeastOneLine: string; required: string; saveDraft: string;
  readOnlyPosted: string; readOnlyVoid: string;
}

export interface ExtraHeaderField<TFormValues> {
  name: Extract<keyof TFormValues, string>;
  label: string;
  inputId: string;
}

export interface DocumentEditorConfig<
  TItem extends { id: string; status: string },
  TFormValues extends DocumentHeaderValues,
  TCreate,
  TUpdate = Partial<TCreate>,
> {
  nature: 'SALE' | 'PURCHASE';
  settlementAccountCode: string;
  allowedTaxKinds: string[];
  partnerFilter: 'customer' | 'vendor';
  formSchema: ZodType<TFormValues>;
  emptyForm: TFormValues;
  toFormValues: (item: TItem) => TFormValues;
  toPayload: (values: TFormValues) => TCreate;
  create: UseMutationResult<TItem, ApiError, TCreate>;
  update: UseMutationResult<TItem, ApiError, { id: string; data: TUpdate }>;
  labels: DocumentEditorLabels;
  docRef: (item: TItem) => string | null | undefined;
  extraHeaderField?: ExtraHeaderField<TFormValues>;
}

export interface DocumentEditorProps<
  TItem extends { id: string; status: string },
  TFormValues extends DocumentHeaderValues,
  TCreate,
  TUpdate = Partial<TCreate>,
> {
  config: DocumentEditorConfig<TItem, TFormValues, TCreate, TUpdate>;
  mode: 'create' | 'edit';
  doc?: TItem;
  readOnly?: boolean;
  onSaved: () => void;
  startEmpty?: boolean;
}

export function DocumentEditor<
  TItem extends { id: string; status: string },
  TFormValues extends DocumentHeaderValues,
  TCreate,
  TUpdate = Partial<TCreate>,
>({ config, mode, doc, readOnly, onSaved, startEmpty }: DocumentEditorProps<TItem, TFormValues, TCreate, TUpdate>) {
  const t = useT();
  const { create, update, labels } = config;
  const accounts = accountsApi.useList();
  const settlementAccountId = accounts.data?.find((a) => a.code === config.settlementAccountCode)?.id;

  const form = useForm<TFormValues>({
    resolver: zodResolver(config.formSchema),
    defaultValues: (doc
      ? config.toFormValues(doc)
      : startEmpty
        ? { ...config.emptyForm, lines: [] }
        : config.emptyForm) as never,
  });
  const lines = useFieldArray({ control: form.control, name: 'lines' as never });

  const watched = form.watch('lines' as Path<TFormValues>) as DocumentHeaderValues['lines'] | undefined;
  const previewLines = useMemo(
    () =>
      (watched ?? [])
        .filter((l) => l.accountId)
        .map((l) => ({ accountId: l.accountId, amount: safeAmount(l.quantity, l.unitPrice), taxCodeIds: l.taxCodeIds })),
    [watched],
  );

  function onSubmit(values: TFormValues) {
    const onError = (err: unknown) => applyApiErrorToForm(err, form, t);
    const onSuccess = () => { toast.success(t.crud.saved); onSaved(); };
    if (mode === 'edit' && doc) {
      update.mutate({ id: doc.id, data: config.toPayload(values) as unknown as TUpdate }, { onSuccess, onError });
    } else {
      create.mutate(config.toPayload(values), { onSuccess, onError });
    }
  }

  const errors = form.formState.errors as Record<string, { message?: string } | undefined>;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {readOnly ? (
        <div className="rounded-md border border-muted bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {doc?.status === 'VOID' ? labels.readOnlyVoid : labels.readOnlyPosted}
          {doc && config.docRef(doc) ? ` (${config.docRef(doc)})` : ''}
        </div>
      ) : null}
      <div className={cn('grid grid-cols-2 gap-4', config.extraHeaderField ? 'md:grid-cols-5' : 'md:grid-cols-4')}>
        <div className="space-y-1.5">
          <Label>{labels.partner}</Label>
          <PartnerSelect value={form.watch('partnerId' as Path<TFormValues>) as string} onChange={(id) => form.setValue('partnerId' as Path<TFormValues>, id as never, { shouldValidate: true })} filter={config.partnerFilter} aria-label={labels.partner} placeholder={labels.selectPartner} disabled={readOnly} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">{labels.date}</Label>
          <Input id="date" type="date" aria-label={labels.date} disabled={readOnly} {...form.register('date' as Path<TFormValues>)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDate">{labels.dueDate}</Label>
          <Input id="dueDate" type="date" aria-label={labels.dueDate} disabled={readOnly} {...form.register('dueDate' as Path<TFormValues>)} />
        </div>
        {config.extraHeaderField ? (
          <div className="space-y-1.5">
            <Label htmlFor={config.extraHeaderField.inputId}>{config.extraHeaderField.label}</Label>
            <Input id={config.extraHeaderField.inputId} aria-label={config.extraHeaderField.label} disabled={readOnly} {...form.register(config.extraHeaderField.name as Path<TFormValues>)} />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="desc">{labels.description}</Label>
          <Input id="desc" aria-label={labels.description} disabled={readOnly} {...form.register('description' as Path<TFormValues>)} />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.lineDescription}</TableHead>
              <TableHead>{labels.account}</TableHead>
              <TableHead className="text-right">{labels.quantity}</TableHead>
              <TableHead className="text-right">{labels.unitPrice}</TableHead>
              <TableHead>{labels.taxes}</TableHead>
              <TableHead className="text-right">{labels.lineAmount}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.fields.map((f, i) => (
              <DocumentLineRow key={f.id} form={form} index={i} onRemove={() => lines.remove(i)} readOnly={readOnly} allowedTaxKinds={config.allowedTaxKinds} labels={labels} />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-start justify-between gap-4">
        {readOnly ? <div /> : (
          <Button type="button" variant="outline" onClick={() => lines.append({ ...EMPTY_LINE } as never)}>
            <Plus className="size-4" /> {labels.addLine}
          </Button>
        )}
        <DocumentTotals nature={config.nature} settlementAccountId={settlementAccountId} lines={previewLines} />
      </div>

      {errors.lines ? <p role="alert" className="text-sm text-destructive">{labels.atLeastOneLine}</p> : null}
      {errors.partnerId ? <p role="alert" className="text-sm text-destructive">{labels.selectPartner}</p> : null}
      {errors.date ? <p role="alert" className="text-sm text-destructive">{labels.required}</p> : null}
      {errors.root ? <p role="alert" className="text-sm text-destructive">{errors.root.message}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSaved}>{t.common.cancel}</Button>
        {readOnly ? null : <Button type="submit" disabled={create.isPending || update.isPending}>{labels.saveDraft}</Button>}
      </div>
    </form>
  );
}
```

> The `as never` / `as Path<TFormValues>` casts are the standard, isolated price of making an RHF form generic over `TFormValues extends DocumentHeaderValues` — the runtime field names (`partnerId`, `date`, `dueDate`, `description`, `lines`, plus the extra field) are all guaranteed present by the schema. Do not widen `TFormValues` to escape them.

- [ ] **Step 5: Run the interface suite + DocumentTotals test**

Run: `pnpm test --run src/features/documents/`
Expected: PASS — the 4 DocumentEditor tests, the documentFormSchema tests, and the pre-existing `DocumentTotals.test.tsx` / `useTaxPreview.test.tsx` all pass. If the Radix combobox/dialog interactions need pointer shims, they're already in `src/test/setup.ts`.

- [ ] **Step 6: Build + commit**

Run: `pnpm run build` → succeeds.

```bash
git add src/features/documents/DocumentLineRow.tsx src/features/documents/DocumentEditor.tsx src/features/documents/DocumentEditor.test.tsx
git commit -m "feat(documents): DocumentEditor + generic DocumentLineRow

Config-driven editor (mirrors DocumentListConfig) owning RHF + field array +
previewLines/DocumentTotals + create/edit submit + readOnly, with a type-safe
extraHeaderField. Authoritative interface suite over a synthetic resource."
```

---

### Task 3: Migrate sales invoices

**Files:**
- Create: `src/features/sales-invoices/editorConfig.ts`
- Modify: `src/features/sales-invoices/InvoiceEditorPage.tsx`
- Modify (repoint): `src/features/sales-invoices/InvoiceForm.test.tsx`, `src/features/sales-invoices/InvoiceForm.readonly.test.tsx`
- Delete: `src/features/sales-invoices/InvoiceForm.tsx`, `src/features/sales-invoices/InvoiceLineRow.tsx`

**Interfaces:**
- Consumes: `DocumentEditor`, `DocumentEditorConfig`, `DocumentEditorLabels` (Task 2); `invoiceFormSchema`, `InvoiceFormValues`, `SalesInvoice`, `SalesInvoiceCreatePayload`; `salesInvoicesApi`; `EMPTY_LINE`.
- Produces: `useInvoiceEditorConfig()`.

- [ ] **Step 1: Create `useInvoiceEditorConfig()`**

Create `src/features/sales-invoices/editorConfig.ts`:

```ts
import { useT } from '@/lib/i18n/useT';
import { EMPTY_LINE } from '@/features/documents/documentFormSchema';
import type { DocumentEditorConfig, DocumentEditorLabels } from '@/features/documents/DocumentEditor';
import { salesInvoicesApi } from './hooks';
import { invoiceFormSchema, type InvoiceFormValues, type SalesInvoice, type SalesInvoiceCreatePayload } from './schema';

export function useInvoiceEditorConfig(): DocumentEditorConfig<SalesInvoice, InvoiceFormValues, SalesInvoiceCreatePayload> {
  const t = useT();
  const labels: DocumentEditorLabels = {
    partner: t.salesInvoices.partner, selectPartner: t.salesInvoices.selectPartner, date: t.salesInvoices.date,
    dueDate: t.salesInvoices.dueDate, description: t.salesInvoices.description, vendorInvoiceNo: '',
    lineDescription: t.salesInvoices.lineDescription, account: t.salesInvoices.account, selectAccount: t.salesInvoices.selectAccount,
    quantity: t.salesInvoices.quantity, unitPrice: t.salesInvoices.unitPrice, taxes: t.salesInvoices.taxes, lineAmount: t.salesInvoices.lineAmount,
    addLine: t.salesInvoices.addLine, removeLine: t.salesInvoices.removeLine, atLeastOneLine: t.salesInvoices.atLeastOneLine,
    required: t.salesInvoices.required, saveDraft: t.salesInvoices.saveDraft, readOnlyPosted: t.salesInvoices.readOnlyPosted, readOnlyVoid: t.salesInvoices.readOnlyVoid,
  };
  return {
    nature: 'SALE',
    settlementAccountCode: '1-1200',
    allowedTaxKinds: ['PPN_OUTPUT', 'PPH_PREPAID'],
    partnerFilter: 'customer',
    formSchema: invoiceFormSchema,
    emptyForm: { partnerId: '', date: '', dueDate: '', description: '', lines: [{ ...EMPTY_LINE }] },
    toFormValues: (inv) => ({
      partnerId: inv.partnerId,
      date: inv.date.slice(0, 10),
      dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : '',
      description: inv.description ?? '',
      lines: inv.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    }),
    toPayload: (v) => ({
      partnerId: v.partnerId,
      date: v.date,
      dueDate: v.dueDate || undefined,
      description: v.description || undefined,
      lines: v.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    }),
    create: salesInvoicesApi.useCreate(),
    update: salesInvoicesApi.useUpdate(),
    labels,
    docRef: (inv) => inv.invoiceRef,
  };
}
```

- [ ] **Step 2: Rewrite `InvoiceEditorPage.tsx` to render `DocumentEditor`**

Replace `src/features/sales-invoices/InvoiceEditorPage.tsx` with (the `QueryState`/`PageHeader`/`BackLink` shell is unchanged; only the form swaps):

```tsx
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { NotFound } from '@/components/common/NotFound';
import { PageHeader } from '@/components/common/PageHeader';
import { BackLink } from '@/components/common/BackLink';
import { QueryState } from '@/components/common/QueryState';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { useT } from '@/lib/i18n/useT';
import { DocumentEditor } from '@/features/documents/DocumentEditor';
import { useInvoiceEditorConfig } from './editorConfig';
import { salesInvoicesApi } from './hooks';

export function InvoiceEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/sales-invoices' });
  const config = useInvoiceEditorConfig();
  const item = salesInvoicesApi.useItem(id ?? '');

  if (!id) {
    return (
      <div>
        <PageHeader title={t.salesInvoices.newInvoice} back={<BackLink to="/sales-invoices" label={t.nav.salesInvoices} />} />
        <DocumentEditor config={config} mode="create" onSaved={goList} />
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
            <PageHeader title={readOnly ? t.salesInvoices.view : t.salesInvoices.editInvoice} back={<BackLink to="/sales-invoices" label={t.nav.salesInvoices} />} />
            <DocumentEditor config={config} mode="edit" doc={data} onSaved={goList} readOnly={readOnly} />
          </div>
        );
      }}
    </QueryState>
  );
}
```

- [ ] **Step 3: Repoint the two invoice form tests (assertions unchanged)**

In `src/features/sales-invoices/InvoiceForm.test.tsx` and `InvoiceForm.readonly.test.tsx`, replace the `InvoiceForm` import + each `<InvoiceForm .../>` render with a local harness that renders `DocumentEditor` via the real config. Apply these two edits to BOTH files:

(a) Replace the import line `import { InvoiceForm } from './InvoiceForm';` with:
```tsx
import { DocumentEditor } from '@/features/documents/DocumentEditor';
import { useInvoiceEditorConfig } from './editorConfig';

function InvoiceEditorHarness(props: { mode: 'create' | 'edit'; invoice?: import('./schema').SalesInvoice; onSaved: () => void; startEmpty?: boolean; readOnly?: boolean }) {
  const config = useInvoiceEditorConfig();
  return <DocumentEditor config={config} mode={props.mode} doc={props.invoice} onSaved={props.onSaved} startEmpty={props.startEmpty} readOnly={props.readOnly} />;
}
```

(b) Replace every `<InvoiceForm ... />` with `<InvoiceEditorHarness ... />` (the props are identical — `mode`, `invoice`, `onSaved`, `startEmpty`, `readOnly`). Change nothing else — all MSW handlers, user interactions, and `expect` assertions stay exactly as they are.

- [ ] **Step 4: Delete the per-feature form + line row**

```bash
git rm src/features/sales-invoices/InvoiceForm.tsx src/features/sales-invoices/InvoiceLineRow.tsx
```

- [ ] **Step 5: Run the sales-invoices tests**

Run: `pnpm test --run src/features/sales-invoices/`
Expected: PASS — the two repointed form tests (create posts the payload; empty-submit validation; read-only banner/disabled/no-Save) pass unchanged, plus `schema.test.ts` and `SalesInvoicesPage.test.tsx`. If a test fails, fix the **config/harness** (e.g. a wrong label key or `docRef`), never the assertions.

- [ ] **Step 6: Build + commit**

Run: `pnpm run build` → succeeds. (This also confirms no dangling import of the deleted `InvoiceForm`/`InvoiceLineRow`.)

```bash
git add -A
git commit -m "refactor(sales-invoices): InvoiceForm via DocumentEditor config

Add useInvoiceEditorConfig, render DocumentEditor from InvoiceEditorPage,
delete InvoiceForm + InvoiceLineRow, repoint the two form tests (assertions
unchanged)."
```

---

### Task 4: Migrate purchase bills + final verification

**Files:**
- Create: `src/features/purchase-bills/editorConfig.ts`
- Modify: `src/features/purchase-bills/BillEditorPage.tsx`
- Modify (repoint): `src/features/purchase-bills/BillForm.test.tsx`, `src/features/purchase-bills/BillForm.readonly.test.tsx`
- Delete: `src/features/purchase-bills/BillForm.tsx`, `src/features/purchase-bills/BillLineRow.tsx`

**Interfaces:**
- Consumes: `DocumentEditor`, `DocumentEditorConfig`, `DocumentEditorLabels`; `billFormSchema`, `BillFormValues`, `PurchaseBill`, `PurchaseBillCreatePayload`; `purchaseBillsApi`; `EMPTY_LINE`. Demonstrates `extraHeaderField` for the bill-only `vendorInvoiceNo`.

- [ ] **Step 1: Create `useBillEditorConfig()`**

Create `src/features/purchase-bills/editorConfig.ts`:

```ts
import { useT } from '@/lib/i18n/useT';
import { EMPTY_LINE } from '@/features/documents/documentFormSchema';
import type { DocumentEditorConfig, DocumentEditorLabels } from '@/features/documents/DocumentEditor';
import { purchaseBillsApi } from './hooks';
import { billFormSchema, type BillFormValues, type PurchaseBill, type PurchaseBillCreatePayload } from './schema';

export function useBillEditorConfig(): DocumentEditorConfig<PurchaseBill, BillFormValues, PurchaseBillCreatePayload> {
  const t = useT();
  const labels: DocumentEditorLabels = {
    partner: t.purchaseBills.partner, selectPartner: t.purchaseBills.selectPartner, date: t.purchaseBills.date,
    dueDate: t.purchaseBills.dueDate, description: t.purchaseBills.description, vendorInvoiceNo: t.purchaseBills.vendorInvoiceNo,
    lineDescription: t.purchaseBills.lineDescription, account: t.purchaseBills.account, selectAccount: t.purchaseBills.selectAccount,
    quantity: t.purchaseBills.quantity, unitPrice: t.purchaseBills.unitPrice, taxes: t.purchaseBills.taxes, lineAmount: t.purchaseBills.lineAmount,
    addLine: t.purchaseBills.addLine, removeLine: t.purchaseBills.removeLine, atLeastOneLine: t.purchaseBills.atLeastOneLine,
    required: t.purchaseBills.required, saveDraft: t.purchaseBills.saveDraft, readOnlyPosted: t.purchaseBills.readOnlyPosted, readOnlyVoid: t.purchaseBills.readOnlyVoid,
  };
  return {
    nature: 'PURCHASE',
    settlementAccountCode: '2-1000',
    allowedTaxKinds: ['PPN_INPUT', 'PPH_PAYABLE'],
    partnerFilter: 'vendor',
    formSchema: billFormSchema,
    emptyForm: { partnerId: '', date: '', dueDate: '', vendorInvoiceNo: '', description: '', lines: [{ ...EMPTY_LINE }] },
    toFormValues: (bill) => ({
      partnerId: bill.partnerId,
      date: bill.date.slice(0, 10),
      dueDate: bill.dueDate ? bill.dueDate.slice(0, 10) : '',
      vendorInvoiceNo: bill.vendorInvoiceNo ?? '',
      description: bill.description ?? '',
      lines: bill.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    }),
    toPayload: (v) => ({
      partnerId: v.partnerId,
      date: v.date,
      dueDate: v.dueDate || undefined,
      vendorInvoiceNo: v.vendorInvoiceNo || undefined,
      description: v.description || undefined,
      lines: v.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    }),
    create: purchaseBillsApi.useCreate(),
    update: purchaseBillsApi.useUpdate(),
    labels,
    docRef: (bill) => bill.billRef,
    extraHeaderField: { name: 'vendorInvoiceNo', label: t.purchaseBills.vendorInvoiceNo, inputId: 'vinv' },
  };
}
```

- [ ] **Step 2: Rewrite `BillEditorPage.tsx`**

Replace `src/features/purchase-bills/BillEditorPage.tsx` with:

```tsx
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { NotFound } from '@/components/common/NotFound';
import { PageHeader } from '@/components/common/PageHeader';
import { BackLink } from '@/components/common/BackLink';
import { QueryState } from '@/components/common/QueryState';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { useT } from '@/lib/i18n/useT';
import { DocumentEditor } from '@/features/documents/DocumentEditor';
import { useBillEditorConfig } from './editorConfig';
import { purchaseBillsApi } from './hooks';

export function BillEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/purchase-bills' });
  const config = useBillEditorConfig();
  const item = purchaseBillsApi.useItem(id ?? '');

  if (!id) {
    return (
      <div>
        <PageHeader title={t.purchaseBills.newBill} back={<BackLink to="/purchase-bills" label={t.nav.purchaseBills} />} />
        <DocumentEditor config={config} mode="create" onSaved={goList} />
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
            <PageHeader title={readOnly ? t.purchaseBills.view : t.purchaseBills.editBill} back={<BackLink to="/purchase-bills" label={t.nav.purchaseBills} />} />
            <DocumentEditor config={config} mode="edit" doc={data} onSaved={goList} readOnly={readOnly} />
          </div>
        );
      }}
    </QueryState>
  );
}
```

- [ ] **Step 3: Repoint the two bill form tests (assertions unchanged)**

In `src/features/purchase-bills/BillForm.test.tsx` and `BillForm.readonly.test.tsx`, apply the same two edits:

(a) Replace `import { BillForm } from './BillForm';` with:
```tsx
import { DocumentEditor } from '@/features/documents/DocumentEditor';
import { useBillEditorConfig } from './editorConfig';

function BillEditorHarness(props: { mode: 'create' | 'edit'; bill?: import('./schema').PurchaseBill; onSaved: () => void; startEmpty?: boolean; readOnly?: boolean }) {
  const config = useBillEditorConfig();
  return <DocumentEditor config={config} mode={props.mode} doc={props.bill} onSaved={props.onSaved} startEmpty={props.startEmpty} readOnly={props.readOnly} />;
}
```

(b) Replace every `<BillForm ... />` with `<BillEditorHarness ... />` (props identical — `mode`, `bill`, `onSaved`, `startEmpty`, `readOnly`). Everything else (MSW handlers, the `vendorInvoiceNo`/`no. faktur vendor` interactions, the payload `toMatchObject` assertions, the read-only assertions) stays exactly as written.

- [ ] **Step 4: Delete the per-feature form + line row**

```bash
git rm src/features/purchase-bills/BillForm.tsx src/features/purchase-bills/BillLineRow.tsx
```

- [ ] **Step 5: Run the purchase-bills tests**

Run: `pnpm test --run src/features/purchase-bills/`
Expected: PASS — both repointed form tests (create posts the payload **with `vendorInvoiceNo`**; empty-submit validation with `/pilih vendor/`; read-only banner/disabled/no-Save) pass unchanged, plus `schema.test.ts` and `PurchaseBillsPage.test.tsx`. The `extraHeaderField` renders the `no. faktur vendor` input the create test types into. Fix the config/harness on failure, never the assertions.

- [ ] **Step 6: Full verification gate**

Run all:
```bash
pnpm run build
pnpm test --run
pnpm run lint
```
Expected: build succeeds (real `tsc -b` typecheck — no dangling imports of deleted forms); full suite passes (the new `documents/` suites + all four repointed editor tests + both schema suites + everything else); lint = 0 errors with only the 9 pre-existing React-Compiler/react-hook-form/TanStack-Table warnings.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(purchase-bills): BillForm via DocumentEditor config

Add useBillEditorConfig (extraHeaderField=vendorInvoiceNo), render DocumentEditor
from BillEditorPage, delete BillForm + BillLineRow, repoint the two form tests."
```

---

## Self-Review

**1. Spec coverage:**
- Shared `numericString`/`documentLineFormSchema`/`documentHeaderSchema`/`EMPTY_LINE`/`safeAmount` → `documents/` → Task 1. ✓
- Per-feature form schemas compose (invoice == base; bill `.extend()`s `vendorInvoiceNo`); response schemas + payload types stay → Task 1 Steps 4–5. ✓
- `DocumentEditor` config-driven (nature, settlementAccountCode, allowedTaxKinds, partnerFilter, formSchema, toFormValues, toPayload, injected create/update, labels, docRef, extraHeaderField) → Task 2. ✓ (Added `emptyForm: TFormValues` to the config — the spec listed `toFormValues` but the editor needs a typed create-default; this is the minimal typed way to supply it. Flagged as a spec refinement.)
- Type-safe `extraHeaderField` (`name: Extract<keyof TFormValues, string>`) → Task 2 (`ExtraHeaderField<TFormValues>`); exercised by Task 4 (`vendorInvoiceNo`) and Task 2's interface test. ✓
- Generic `DocumentLineRow` (over `TForm extends DocumentHeaderValues`) → Task 2. ✓
- Behind-the-seam (RHF, field array, previewLines+DocumentTotals, create/edit submit, readOnly banner/disable, error block, footer, grid-cols by extraHeaderField) → Task 2's `DocumentEditor.tsx`. ✓
- Delete `InvoiceForm`/`BillForm`/`InvoiceLineRow`/`BillLineRow` → Tasks 3 & 4 (`git rm`). ✓
- Mutations injected as called results (config hook calls `useCreate()`/`useUpdate()`) → Tasks 3 & 4. ✓
- i18n explicit struct built in the config hook → Tasks 3 & 4; editor reads `t.crud.saved`/`t.common.cancel` + `applyApiErrorToForm(t)` directly. ✓
- Tests: keep the 4 editor tests green (repointed, assertions unchanged) + the 2 schema tests + add the `DocumentEditor` interface suite + `documentFormSchema.test` → Tasks 1–4. ✓
- Scope = invoice + bill only; payments/journals untouched. ✓
- Gate uses `pnpm run build` as the real typecheck (the `tsc --noEmit` caveat) → every task. ✓

**2. Placeholder scan:** No TBD/TODO/"handle errors"/"similar to". Full file bodies for the new modules + both configs + both pages; complete test code; exact before/after edits for the schema refactors and the test repoints; exact commands + expected output.

**3. Type consistency:** `DocumentEditorConfig`/`DocumentEditorLabels`/`ExtraHeaderField`/`DocumentEditor`/`DocumentLineRow`/`documentHeaderSchema`/`DocumentHeaderValues`/`documentLineFormSchema`/`EMPTY_LINE`/`safeAmount` are defined in Tasks 1–2 and consumed verbatim in Tasks 3–4. The config generics line up with the real hook returns (`useCreate` → `UseMutationResult<TItem, ApiError, TCreate>`; `useUpdate` → `<TItem, ApiError, {id, data: TUpdate}>`). `DocumentLineRowLabels` is a subset the editor's `labels` satisfies. `toPayload` returns `TCreate` (used for create, and cast to `TUpdate = Partial<TCreate>` for update — a full object is assignable to the partial).

# DocumentEditor deepening — design

**Date:** 2026-06-25
**Source:** Architecture-review card 2 (see `docs/adr/0001-document-list-deepening.md` for card 1; same `features/documents/` home and "Document"/"nature" vocabulary in `CONTEXT.md`).
**Decided via:** brainstorming + design-it-twice (3 parallel interfaces; converged on **C + B's type graft**).

## Summary

`InvoiceForm` and `BillForm` (and `InvoiceLineRow`/`BillLineRow`) are the same document-editor concept instantiated twice — byte-identical RHF setup, field array, `EMPTY_LINE`, `previewLines` memo, `<DocumentTotals>`, create/edit `onSubmit`, readOnly banner, error block, footer; with `safeAmount` and `numericString` copy-pasted. Collapse them into one **`DocumentEditor`** component (+ one generic **`DocumentLineRow`**) parameterized by a declarative `DocumentEditorConfig`, living in `src/features/documents/` beside the existing tax core (`DocumentTotals`, `useTaxPreview`, `taxCalcSchema`) and the card-1 deepening (`DocumentListPage`/`useDocumentListController`).

**Scope:** the invoice + bill editors only (tax-line documents). The payments editor (allocations) and journals editor (balanced debit/credit) are structurally different and stay as-is.

## Decisions (settled during brainstorming)

- **Interface = config-driven, mirroring `DocumentListConfig`** (card 1). A page builds a `DocumentEditorConfig` in a `useXxxEditorConfig()` hook and renders `<DocumentEditor config={...} mode doc readOnly onSaved/>`. Same house style a developer already learned from the list pages.
- **Per-resource form types stay accurate** — no unified "dead field". A shared `documentHeaderSchema` base; the bill schema `.extend()`s it with `vendorInvoiceNo`. (Rejected design A's single unified `DocumentFormValues` for the dead-field muddiness.)
- **`vendorInvoiceNo` = a narrow `extraHeaderField` descriptor, type-safe.** Grafted from design B: `name` is typed `Extract<keyof TFormValues, string>`, so a wrong field name is a **compile error**. (Rejected B's heavier `headerExtra` render slot — overkill for one plain text input.)
- **Mutations injected as called results** (`UseMutationResult`), exactly like `DocumentListConfig`'s actions — not hook references.
- **`mode` + `doc` props** (consistent with the existing editors), not B's `editId`.
- **i18n = an explicit `DocumentEditorLabels` struct** of the exact keys the editor uses (catches missing keys), built in the config hook — not a whole-namespace spread.
- **`DocumentLineRow` is generic** over `TForm extends { lines: DocumentLineFormValues[] }` so it works under either resource's form type.

## Shared schema primitives (move to `src/features/documents/`)

New `src/features/documents/documentFormSchema.ts`:

```ts
import { z } from 'zod';
import { Money } from '@/lib/money/money';

export const numericString = (msg: string) =>
  z.string().regex(/^\d+(\.\d+)?$/, msg);

export const documentLineFormSchema = z.object({
  description: z.string().min(1),
  accountId:   z.string().min(1, 'selectAccount'),
  quantity:    numericString('invalidQuantity').refine((v) => Number(v) > 0, 'invalidQuantity'),
  unitPrice:   numericString('invalidPrice'),
  taxCodeIds:  z.array(z.string()),
});
export type DocumentLineFormValues = z.infer<typeof documentLineFormSchema>;

export const documentHeaderSchema = z.object({
  partnerId:   z.string().min(1, 'selectPartner'),
  date:        z.string().min(1, 'required'),
  dueDate:     z.string(),
  description: z.string(),
  lines:       z.array(documentLineFormSchema).min(1, 'atLeastOneLine'),
});
export type DocumentHeaderValues = z.infer<typeof documentHeaderSchema>;

export const EMPTY_LINE: DocumentLineFormValues = {
  description: '', accountId: '', quantity: '1', unitPrice: '', taxCodeIds: [],
};

export function safeAmount(qty: string, price: string): string {
  try { return Money.from(qty || '0').times(price || '0').toApi(); }
  catch { return '0'; }
}
```

Per-feature form schemas compose from the base (the duplicated `numericString` + line schema are deleted from both feature `schema.ts`):

```ts
// sales-invoices/schema.ts — invoice form == the base
export const invoiceFormSchema = documentHeaderSchema;
export type InvoiceFormValues = DocumentHeaderValues;

// purchase-bills/schema.ts — bill form extends the base
export const billFormSchema = documentHeaderSchema.extend({ vendorInvoiceNo: z.string() });
export type BillFormValues = z.infer<typeof billFormSchema>;
```

The API **response** schemas (`salesInvoiceSchema`, `purchaseBillSchema`) and create/update payload types stay in their feature folders — they genuinely differ (`invoiceNumber`/`invoiceRef` vs `billNumber`/`billRef`/`fiscalYear`/`vendorInvoiceNo`).

## The interface

`src/features/documents/DocumentEditor.tsx`:

```ts
import type { ZodType } from 'zod';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/errors';
import type { DocumentHeaderValues } from './documentFormSchema';

export interface DocumentEditorLabels {
  partner: string; selectPartner: string; date: string; dueDate: string;
  description: string; lineDescription: string; account: string; selectAccount: string;
  quantity: string; unitPrice: string; taxes: string; lineAmount: string;
  addLine: string; removeLine: string; atLeastOneLine: string; required: string;
  saveDraft: string; cancel: string; readOnlyPosted: string; readOnlyVoid: string;
  vendorInvoiceNo: string; // only used when extraHeaderField is present
}

export interface ExtraHeaderField<TFormValues> {
  name: Extract<keyof TFormValues, string>; // compile-time-checked against the form type
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
  settlementAccountCode: string;           // '1-1200' (AR) | '2-1000' (AP); looked up in accounts list
  allowedTaxKinds: string[];               // SALE: PPN_OUTPUT,PPH_PREPAID | PURCHASE: PPN_INPUT,PPH_PAYABLE
  partnerFilter: 'customer' | 'vendor';

  formSchema: ZodType<TFormValues>;
  toFormValues: (item: TItem) => TFormValues;          // edit mode seed
  toPayload: (values: TFormValues) => TCreate;         // used for both create and update

  create: UseMutationResult<TItem, ApiError, TCreate>;                 // injected, called result
  update: UseMutationResult<TItem, ApiError, { id: string; data: TUpdate }>;

  labels: DocumentEditorLabels;            // explicit struct, built from useT() in the config hook
  docRef: (item: TItem) => string | null | undefined; // invoiceRef / billRef for the readOnly banner
  extraHeaderField?: ExtraHeaderField<TFormValues>;    // vendorInvoiceNo on bills
}

export interface DocumentEditorProps<TItem, TFormValues extends DocumentHeaderValues, TCreate, TUpdate> {
  config: DocumentEditorConfig<TItem, TFormValues, TCreate, TUpdate>;
  mode: 'create' | 'edit';
  doc?: TItem;             // present iff mode === 'edit'
  readOnly?: boolean;
  onSaved: () => void;
  startEmpty?: boolean;    // skip the initial blank line (used in tests)
}

export function DocumentEditor<TItem extends { id: string; status: string }, TFormValues extends DocumentHeaderValues, TCreate, TUpdate = Partial<TCreate>>(
  props: DocumentEditorProps<TItem, TFormValues, TCreate, TUpdate>,
): React.ReactElement;
```

`src/features/documents/DocumentLineRow.tsx` — generic over the form type:

```ts
import type { UseFormReturn } from 'react-hook-form';
import type { DocumentLineFormValues, DocumentHeaderValues } from './documentFormSchema';

export interface DocumentLineRowProps<TForm extends DocumentHeaderValues> {
  form: UseFormReturn<TForm>;
  index: number;
  onRemove: () => void;
  readOnly?: boolean;
  allowedTaxKinds: string[];
  labels: Pick<DocumentEditorLabels, 'lineDescription' | 'account' | 'selectAccount' | 'quantity' | 'unitPrice' | 'taxes' | 'removeLine'>;
}

export function DocumentLineRow<TForm extends DocumentHeaderValues>(props: DocumentLineRowProps<TForm>): React.ReactElement;
```

(`TForm extends DocumentHeaderValues` guarantees `lines.${index}.*` paths are typed, so the row needs no `any`.)

## Behind the seam (what `DocumentEditor` hides)

- `useForm<TFormValues>({ resolver: zodResolver(config.formSchema), defaultValues: doc ? config.toFormValues(doc) : EMPTY_HEADER+[EMPTY_LINE] (or [] when startEmpty) })`.
- `useFieldArray({ control, name: 'lines' })`; Add-line appends `{...EMPTY_LINE}`.
- The `previewLines` memo (`watch('lines')` → filter `accountId` → `{accountId, amount: safeAmount(qty,price), taxCodeIds}`).
- Settlement account lookup: `accountsApi.useList()` then `.find(a => a.code === config.settlementAccountCode)?.id` → passed to `<DocumentTotals nature settlementAccountId lines>`. (`accountsApi` is the one hook the editor calls itself — shared infra, identical in both forms today, not document-specific.)
- `onSubmit`: `const onError = (err) => applyApiErrorToForm(err, form, t)`; `const onSuccess = () => { toast.success(t.crud.saved); onSaved(); }`; then `mode === 'edit' && doc ? update.mutate({ id: doc.id, data: config.toPayload(values) }, {onSuccess,onError}) : create.mutate(config.toPayload(values), {onSuccess,onError})`.
- readOnly banner: shown when `readOnly`; text = (`doc.status === 'VOID' ? labels.readOnlyVoid : labels.readOnlyPosted`) + the `config.docRef(doc)` ref; all inputs `disabled`; Add-line / Remove-line / Save hidden.
- `extraHeaderField`: when present, the header grid is `md:grid-cols-5` (else `md:grid-cols-4`) and renders one `<Input id={inputId} aria-label={label} disabled={readOnly} {...form.register(name)} />` after dueDate.
- Error block: `lines` → `partnerId` → `date` → `root` (the three header fields exist on every `DocumentHeaderValues` by invariant), using `labels`.
- Footer: Cancel + (when not readOnly) Save Draft, disabled on `create.isPending || update.isPending`.

## What remains per feature

- `schema.ts`: response/domain schemas + payload types unchanged; form schema becomes a one-line compose from `documentHeaderSchema`.
- A small config hook `useInvoiceEditorConfig()` / `useBillEditorConfig()` (builds the config from `useT()` + the called `useCreate()`/`useUpdate()`).
- `InvoiceEditorPage` / `BillEditorPage`: unchanged in their `QueryState`/`PageHeader`/`readOnly` shell — they swap `<InvoiceForm.../>` for `<DocumentEditor config={...} .../>`.
- **Deleted:** `InvoiceForm.tsx`, `BillForm.tsx`, `InvoiceLineRow.tsx`, `BillLineRow.tsx`, and the duplicated `numericString`/`safeAmount`/line schema.

## Dependency category & testing

**In-process** — mutations injected; RHF/Zod local; no network port. Test surface = the rendered editor + MSW.

- **Keep green (regression net):** the 4 editor tests (`InvoiceForm.test.tsx`, `InvoiceForm.readonly.test.tsx`, `BillForm.test.tsx`, `BillForm.readonly.test.tsx`) and the 2 `schema.test.ts`. They exercise behavior through the rendered editor / page and the form schemas, which are preserved (same DOM, labels, aria-labels, payload shapes). If a test imports `InvoiceForm`/`BillForm` directly, the migration re-points it at the page or `DocumentEditor` with the invoice/bill config **without weakening assertions**.
- **New:** a `DocumentEditor.test.tsx` interface suite (parameterized over the two configs) covering the generic lifecycle — create submit (payload shape), edit/readOnly (banner, no Save), and the `extraHeaderField` conditional (vendorInvoiceNo present for PURCHASE, absent for SALE) — plus a `documentFormSchema.test.ts` for the moved line schema.
- **Gate:** `pnpm run build` (the real `tsc -b` typecheck — note `tsc --noEmit` does NOT typecheck tests in this repo), `pnpm test --run`, `pnpm run lint` (0 errors; the 9 pre-existing React-Compiler/react-hook-form/TanStack-Table warnings remain).

## Global constraints (carried into the plan)

- Money via `Money`/`safeAmount` (decimal.js); never floats.
- i18n via `useT()`; no hardcoded user-facing strings; no em-dashes. Domain copy resolved by the config hook; the editor reads only `t.crud.saved`/`t.common.cancel` directly.
- `QueryState` wrapping stays in the editor pages.
- Redesign-preserve: routes, nav labels, form-field names unchanged; the migrated editors render the same controls/labels (the existing tests are the proof).
- Pre-existing ESLint React-Compiler/react-hook-form/TanStack-Table warnings are expected — do not "fix" them.

## Out of scope

- Payments and journals editors (different shapes).
- The API response/domain schemas and the routes (unchanged).
- Any new editor capability — this is a pure consolidation; behavior is preserved.

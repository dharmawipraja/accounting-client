# Plan 2b — Partners + Tax Codes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the `/partners` and `/tax-codes` routes with the role-gated CRUD pattern from Plan 2a, plus the two reusable pieces they need — `AccountSelect` (a postable+active account combobox) and a string-only tax `rate` helper — and apply the reconciled `parentId` correction to the account schema.

**Architecture:** Each feature is a thin consumer of the existing `createResourceHooks` factory + `applyApiErrorToForm` mapper + shared `FormDialog`/`ConfirmDialog`/`RowActions`/`StatusBadge`, with a hand-written Zod schema, columns, page, and form dialog. The Tax Codes list joins the accounts list (the API returns only `taxAccountId`). Tax rate is a decimal-fraction string end-to-end; the form shows a percent input.

**Tech Stack:** React 19, TanStack Query v5 + Router, Zod v4, React Hook Form, shadcn/ui (popover/command for the combobox), decimal.js, Vitest + RTL + MSW, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-13-partners-tax-codes-design.md`.

---

## Canonical interfaces (keep consistent across tasks)

```ts
// src/features/tax-codes/rate.ts  (string-only, decimal.js)
function percentToFraction(percent: string): string;   // "11" -> "0.11", "2.5" -> "0.025", "0" -> "0"
function fractionToPercent(fraction: string): string;  // "0.02" -> "2", "0.110000" -> "11"
function formatRatePercent(fraction: string): string;  // "0.02" -> "2%"

// src/components/common/AccountSelect.tsx
interface AccountSelectProps {
  value?: string;                       // account id
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// src/features/partners/schema.ts
type Partner = { id: string; code: string; name: string; npwp?: string | null; email?: string | null;
  phone?: string | null; address?: string | null; isCustomer: boolean; isVendor: boolean; isActive: boolean };
// PartnerCreateValues / PartnerEditValues — RHF form values
// PartnerCreatePayload = CreateBusinessPartnerDto shape; PartnerUpdatePayload = UpdateBusinessPartnerDto shape

// src/features/tax-codes/schema.ts
type TaxKind = 'PPN_OUTPUT' | 'PPN_INPUT' | 'PPH_PAYABLE' | 'PPH_PREPAID';
type TaxCode = { id: string; code: string; name: string; kind: TaxKind; rate: string; taxAccountId: string; isActive: boolean };
// TaxCodeCreateValues (uses ratePercent string) / TaxCodeEditValues
// TaxCodeCreatePayload = { code, name, kind, rate, taxAccountId }; TaxCodeUpdatePayload = { name, rate, isActive }
```

---

## File structure

```
src/features/accounts/schema.ts                 # MODIFY: item parentCode -> parentId
src/test/handlers.ts                            # MODIFY: account fixture parentId; ADD partners + tax-codes
src/lib/query/keys.ts                           # MODIFY: add partners, taxCodes keys
src/lib/i18n/messages.id.ts                     # MODIFY: add partners + taxCodes groups
src/components/common/AccountSelect.tsx (+ .test.tsx)
src/features/tax-codes/rate.ts (+ rate.test.ts)
src/features/partners/{schema.ts, hooks.ts, columns.tsx, PartnerFormDialog.tsx, PartnersPage.tsx} (+ tests)
src/features/tax-codes/{schema.ts, hooks.ts, columns.tsx, TaxCodeFormDialog.tsx, TaxCodesPage.tsx} (+ tests)
src/app/routes/_app/{partners,tax-codes}.tsx   # MODIFY: render the pages
```

---

## Task 1: Reconcile account schema (`parentCode` → `parentId`) + fixture

**Files:**
- Modify: `src/features/accounts/schema.ts`, `src/test/handlers.ts`

- [ ] **Step 1: Update the item schema**

In `src/features/accounts/schema.ts`, in `accountSchema`, replace the line
`parentCode: z.string().nullish(),` with:
```ts
  parentId: z.string().nullish(),
```
Leave `accountCreateSchema` unchanged (it keeps `parentCode`, the create DTO field).

- [ ] **Step 2: Update the MSW account fixtures**

In `src/test/handlers.ts`, in `accountFixtures()`, replace each `parentCode: null` with `parentId: null`, and in the `POST /ledger/accounts` happy-path response replace `parentCode: null` with `parentId: null`. (Leave the request `body` echo as-is.)

- [ ] **Step 3: Run accounts tests**

Run: `pnpm test src/features/accounts`
Expected: PASS (the parentId rename doesn't affect the UI; accounts don't display parent).

- [ ] **Step 4: Commit**

```bash
git add src/features/accounts/schema.ts src/test/handlers.ts
git commit -m "fix: account item schema uses parentId (reconciled with live API)"
```

---

## Task 2: Tax `rate` helper (TDD)

**Files:**
- Create: `src/features/tax-codes/rate.ts`, `src/features/tax-codes/rate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/tax-codes/rate.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { fractionToPercent, formatRatePercent, percentToFraction } from './rate';

describe('rate helpers', () => {
  it('percentToFraction divides by 100 without float drift', () => {
    expect(percentToFraction('11')).toBe('0.11');
    expect(percentToFraction('2.5')).toBe('0.025');
    expect(percentToFraction('0')).toBe('0');
    expect(percentToFraction('')).toBe('0');
  });
  it('fractionToPercent multiplies by 100 and trims', () => {
    expect(fractionToPercent('0.02')).toBe('2');
    expect(fractionToPercent('0.110000')).toBe('11');
    expect(fractionToPercent('0.025')).toBe('2.5');
    expect(fractionToPercent('')).toBe('0');
  });
  it('formatRatePercent appends a percent sign', () => {
    expect(formatRatePercent('0.02')).toBe('2%');
    expect(formatRatePercent('0.11')).toBe('11%');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/tax-codes/rate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `src/features/tax-codes/rate.ts`:
```ts
import Decimal from 'decimal.js';

/** Percent string (e.g. "11") -> fraction string (e.g. "0.11"). Empty -> "0". */
export function percentToFraction(percent: string): string {
  if (!percent.trim()) return '0';
  return new Decimal(percent).div(100).toString();
}

/** Fraction string (e.g. "0.02") -> percent string (e.g. "2"). Empty -> "0". */
export function fractionToPercent(fraction: string): string {
  if (!fraction.trim()) return '0';
  return new Decimal(fraction).mul(100).toString();
}

/** Fraction string -> display percent (e.g. "0.02" -> "2%"). */
export function formatRatePercent(fraction: string): string {
  return `${fractionToPercent(fraction)}%`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/features/tax-codes/rate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/tax-codes/rate.ts src/features/tax-codes/rate.test.ts
git commit -m "feat: string-only tax rate percent/fraction helpers"
```

---

## Task 3: `AccountSelect` combobox (TDD)

**Files:**
- Create: `src/components/common/AccountSelect.tsx`, `src/components/common/AccountSelect.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/AccountSelect.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { AccountSelect } from './AccountSelect';

afterEach(() => useSession.getState().clear());

function renderSelect(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const accounts = [
  { id: 'h', code: '1-0000', name: 'Aset', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: false, isActive: true, parentId: null },
  { id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null },
  { id: 'a2', code: '1-1100', name: 'Bank', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: false, parentId: null },
];

it('lists only postable + active accounts and selects by id', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  server.use(http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)));
  const onChange = vi.fn();
  renderSelect(<AccountSelect onChange={onChange} placeholder="Pilih akun" />);

  await user.click(screen.getByRole('combobox'));
  // Kas is postable+active -> present; the header and the inactive Bank are filtered out
  expect(await screen.findByRole('option', { name: /1-1000.*kas/i })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /1-0000/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /bank/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole('option', { name: /1-1000.*kas/i }));
  expect(onChange).toHaveBeenCalledWith('a1');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/components/common/AccountSelect.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `AccountSelect`**

Create `src/components/common/AccountSelect.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';
import { accountsApi } from '@/features/accounts/hooks';

interface AccountSelectProps {
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AccountSelect({ value, onChange, disabled, placeholder }: AccountSelectProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const list = accountsApi.useList();

  const options = useMemo(
    () =>
      (list.data ?? [])
        .filter((a) => a.isPostable && a.isActive)
        .sort((x, y) => x.code.localeCompare(y.code)),
    [list.data],
  );
  const selected = options.find((a) => a.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
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
              {options.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`${a.code} ${a.name}`}
                  onSelect={() => { onChange(a.id); setOpen(false); }}
                >
                  <Check className={cn('mr-2 size-4', a.id === value ? 'opacity-100' : 'opacity-0')} />
                  {a.code} — {a.name}
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
> cmdk renders items with `role="option"`. The `value` on `CommandItem` (`"1-1000 Kas"`) is what its built-in filter matches against the typed query; the `onSelect` ignores that and uses the account id.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/components/common/AccountSelect.test.tsx`
Expected: PASS (1 test, 3 assertions on filtering + selection).
> If cmdk's `role="option"` items aren't found under jsdom, ensure the radix/jsdom shims in `src/test/setup.ts` (added in Plan 2a) are present and you used `userEvent.setup({ pointerEventsCheck: 0 })`. Keep assertions on `findByRole('option', …)`.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/AccountSelect.tsx src/components/common/AccountSelect.test.tsx
git commit -m "feat: AccountSelect combobox (postable + active accounts)"
```

---

## Task 4: i18n — `partners` + `taxCodes` groups

**Files:**
- Modify: `src/lib/i18n/messages.id.ts`

- [ ] **Step 1: Add the groups**

In `src/lib/i18n/messages.id.ts`, add to the exported `id` object (keep existing groups):
```ts
  partners: {
    title: 'Mitra Bisnis',
    code: 'Kode',
    name: 'Nama',
    npwp: 'NPWP',
    email: 'Email',
    phone: 'Telepon',
    address: 'Alamat',
    customer: 'Pelanggan',
    vendor: 'Pemasok',
    newPartner: 'Mitra Baru',
    editPartner: 'Ubah Mitra',
    atLeastOneType: 'Pilih minimal satu: Pelanggan atau Pemasok',
    invalidEmail: 'Email tidak valid',
    invalidNpwp: 'NPWP harus 15–16 digit',
  },
  taxCodes: {
    title: 'Kode Pajak',
    code: 'Kode',
    name: 'Nama',
    kind: 'Jenis',
    rate: 'Tarif',
    taxAccount: 'Akun Pajak',
    newTaxCode: 'Kode Pajak Baru',
    editTaxCode: 'Ubah Kode Pajak',
    selectAccount: 'Pilih akun pajak',
    invalidRate: 'Tarif harus angka',
    kindPpnOutput: 'PPN Keluaran',
    kindPpnInput: 'PPN Masukan',
    kindPphPayable: 'PPh Terutang',
    kindPphPrepaid: 'PPh Dibayar di Muka',
  },
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: succeeds (catalog typechecks).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat: add partners and taxCodes i18n groups"
```

---

## Task 5: MSW partners + tax-codes fixtures

**Files:**
- Modify: `src/test/handlers.ts`

- [ ] **Step 1: Add fixtures + handlers**

In `src/test/handlers.ts`, add exported fixture helpers and handlers (keep existing ones):
```ts
// --- partners (Plan 2b) ---
export const partnerFixtures = () => [
  { id: 'p1', code: 'CUST-001', name: 'PT Pelanggan Jaya', npwp: '01.234.567.8-901.000', email: 'beli@jaya.id', phone: '021-555', address: 'Jakarta', isCustomer: true, isVendor: false, isActive: true },
];
// --- tax codes (Plan 2b) ---
export const taxCodeFixtures = () => [
  { id: 't1', code: 'PPN-OUT', name: 'PPN Keluaran 11%', kind: 'PPN_OUTPUT', rate: '0.11', taxAccountId: 'a1', isActive: true },
];
```
And inside the `handlers` array add:
```ts
  http.get(`${API}/partners`, () => HttpResponse.json(partnerFixtures())),
  http.post(`${API}/partners`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.code === 'DUP') return HttpResponse.json({ code: 'CONFLICT', message: 'dup' }, { status: 409 });
    return HttpResponse.json({ id: 'p9', isActive: true, ...body });
  }),
  http.patch(`${API}/partners/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...partnerFixtures()[0], id: params.id, ...body });
  }),
  http.post(`${API}/partners/:id/deactivate`, () => HttpResponse.json({})),
  http.delete(`${API}/partners/:id`, () => HttpResponse.json({})),

  http.get(`${API}/tax/codes`, () => HttpResponse.json(taxCodeFixtures())),
  http.post(`${API}/tax/codes`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.code === 'DUP') return HttpResponse.json({ code: 'CONFLICT', message: 'dup' }, { status: 409 });
    return HttpResponse.json({ id: 't9', isActive: true, ...body });
  }),
  http.patch(`${API}/tax/codes/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...taxCodeFixtures()[0], id: params.id, ...body });
  }),
  http.post(`${API}/tax/codes/:id/deactivate`, () => HttpResponse.json({})),
  http.delete(`${API}/tax/codes/:id`, () => HttpResponse.json({})),
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `pnpm test src/test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/test/handlers.ts
git commit -m "test: add MSW partners and tax-codes fixtures"
```

---

## Task 6: Partners schema + hooks + keys

**Files:**
- Create: `src/features/partners/schema.ts`, `src/features/partners/hooks.ts`
- Modify: `src/lib/query/keys.ts`

- [ ] **Step 1: Add the query key root**

In `src/lib/query/keys.ts`, add to `queryKeys`:
```ts
  partners: createResourceKeys('partners'),
```
(`createResourceKeys` is already imported from `@/lib/crud/createResourceHooks`.)

- [ ] **Step 2: Create the schema**

Create `src/features/partners/schema.ts`:
```ts
import { z } from 'zod';

export const partnerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  npwp: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  isCustomer: z.boolean(),
  isVendor: z.boolean(),
  isActive: z.boolean(),
});
export type Partner = z.infer<typeof partnerSchema>;

const emailOk = (v: string | undefined) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const npwpOk = (v: string | undefined) => {
  if (!v) return true;
  const digits = v.replace(/[.\-\s]/g, '');
  return /^\d+$/.test(digits) && digits.length >= 15 && digits.length <= 16;
};

const baseFields = {
  name: z.string().min(1),
  npwp: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isCustomer: z.boolean(),
  isVendor: z.boolean(),
};

export const partnerCreateSchema = z
  .object({ code: z.string().min(1), ...baseFields })
  .refine((v) => v.isCustomer || v.isVendor, { message: 'atLeastOneType', path: ['isCustomer'] })
  .refine((v) => emailOk(v.email), { message: 'invalidEmail', path: ['email'] })
  .refine((v) => npwpOk(v.npwp), { message: 'invalidNpwp', path: ['npwp'] });
export type PartnerCreateValues = z.infer<typeof partnerCreateSchema>;

export const partnerEditSchema = z
  .object({ ...baseFields, isActive: z.boolean() })
  .refine((v) => v.isCustomer || v.isVendor, { message: 'atLeastOneType', path: ['isCustomer'] })
  .refine((v) => emailOk(v.email), { message: 'invalidEmail', path: ['email'] })
  .refine((v) => npwpOk(v.npwp), { message: 'invalidNpwp', path: ['npwp'] });
export type PartnerEditValues = z.infer<typeof partnerEditSchema>;

export type PartnerCreatePayload = PartnerCreateValues;
export type PartnerUpdatePayload = PartnerEditValues;
```
> The refine `message`s are i18n KEYS (`atLeastOneType`/`invalidEmail`/`invalidNpwp`); the form maps them to `t.partners[key]` when rendering, so the catalog stays the source of the Indonesian text.

- [ ] **Step 3: Create the hooks**

Create `src/features/partners/hooks.ts`:
```ts
import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { partnerSchema, type Partner, type PartnerCreatePayload, type PartnerUpdatePayload } from './schema';

export const partnersApi = createResourceHooks<Partner, PartnerCreatePayload, PartnerUpdatePayload>({
  key: 'partners',
  basePath: '/partners',
  itemSchema: partnerSchema,
});
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/features/partners/schema.ts src/features/partners/hooks.ts src/lib/query/keys.ts
git commit -m "feat: partner schema, hooks, and query keys"
```

---

## Task 7: `PartnerFormDialog` (TDD)

**Files:**
- Create: `src/features/partners/PartnerFormDialog.tsx`, `src/features/partners/PartnerFormDialog.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/partners/PartnerFormDialog.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { PartnerFormDialog } from './PartnerFormDialog';

afterEach(() => useSession.getState().clear());

function renderDialog(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('requires at least one of customer/vendor', async () => {
  const user = userEvent.setup();
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  renderDialog(<PartnerFormDialog open onOpenChange={vi.fn()} mode="create" />);
  await user.type(screen.getByLabelText(/kode/i), 'CUST-9');
  await user.type(screen.getByLabelText(/nama/i), 'Toko A');
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  expect(await screen.findByText(/pilih minimal satu/i)).toBeInTheDocument();
});

it('creates a partner and calls onOpenChange(false)', async () => {
  const user = userEvent.setup();
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let posted: Record<string, unknown> | null = null;
  server.use(
    http.post(`${API}/partners`, async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ id: 'p9', isActive: true, ...posted });
    }),
  );
  const onOpenChange = vi.fn();
  renderDialog(<PartnerFormDialog open onOpenChange={onOpenChange} mode="create" />);
  await user.type(screen.getByLabelText(/kode/i), 'CUST-9');
  await user.type(screen.getByLabelText(/nama/i), 'Toko A');
  await user.click(screen.getByLabelText(/pelanggan/i));
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  await waitFor(() => expect(posted).toMatchObject({ code: 'CUST-9', name: 'Toko A', isCustomer: true }));
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/partners/PartnerFormDialog.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PartnerFormDialog`**

Create `src/features/partners/PartnerFormDialog.tsx`:
```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FormDialog } from '@/components/common/FormDialog';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { useT } from '@/lib/i18n/useT';
import type { Messages } from '@/lib/i18n/messages.id';
import { partnersApi } from './hooks';
import {
  partnerCreateSchema, partnerEditSchema,
  type PartnerCreateValues, type PartnerEditValues, type Partner,
} from './schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  partner?: Partner;
}

/** Translate an i18n-key error message to its Indonesian text. */
function msg(t: Messages, key?: string): string | undefined {
  if (!key) return undefined;
  return (t.partners as Record<string, string>)[key] ?? key;
}

export function PartnerFormDialog({ open, onOpenChange, mode, partner }: Props) {
  if (mode === 'edit' && partner) {
    return <EditForm key={partner.id} partner={partner} open={open} onOpenChange={onOpenChange} />;
  }
  return <CreateForm open={open} onOpenChange={onOpenChange} />;
}

function CreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const create = partnersApi.useCreate();
  const form = useForm<PartnerCreateValues>({
    resolver: zodResolver(partnerCreateSchema),
    defaultValues: { code: '', name: '', npwp: '', email: '', phone: '', address: '', isCustomer: false, isVendor: false },
  });

  function onSubmit(values: PartnerCreateValues) {
    create.mutate(values, {
      onSuccess: () => { toast.success(t.crud.saved); onOpenChange(false); form.reset(); },
      onError: (err) => applyApiErrorToForm(err, form, t),
    });
  }

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t.partners.newPartner}
      onSubmit={form.handleSubmit(onSubmit)} pending={create.isPending}>
      <CreateFields form={form} />
    </FormDialog>
  );
}

function EditForm({ partner, open, onOpenChange }: { partner: Partner; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const update = partnersApi.useUpdate();
  const form = useForm<PartnerEditValues>({
    resolver: zodResolver(partnerEditSchema),
    defaultValues: {
      name: partner.name, npwp: partner.npwp ?? '', email: partner.email ?? '',
      phone: partner.phone ?? '', address: partner.address ?? '',
      isCustomer: partner.isCustomer, isVendor: partner.isVendor, isActive: partner.isActive,
    },
  });

  function onSubmit(values: PartnerEditValues) {
    update.mutate({ id: partner.id, data: values }, {
      onSuccess: () => { toast.success(t.crud.saved); onOpenChange(false); },
      onError: (err) => applyApiErrorToForm(err, form, t),
    });
  }

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t.partners.editPartner}
      description={`${partner.code} — ${partner.name}`}
      onSubmit={form.handleSubmit(onSubmit)} pending={update.isPending}>
      <SharedFields form={form} />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={form.watch('isActive')} onCheckedChange={(v) => form.setValue('isActive', v === true)} />
        {t.crud.active}
      </label>
      <RootError form={form} />
    </FormDialog>
  );
}

function CreateFields({ form }: { form: UseFormReturn<PartnerCreateValues> }) {
  const t = useT();
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="code">{t.partners.code}</Label>
          <Input id="code" {...form.register('code')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">{t.partners.name}</Label>
          <Input id="name" {...form.register('name')} />
        </div>
      </div>
      <SharedFields form={form} />
      <RootError form={form} />
    </>
  );
}

function SharedFields({ form }: { form: UseFormReturn<any> }) {
  const t = useT();
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="npwp">{t.partners.npwp}</Label>
          <Input id="npwp" {...form.register('npwp')} />
          {form.formState.errors.npwp ? (
            <p role="alert" className="text-sm text-destructive">{msg(t, form.formState.errors.npwp.message as string)}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t.partners.email}</Label>
          <Input id="email" {...form.register('email')} />
          {form.formState.errors.email ? (
            <p role="alert" className="text-sm text-destructive">{msg(t, form.formState.errors.email.message as string)}</p>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t.partners.phone}</Label>
          <Input id="phone" {...form.register('phone')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">{t.partners.address}</Label>
          <Input id="address" {...form.register('address')} />
        </div>
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.watch('isCustomer')} onCheckedChange={(v) => form.setValue('isCustomer', v === true)} />
          {t.partners.customer}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.watch('isVendor')} onCheckedChange={(v) => form.setValue('isVendor', v === true)} />
          {t.partners.vendor}
        </label>
      </div>
      {form.formState.errors.isCustomer ? (
        <p role="alert" className="text-sm text-destructive">{msg(t, form.formState.errors.isCustomer.message as string)}</p>
      ) : null}
    </>
  );
}

function RootError({ form }: { form: UseFormReturn<any> }) {
  return form.formState.errors.root ? (
    <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
  ) : null;
}
```
> The `code` field is create-only (the test types into `/kode/i` which only the create form renders). The `msg()` helper maps refine i18n keys to `t.partners.*`.
>
> **Lint note:** `SharedFields`/`RootError` accept `UseFormReturn<any>` (they're shared across the create/edit form value types). The project's ESLint treats `@typescript-eslint/no-explicit-any` as an error, so add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` immediately above each `form: UseFormReturn<any>` parameter (same pattern already used in `src/lib/api/form-errors.ts`). Ensure `pnpm lint` exits 0.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/features/partners/PartnerFormDialog.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/partners/PartnerFormDialog.tsx src/features/partners/PartnerFormDialog.test.tsx
git commit -m "feat: partner create/edit form with customer/vendor validation"
```

---

## Task 8: Partners columns + `PartnersPage` (TDD)

**Files:**
- Create: `src/features/partners/columns.tsx`, `src/features/partners/PartnersPage.tsx`, `src/features/partners/PartnersPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/partners/PartnersPage.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { PartnersPage } from './PartnersPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><PartnersPage /></QueryClientProvider>);
}

it('lists partners with type badges', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  renderPage();
  expect(await screen.findByText('PT Pelanggan Jaya')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /baru/i })).toBeInTheDocument();
});

it('shows an empty state and no New button for VIEWER', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(http.get(`${API}/partners`, () => HttpResponse.json([])));
  renderPage();
  expect(await screen.findByText(/tidak ada data/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /baru/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/partners/PartnersPage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the columns**

Create `src/features/partners/columns.tsx`:
```tsx
import { createColumnHelper } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RowActions } from '@/components/common/RowActions';
import type { Messages } from '@/lib/i18n/messages.id';
import type { Partner } from './schema';

const col = createColumnHelper<Partner>();

export function buildPartnerColumns(
  t: Messages,
  handlers: { onEdit: (p: Partner) => void; onDeactivate: (p: Partner) => void; onDelete: (p: Partner) => void },
) {
  return [
    col.accessor('code', { header: t.partners.code }),
    col.accessor('name', { header: t.partners.name }),
    col.accessor('npwp', { header: t.partners.npwp, cell: (c) => c.getValue() ?? '—' }),
    col.display({
      id: 'type',
      header: '',
      cell: (c) => (
        <div className="flex gap-1">
          {c.row.original.isCustomer ? <Badge variant="outline">{t.partners.customer}</Badge> : null}
          {c.row.original.isVendor ? <Badge variant="outline">{t.partners.vendor}</Badge> : null}
        </div>
      ),
    }),
    col.accessor('isActive', { header: '', cell: (c) => <StatusBadge active={c.getValue()} /> }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => (
        <RowActions
          onEdit={() => handlers.onEdit(c.row.original)}
          onDeactivate={() => handlers.onDeactivate(c.row.original)}
          onDelete={() => handlers.onDelete(c.row.original)}
        />
      ),
    }),
  ];
}
```

- [ ] **Step 4: Create `PartnersPage`**

Create `src/features/partners/PartnersPage.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/common/DataTable';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { RoleGate } from '@/components/common/RoleGate';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useT } from '@/lib/i18n/useT';
import { buildPartnerColumns } from './columns';
import { PartnerFormDialog } from './PartnerFormDialog';
import { partnersApi } from './hooks';
import type { Partner } from './schema';

export function PartnersPage() {
  const t = useT();
  const list = partnersApi.useList();
  const deactivate = partnersApi.useDeactivate();
  const remove = partnersApi.useRemove();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partner | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'delete'; partner: Partner } | null>(null);

  const columns = useMemo(
    () => buildPartnerColumns(t, {
      onEdit: (p) => setEditing(p),
      onDeactivate: (p) => setConfirm({ kind: 'deactivate', partner: p }),
      onDelete: (p) => setConfirm({ kind: 'delete', partner: p }),
    }),
    [t],
  );

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (list.data ?? []).filter((p) => !q || p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  }, [list.data, search]);

  function runConfirm() {
    if (!confirm) return;
    const action = confirm.kind === 'deactivate' ? deactivate : remove;
    const okMsg = confirm.kind === 'deactivate' ? t.crud.deactivated : t.crud.deleted;
    action.mutate(confirm.partner.id, {
      onSuccess: () => { toast.success(okMsg); setConfirm(null); },
      onError: () => toast.error(t.common.error),
    });
  }

  return (
    <div>
      <PageHeader title={t.partners.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button onClick={() => setCreating(true)}><Plus className="size-4" /> {t.crud.new}</Button>
        </RoleGate>
      } />

      <div className="mb-4 max-w-xs">
        <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {list.isLoading ? <Skeleton className="h-40 w-full" />
        : list.isError ? <ErrorState error={list.error} />
        : <DataTable columns={columns} data={rows} />}

      <PartnerFormDialog open={creating} onOpenChange={setCreating} mode="create" />
      <PartnerFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} mode="edit" partner={editing ?? undefined} />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === 'delete' ? t.crud.confirmDeleteTitle : t.crud.confirmDeactivateTitle}
        description={confirm?.kind === 'delete' ? t.crud.confirmDeleteDesc : undefined}
        confirmLabel={confirm?.kind === 'delete' ? t.common.delete : t.crud.deactivate}
        destructive={confirm?.kind === 'delete'}
        pending={deactivate.isPending || remove.isPending}
        onConfirm={runConfirm}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test src/features/partners/PartnersPage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/partners/columns.tsx src/features/partners/PartnersPage.tsx src/features/partners/PartnersPage.test.tsx
git commit -m "feat: partners list page with type badges and role-gated actions"
```

---

## Task 9: Wire the partners route

**Files:**
- Modify: `src/app/routes/_app/partners.tsx`

- [ ] **Step 1: Render the page**

Replace `src/app/routes/_app/partners.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PartnersPage } from '@/features/partners/PartnersPage';

export const Route = createFileRoute('/_app/partners')({
  component: PartnersPage,
});
```

- [ ] **Step 2: Verify build + tests**

Run: `pnpm test && pnpm build`
Expected: all green; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/routes/_app/partners.tsx
git commit -m "feat: wire Partners route"
```

---

## Task 10: Tax codes schema + hooks + keys

**Files:**
- Create: `src/features/tax-codes/schema.ts`, `src/features/tax-codes/hooks.ts`
- Modify: `src/lib/query/keys.ts`

- [ ] **Step 1: Add the query key root**

In `src/lib/query/keys.ts`, add to `queryKeys`:
```ts
  taxCodes: createResourceKeys('taxCodes'),
```

- [ ] **Step 2: Create the schema**

Create `src/features/tax-codes/schema.ts`:
```ts
import { z } from 'zod';

export const taxKindSchema = z.enum(['PPN_OUTPUT', 'PPN_INPUT', 'PPH_PAYABLE', 'PPH_PREPAID']);
export type TaxKind = z.infer<typeof taxKindSchema>;

export const taxCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  kind: taxKindSchema,
  rate: z.string(),
  taxAccountId: z.string(),
  isActive: z.boolean(),
});
export type TaxCode = z.infer<typeof taxCodeSchema>;

// Create form: percent input (ratePercent), converted to a fraction on submit.
export const taxCodeCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  kind: taxKindSchema,
  ratePercent: z.string().regex(/^\d+(\.\d+)?$/, 'invalidRate'),
  taxAccountId: z.string().min(1, 'selectAccount'),
});
export type TaxCodeCreateValues = z.infer<typeof taxCodeCreateSchema>;

export const taxCodeEditSchema = z.object({
  name: z.string().min(1),
  ratePercent: z.string().regex(/^\d+(\.\d+)?$/, 'invalidRate'),
  isActive: z.boolean(),
});
export type TaxCodeEditValues = z.infer<typeof taxCodeEditSchema>;

// API payloads (rate as a fraction string).
export type TaxCodeCreatePayload = { code: string; name: string; kind: TaxKind; rate: string; taxAccountId: string };
export type TaxCodeUpdatePayload = { name: string; rate: string; isActive: boolean };
```

- [ ] **Step 3: Create the hooks**

Create `src/features/tax-codes/hooks.ts`:
```ts
import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { taxCodeSchema, type TaxCode, type TaxCodeCreatePayload, type TaxCodeUpdatePayload } from './schema';

export const taxCodesApi = createResourceHooks<TaxCode, TaxCodeCreatePayload, TaxCodeUpdatePayload>({
  key: 'taxCodes',
  basePath: '/tax/codes',
  itemSchema: taxCodeSchema,
});
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/features/tax-codes/schema.ts src/features/tax-codes/hooks.ts src/lib/query/keys.ts
git commit -m "feat: tax code schema, hooks, and query keys"
```

---

## Task 11: `TaxCodeFormDialog` (TDD)

**Files:**
- Create: `src/features/tax-codes/TaxCodeFormDialog.tsx`, `src/features/tax-codes/TaxCodeFormDialog.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/tax-codes/TaxCodeFormDialog.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { TaxCodeFormDialog } from './TaxCodeFormDialog';

afterEach(() => useSession.getState().clear());

const accounts = [
  { id: 'a1', code: '2-1100', name: 'PPN Keluaran', type: 'LIABILITY', subtype: 'TAX_PAYABLE', normalBalance: 'CREDIT', isPostable: true, isActive: true, parentId: null },
];

function renderDialog(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

it('submits rate as a fraction and the selected account id', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accounts)));
  let posted: Record<string, unknown> | null = null;
  server.use(
    http.post(`${API}/tax/codes`, async ({ request }) => {
      posted = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ id: 't9', isActive: true, ...posted });
    }),
  );
  renderDialog(<TaxCodeFormDialog open onOpenChange={vi.fn()} mode="create" />);
  await user.type(screen.getByLabelText(/kode/i), 'PPN-OUT');
  await user.type(screen.getByLabelText(/nama/i), 'PPN Keluaran 11%');
  await user.type(screen.getByLabelText(/tarif/i), '11');
  // pick the tax account via AccountSelect combobox
  await user.click(screen.getByRole('combobox'));
  await user.click(await screen.findByRole('option', { name: /2-1100.*ppn keluaran/i }));
  await user.click(screen.getByRole('button', { name: /simpan/i }));
  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ code: 'PPN-OUT', kind: 'PPN_OUTPUT', rate: '0.11', taxAccountId: 'a1' });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/tax-codes/TaxCodeFormDialog.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `TaxCodeFormDialog`**

Create `src/features/tax-codes/TaxCodeFormDialog.tsx`:
```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FormDialog } from '@/components/common/FormDialog';
import { AccountSelect } from '@/components/common/AccountSelect';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { useT } from '@/lib/i18n/useT';
import type { Messages } from '@/lib/i18n/messages.id';
import { taxCodesApi } from './hooks';
import { percentToFraction, fractionToPercent } from './rate';
import {
  taxCodeCreateSchema, taxCodeEditSchema,
  type TaxCodeCreateValues, type TaxCodeEditValues, type TaxCode, type TaxKind,
} from './schema';

const KIND_OPTIONS: { value: TaxKind; key: keyof Messages['taxCodes'] }[] = [
  { value: 'PPN_OUTPUT', key: 'kindPpnOutput' },
  { value: 'PPN_INPUT', key: 'kindPpnInput' },
  { value: 'PPH_PAYABLE', key: 'kindPphPayable' },
  { value: 'PPH_PREPAID', key: 'kindPphPrepaid' },
];

function err(t: Messages, key?: string): string | undefined {
  if (!key) return undefined;
  return (t.taxCodes as Record<string, string>)[key] ?? key;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  taxCode?: TaxCode;
}

export function TaxCodeFormDialog({ open, onOpenChange, mode, taxCode }: Props) {
  if (mode === 'edit' && taxCode) {
    return <EditForm key={taxCode.id} taxCode={taxCode} open={open} onOpenChange={onOpenChange} />;
  }
  return <CreateForm open={open} onOpenChange={onOpenChange} />;
}

function CreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const create = taxCodesApi.useCreate();
  const form = useForm<TaxCodeCreateValues>({
    resolver: zodResolver(taxCodeCreateSchema),
    defaultValues: { code: '', name: '', kind: 'PPN_OUTPUT', ratePercent: '', taxAccountId: '' },
  });

  function onSubmit(values: TaxCodeCreateValues) {
    create.mutate(
      { code: values.code, name: values.name, kind: values.kind, rate: percentToFraction(values.ratePercent), taxAccountId: values.taxAccountId },
      {
        onSuccess: () => { toast.success(t.crud.saved); onOpenChange(false); form.reset(); },
        onError: (e) => applyApiErrorToForm(e, form, t),
      },
    );
  }

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t.taxCodes.newTaxCode}
      onSubmit={form.handleSubmit(onSubmit)} pending={create.isPending}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="code">{t.taxCodes.code}</Label>
          <Input id="code" {...form.register('code')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">{t.taxCodes.name}</Label>
          <Input id="name" {...form.register('name')} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="kind">{t.taxCodes.kind}</Label>
        <Select value={form.watch('kind')} onValueChange={(v) => form.setValue('kind', v as TaxKind)}>
          <SelectTrigger id="kind" aria-label={t.taxCodes.kind}><SelectValue /></SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{t.taxCodes[o.key]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="rate">{t.taxCodes.rate} (%)</Label>
          <Input id="rate" inputMode="decimal" {...form.register('ratePercent')} />
          {form.formState.errors.ratePercent ? (
            <p role="alert" className="text-sm text-destructive">{err(t, form.formState.errors.ratePercent.message as string)}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>{t.taxCodes.taxAccount}</Label>
          <AccountSelect
            value={form.watch('taxAccountId')}
            onChange={(id) => form.setValue('taxAccountId', id, { shouldValidate: true })}
            placeholder={t.taxCodes.selectAccount}
          />
          {form.formState.errors.taxAccountId ? (
            <p role="alert" className="text-sm text-destructive">{err(t, form.formState.errors.taxAccountId.message as string)}</p>
          ) : null}
        </div>
      </div>

      {form.formState.errors.root ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      ) : null}
      {form.formState.errors.code ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.code.message}</p>
      ) : null}
    </FormDialog>
  );
}

function EditForm({ taxCode, open, onOpenChange }: { taxCode: TaxCode; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const update = taxCodesApi.useUpdate();
  const form = useForm<TaxCodeEditValues>({
    resolver: zodResolver(taxCodeEditSchema),
    defaultValues: { name: taxCode.name, ratePercent: fractionToPercent(taxCode.rate), isActive: taxCode.isActive },
  });

  function onSubmit(values: TaxCodeEditValues) {
    update.mutate(
      { id: taxCode.id, data: { name: values.name, rate: percentToFraction(values.ratePercent), isActive: values.isActive } },
      {
        onSuccess: () => { toast.success(t.crud.saved); onOpenChange(false); },
        onError: (e) => applyApiErrorToForm(e, form, t),
      },
    );
  }

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t.taxCodes.editTaxCode}
      description={`${taxCode.code} — ${taxCode.name}`}
      onSubmit={form.handleSubmit(onSubmit)} pending={update.isPending}>
      <div className="space-y-1.5">
        <Label htmlFor="ename">{t.taxCodes.name}</Label>
        <Input id="ename" {...form.register('name')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="erate">{t.taxCodes.rate} (%)</Label>
        <Input id="erate" inputMode="decimal" {...form.register('ratePercent')} />
        {form.formState.errors.ratePercent ? (
          <p role="alert" className="text-sm text-destructive">{err(t, form.formState.errors.ratePercent.message as string)}</p>
        ) : null}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={form.watch('isActive')} onCheckedChange={(v) => form.setValue('isActive', v === true)} />
        {t.crud.active}
      </label>
      {form.formState.errors.root ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      ) : null}
    </FormDialog>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/features/tax-codes/TaxCodeFormDialog.test.tsx`
Expected: PASS (1 test — proves rate→fraction conversion + AccountSelect wiring).

- [ ] **Step 5: Commit**

```bash
git add src/features/tax-codes/TaxCodeFormDialog.tsx src/features/tax-codes/TaxCodeFormDialog.test.tsx
git commit -m "feat: tax code form with percent rate input and AccountSelect"
```

---

## Task 12: Tax codes columns + `TaxCodesPage` with account join (TDD)

**Files:**
- Create: `src/features/tax-codes/columns.tsx`, `src/features/tax-codes/TaxCodesPage.tsx`, `src/features/tax-codes/TaxCodesPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/tax-codes/TaxCodesPage.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { TaxCodesPage } from './TaxCodesPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><TaxCodesPage /></QueryClientProvider>);
}

it('renders rate as a percent and the joined account name', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json([
      { id: 'a1', code: '2-1100', name: 'PPN Keluaran', type: 'LIABILITY', subtype: 'TAX_PAYABLE', normalBalance: 'CREDIT', isPostable: true, isActive: true, parentId: null },
    ])),
    http.get(`${API}/tax/codes`, () => HttpResponse.json([
      { id: 't1', code: 'PPN-OUT', name: 'PPN Keluaran 11%', kind: 'PPN_OUTPUT', rate: '0.11', taxAccountId: 'a1', isActive: true },
    ])),
  );
  renderPage();
  expect(await screen.findByText('PPN-OUT')).toBeInTheDocument();
  expect(screen.getByText('11%')).toBeInTheDocument();
  expect(screen.getByText(/2-1100.*PPN Keluaran/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/tax-codes/TaxCodesPage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the columns**

Create `src/features/tax-codes/columns.tsx`:
```tsx
import { createColumnHelper } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RowActions } from '@/components/common/RowActions';
import type { Messages } from '@/lib/i18n/messages.id';
import { formatRatePercent } from './rate';
import type { TaxCode, TaxKind } from './schema';

const col = createColumnHelper<TaxCode>();

const KIND_KEY: Record<TaxKind, keyof Messages['taxCodes']> = {
  PPN_OUTPUT: 'kindPpnOutput', PPN_INPUT: 'kindPpnInput',
  PPH_PAYABLE: 'kindPphPayable', PPH_PREPAID: 'kindPphPrepaid',
};

export function buildTaxCodeColumns(
  t: Messages,
  accountLabel: (id: string) => string,
  handlers: { onEdit: (x: TaxCode) => void; onDeactivate: (x: TaxCode) => void; onDelete: (x: TaxCode) => void },
) {
  return [
    col.accessor('code', { header: t.taxCodes.code }),
    col.accessor('name', { header: t.taxCodes.name }),
    col.accessor('kind', { header: t.taxCodes.kind, cell: (c) => <Badge variant="outline">{t.taxCodes[KIND_KEY[c.getValue()]]}</Badge> }),
    col.accessor('rate', { header: t.taxCodes.rate, cell: (c) => <span className="font-mono tabular-nums">{formatRatePercent(c.getValue())}</span> }),
    col.accessor('taxAccountId', { header: t.taxCodes.taxAccount, cell: (c) => accountLabel(c.getValue()) }),
    col.accessor('isActive', { header: '', cell: (c) => <StatusBadge active={c.getValue()} /> }),
    col.display({
      id: 'actions',
      header: '',
      cell: (c) => (
        <RowActions
          onEdit={() => handlers.onEdit(c.row.original)}
          onDeactivate={() => handlers.onDeactivate(c.row.original)}
          onDelete={() => handlers.onDelete(c.row.original)}
        />
      ),
    }),
  ];
}
```

- [ ] **Step 4: Create `TaxCodesPage`**

Create `src/features/tax-codes/TaxCodesPage.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/common/DataTable';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { RoleGate } from '@/components/common/RoleGate';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useT } from '@/lib/i18n/useT';
import { accountsApi } from '@/features/accounts/hooks';
import { buildTaxCodeColumns } from './columns';
import { TaxCodeFormDialog } from './TaxCodeFormDialog';
import { taxCodesApi } from './hooks';
import type { TaxCode } from './schema';

export function TaxCodesPage() {
  const t = useT();
  const list = taxCodesApi.useList();
  const accounts = accountsApi.useList();
  const deactivate = taxCodesApi.useDeactivate();
  const remove = taxCodesApi.useRemove();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TaxCode | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'deactivate' | 'delete'; taxCode: TaxCode } | null>(null);

  const accountLabel = useMemo(() => {
    const map = new Map((accounts.data ?? []).map((a) => [a.id, `${a.code} — ${a.name}`]));
    return (id: string) => map.get(id) ?? '—';
  }, [accounts.data]);

  const columns = useMemo(
    () => buildTaxCodeColumns(t, accountLabel, {
      onEdit: (x) => setEditing(x),
      onDeactivate: (x) => setConfirm({ kind: 'deactivate', taxCode: x }),
      onDelete: (x) => setConfirm({ kind: 'delete', taxCode: x }),
    }),
    [t, accountLabel],
  );

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (list.data ?? []).filter((x) => !q || x.code.toLowerCase().includes(q) || x.name.toLowerCase().includes(q));
  }, [list.data, search]);

  function runConfirm() {
    if (!confirm) return;
    const action = confirm.kind === 'deactivate' ? deactivate : remove;
    const okMsg = confirm.kind === 'deactivate' ? t.crud.deactivated : t.crud.deleted;
    action.mutate(confirm.taxCode.id, {
      onSuccess: () => { toast.success(okMsg); setConfirm(null); },
      onError: () => toast.error(t.common.error),
    });
  }

  return (
    <div>
      <PageHeader title={t.taxCodes.title} actions={
        <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
          <Button onClick={() => setCreating(true)}><Plus className="size-4" /> {t.crud.new}</Button>
        </RoleGate>
      } />

      <div className="mb-4 max-w-xs">
        <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {list.isLoading ? <Skeleton className="h-40 w-full" />
        : list.isError ? <ErrorState error={list.error} />
        : <DataTable columns={columns} data={rows} />}

      <TaxCodeFormDialog open={creating} onOpenChange={setCreating} mode="create" />
      <TaxCodeFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} mode="edit" taxCode={editing ?? undefined} />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === 'delete' ? t.crud.confirmDeleteTitle : t.crud.confirmDeactivateTitle}
        description={confirm?.kind === 'delete' ? t.crud.confirmDeleteDesc : undefined}
        confirmLabel={confirm?.kind === 'delete' ? t.common.delete : t.crud.deactivate}
        destructive={confirm?.kind === 'delete'}
        pending={deactivate.isPending || remove.isPending}
        onConfirm={runConfirm}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test src/features/tax-codes/TaxCodesPage.test.tsx`
Expected: PASS (1 test — rate-as-% + joined account name).

- [ ] **Step 6: Commit**

```bash
git add src/features/tax-codes/columns.tsx src/features/tax-codes/TaxCodesPage.tsx src/features/tax-codes/TaxCodesPage.test.tsx
git commit -m "feat: tax codes list page with rate-as-percent and account join"
```

---

## Task 13: Wire the tax-codes route + full verification

**Files:**
- Modify: `src/app/routes/_app/tax-codes.tsx`

- [ ] **Step 1: Render the page**

Replace `src/app/routes/_app/tax-codes.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { TaxCodesPage } from '@/features/tax-codes/TaxCodesPage';

export const Route = createFileRoute('/_app/tax-codes')({
  component: TaxCodesPage,
});
```

- [ ] **Step 2: Full verification**

Run:
```bash
pnpm lint && pnpm test && pnpm build
```
Expected: lint 0 errors (benign react-compiler "incompatible library" warnings are acceptable); all tests pass; build succeeds.

- [ ] **Step 3: Manual smoke (optional, live API in `.env`)**

Run `pnpm dev`, log in, open **Mitra Bisnis** (create a partner; the empty state shows first) and **Kode Pajak** (the seeded tax codes list with rate-as-% and the joined account name; create one picking an account via the combobox and a percent rate).

- [ ] **Step 4: Commit**

```bash
git add src/app/routes/_app/tax-codes.tsx
git commit -m "feat: wire Tax Codes route"
```

---

## Done criteria for Plan 2b

- `/partners` and `/tax-codes` live with role-gated create/edit + ADMIN deactivate/delete.
- `AccountSelect` (postable+active filter) and `rate.ts` (string-only fraction⇄percent) built and tested.
- Account item schema uses `parentId`; tax codes list joins accounts for the name; rate handled as a fraction string end-to-end; partner customer/vendor validation enforced.
- `pnpm lint && pnpm test && pnpm build` all green.
- Plan 2 (Chart of Accounts + Partners + Tax Codes) complete.
```

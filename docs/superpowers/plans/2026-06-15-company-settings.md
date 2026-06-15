# Company Settings (Plan 10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/settings` page — view the company settings (any auth), and let an ADMIN edit them (legal name, NPWP, address, fiscal-year start month, the SoD toggle, PKP). Turning SoD off requires a confirmation.

**Architecture:** New `src/features/settings/` module (schema, GET/PATCH hooks, the form page). Reuses the established RHF + `zodResolver` + `applyApiErrorToForm` form pattern. Read-only for non-admins (fields disabled, no Save). `MONTHS_ID` is lifted to a shared module.

**Tech Stack:** React 19, TanStack Router + Query v5, react-hook-form + Zod v4, shadcn/ui (`Input`/`Textarea`/`Switch`/`Select`), Vitest 4 + RTL + MSW v2.

**Reference spec:** `docs/superpowers/specs/2026-06-15-company-settings-design.md`

---

## Ordering note

The `/settings` route + nav link only type-check after `routeTree.gen.ts` regenerates, so the route + nav + full build are the last task (Task 7). The page renders standalone in tests. The MSW handlers (Task 4) precede the hook/page tests.

## File Structure

```
src/lib/format/months.ts            # Task 2 — lifted MONTHS_ID
src/features/periods/schema.ts      # Task 2 — import + re-export MONTHS_ID (no behavior change)
src/features/settings/
  schema.ts / schema.test.ts        # Task 3 — settings + form schemas + toFormValues
  hooks.ts / hooks.test.tsx         # Task 5 — useCompanySettings + useUpdateCompanySettings
  SettingsPage.tsx / .test.tsx      # Task 6 — page + form
src/app/routes/_app/settings.tsx    # Task 7
src/lib/query/keys.ts               # Task 5 — +companySettings
src/lib/i18n/messages.id.ts         # Task 1 — +nav.settings, +settings group
src/components/common/AppShell.tsx  # Task 7 — nav item
src/test/handlers.ts                # Task 4 — companySettingsFixture + GET/PATCH handlers
```

**Reuse:** RHF + `zodResolver` + `applyApiErrorToForm(err, form, t)` + `toast.success` (per `src/features/accounts/AccountFormDialog.tsx`), shadcn `Input`/`Textarea`/`Switch`/`Select`/`Label`/`Button`, `ConfirmDialog`, `useRole` (`@/components/common/RoleGate`), `PageHeader`/`Skeleton`/`ErrorState`, `apiFetch`.

---

### Task 1: i18n — `nav.settings` + `settings` group

**Files:** Modify `src/lib/i18n/messages.id.ts`

- [ ] **Step 1:** Add `settings: 'Pengaturan',` to the `nav` group. Add a new `settings` group (e.g. after `audit`). Keep `export type Messages = typeof id;` intact.

```ts
  settings: {
    title: 'Pengaturan Perusahaan',
    legalName: 'Nama Resmi',
    npwp: 'NPWP',
    address: 'Alamat',
    fiscalYearStart: 'Awal Tahun Fiskal',
    currency: 'Mata Uang',
    sod: 'Segregasi Tugas',
    sodHelp: 'Pembuat dokumen tidak boleh menyetujui atau posting dokumennya sendiri.',
    pkp: 'PKP (Pengusaha Kena Pajak)',
    pkpHelp: 'Perusahaan terdaftar sebagai pemungut PPN.',
    save: 'Simpan',
    saved: 'Pengaturan tersimpan',
    adminOnly: 'Hanya admin yang dapat mengubah pengaturan.',
    confirmDisableSod: 'Menonaktifkan segregasi tugas menghapus kontrol bahwa pembuat dokumen tidak boleh menyetujui sendiri. Lanjutkan?',
  },
```

- [ ] **Step 2: Verify** — `pnpm build` (succeeds).
- [ ] **Step 3: Commit**
```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat(settings): i18n for company settings"
```

---

### Task 2: Lift `MONTHS_ID` to a shared module

**Files:** Create `src/lib/format/months.ts`; Modify `src/features/periods/schema.ts`

- [ ] **Step 1: Create `src/lib/format/months.ts`**

```ts
export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;
```

- [ ] **Step 2: Update `src/features/periods/schema.ts`** — remove the local `export const MONTHS_ID = [ … ] as const;` definition, add an import at the top, and re-export it (so any importer of `MONTHS_ID` from the periods schema still works and `monthLabel` keeps using it):

At the top (after the existing `import { z } from 'zod';`):
```ts
import { MONTHS_ID } from '@/lib/format/months';
```
Where the local const was, put:
```ts
export { MONTHS_ID };
```
`monthLabel` continues to reference `MONTHS_ID` unchanged.

- [ ] **Step 3: Verify** — `pnpm test --run src/features/periods/` (the periods suite stays green — pure refactor) and `pnpm build` (succeeds).

- [ ] **Step 4: Commit**
```bash
git add src/lib/format/months.ts src/features/periods/schema.ts
git commit -m "refactor: lift MONTHS_ID to src/lib/format/months"
```

---

### Task 3: Settings schema

**Files:** Create `src/features/settings/schema.ts`; Test `src/features/settings/schema.test.ts`

- [ ] **Step 1: Write the failing test** — `src/features/settings/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { companySettingsSchema, toFormValues } from './schema';

describe('company settings schema', () => {
  it('parses settings with null npwp/address', () => {
    const s = companySettingsSchema.parse({
      id: 'c1', singleton: true, legalName: 'My Company', npwp: null, address: null,
      fiscalYearStartMonth: 1, baseCurrency: 'IDR', segregationOfDutiesEnabled: true, isPkp: true,
      createdAt: 'x', updatedAt: 'y',
    });
    expect(s.legalName).toBe('My Company');
    expect(s.segregationOfDutiesEnabled).toBe(true);
  });
  it('toFormValues maps null text to empty strings', () => {
    const f = toFormValues(companySettingsSchema.parse({
      legalName: 'X', npwp: null, address: null, fiscalYearStartMonth: 3,
      segregationOfDutiesEnabled: false, isPkp: false,
    }));
    expect(f).toEqual({ legalName: 'X', npwp: '', address: '', fiscalYearStartMonth: 3, segregationOfDutiesEnabled: false, isPkp: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/settings/schema.test.ts` (FAIL: cannot resolve `./schema`).

- [ ] **Step 3: Write the implementation** — `src/features/settings/schema.ts`:

```ts
import { z } from 'zod';

export const companySettingsSchema = z.object({
  id: z.string().nullish(),
  singleton: z.boolean().nullish(),
  legalName: z.string().nullish(),
  npwp: z.string().nullish(),
  address: z.string().nullish(),
  fiscalYearStartMonth: z.number(),
  baseCurrency: z.string().nullish(),
  segregationOfDutiesEnabled: z.boolean(),
  isPkp: z.boolean(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});
export type CompanySettings = z.infer<typeof companySettingsSchema>;

export const companySettingsFormSchema = z.object({
  legalName: z.string().min(1),
  npwp: z.string(),
  address: z.string(),
  fiscalYearStartMonth: z.number().min(1).max(12),
  segregationOfDutiesEnabled: z.boolean(),
  isPkp: z.boolean(),
});
export type CompanySettingsForm = z.infer<typeof companySettingsFormSchema>;

export function toFormValues(s: CompanySettings): CompanySettingsForm {
  return {
    legalName: s.legalName ?? '',
    npwp: s.npwp ?? '',
    address: s.address ?? '',
    fiscalYearStartMonth: s.fiscalYearStartMonth,
    segregationOfDutiesEnabled: s.segregationOfDutiesEnabled,
    isPkp: s.isPkp,
  };
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/settings/schema.test.ts` (PASS, 2 tests).

- [ ] **Step 5: Commit**
```bash
git add src/features/settings/schema.ts src/features/settings/schema.test.ts
git commit -m "feat(settings): company settings + form schemas"
```

---

### Task 4: MSW handlers

**Files:** Modify `src/test/handlers.ts`

- [ ] **Step 1: Add `companySettingsFixture`** near the other fixture helpers:

```ts
export const companySettingsFixture = () => ({
  id: 'company-1', singleton: true, legalName: 'My Company', npwp: null, address: null,
  fiscalYearStartMonth: 1, baseCurrency: 'IDR', segregationOfDutiesEnabled: true, isPkp: true,
  createdAt: '2026-06-12T16:26:01.120Z', updatedAt: '2026-06-14T15:06:57.559Z',
});
```

- [ ] **Step 2: Add the handlers** to the `handlers` array (e.g. after the audit handler):

```ts
  http.get(`${API}/company/settings`, () => HttpResponse.json(companySettingsFixture())),
  http.patch(`${API}/company/settings`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...companySettingsFixture(), ...body });
  }),
```

- [ ] **Step 3: Verify** — `pnpm test --run` (existing suite stays green — additive handlers).

- [ ] **Step 4: Commit**
```bash
git add src/test/handlers.ts
git commit -m "test(settings): MSW GET/PATCH /company/settings handlers"
```

---

### Task 5: Query key + hooks

**Files:** Modify `src/lib/query/keys.ts`; Create `src/features/settings/hooks.ts`; Test `src/features/settings/hooks.test.tsx`

- [ ] **Step 1: Add the query key** to `queryKeys` in `src/lib/query/keys.ts`:

```ts
  companySettings: ['company-settings'] as const,
```

- [ ] **Step 2: Write the failing test** — `src/features/settings/hooks.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API, companySettingsFixture } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useCompanySettings, useUpdateCompanySettings } from './hooks';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('useCompanySettings returns the parsed settings', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  const { result } = renderHook(() => useCompanySettings(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.legalName).toBe('My Company');
});

it('useUpdateCompanySettings PATCHes the body', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let body: Record<string, unknown> | null = null;
  server.use(http.patch(`${API}/company/settings`, async ({ request }) => {
    body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...companySettingsFixture(), ...body });
  }));
  const { result } = renderHook(() => useUpdateCompanySettings(), { wrapper });
  result.current.mutate({ legalName: 'PT Baru', npwp: '', address: '', fiscalYearStartMonth: 1, segregationOfDutiesEnabled: true, isPkp: true });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(body).toMatchObject({ legalName: 'PT Baru', segregationOfDutiesEnabled: true });
});
```

- [ ] **Step 3: Run test to verify it fails** — `pnpm test --run src/features/settings/hooks.test.tsx` (FAIL: cannot resolve `./hooks`).

- [ ] **Step 4: Write the implementation** — `src/features/settings/hooks.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import { companySettingsSchema, type CompanySettings, type CompanySettingsForm } from './schema';

export function useCompanySettings() {
  return useQuery<CompanySettings, ApiError>({
    queryKey: queryKeys.companySettings,
    queryFn: () => apiFetch('/company/settings', { schema: companySettingsSchema }),
  });
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient();
  return useMutation<CompanySettings, ApiError, CompanySettingsForm>({
    mutationFn: (body) => apiFetch('/company/settings', { method: 'PATCH', body, schema: companySettingsSchema }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.companySettings }),
  });
}
```

- [ ] **Step 5: Run test to verify it passes** — `pnpm test --run src/features/settings/hooks.test.tsx` (PASS, 2 tests).

- [ ] **Step 6: Commit**
```bash
git add src/lib/query/keys.ts src/features/settings/hooks.ts src/features/settings/hooks.test.tsx
git commit -m "feat(settings): query key + company settings hooks"
```

---

### Task 6: `SettingsPage` + form

**Files:** Create `src/features/settings/SettingsPage.tsx`; Test `src/features/settings/SettingsPage.test.tsx`

- [ ] **Step 1: Write the failing test** — `src/features/settings/SettingsPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API, companySettingsFixture } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { SettingsPage } from './SettingsPage';

afterEach(() => useSession.getState().clear());

function renderPage(role: 'ADMIN' | 'VIEWER' = 'ADMIN') {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}><SettingsPage /></QueryClientProvider>);
}

it('ADMIN: form populates; editing Legal Name + Simpan PATCHes the new value', async () => {
  let patched: Record<string, unknown> | null = null;
  server.use(
    http.get(`${API}/company/settings`, () => HttpResponse.json(companySettingsFixture())),
    http.patch(`${API}/company/settings`, async ({ request }) => { patched = (await request.json()) as Record<string, unknown>; return HttpResponse.json({ ...companySettingsFixture(), ...patched }); }),
  );
  renderPage('ADMIN');
  const legal = await screen.findByLabelText('Nama Resmi');
  expect(legal).toHaveValue('My Company');
  const user = userEvent.setup();
  await user.clear(legal);
  await user.type(legal, 'PT Baru');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(patched).toMatchObject({ legalName: 'PT Baru' }));
});

it('ADMIN: turning SoD off + Simpan asks for confirmation then PATCHes false', async () => {
  let patched: Record<string, unknown> | null = null;
  server.use(
    http.get(`${API}/company/settings`, () => HttpResponse.json(companySettingsFixture())),
    http.patch(`${API}/company/settings`, async ({ request }) => { patched = (await request.json()) as Record<string, unknown>; return HttpResponse.json({ ...companySettingsFixture(), ...patched }); }),
  );
  renderPage('ADMIN');
  await screen.findByLabelText('Nama Resmi');
  const user = userEvent.setup();
  await user.click(screen.getByRole('switch', { name: 'Segregasi Tugas' }));
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(patched).toMatchObject({ segregationOfDutiesEnabled: false }));
});

it('VIEWER: fields disabled, no Simpan button, admin-only note', async () => {
  server.use(http.get(`${API}/company/settings`, () => HttpResponse.json(companySettingsFixture())));
  renderPage('VIEWER');
  expect(await screen.findByLabelText('Nama Resmi')).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Simpan' })).not.toBeInTheDocument();
  expect(screen.getByText(/hanya admin/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/settings/SettingsPage.test.tsx` (FAIL: cannot resolve `./SettingsPage`).

- [ ] **Step 3: Write the implementation** — `src/features/settings/SettingsPage.tsx`:

```tsx
import { useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { useRole } from '@/components/common/RoleGate';
import { Skeleton } from '@/components/ui/skeleton';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { MONTHS_ID } from '@/lib/format/months';
import { useT } from '@/lib/i18n/useT';
import { useCompanySettings, useUpdateCompanySettings } from './hooks';
import { companySettingsFormSchema, toFormValues, type CompanySettings, type CompanySettingsForm } from './schema';

export function SettingsPage() {
  const t = useT();
  const query = useCompanySettings();
  return (
    <div>
      <PageHeader title={t.settings.title} />
      {query.isLoading ? (
        <Skeleton className="h-96 w-full max-w-xl" />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : (
        <SettingsForm settings={query.data} />
      )}
    </div>
  );
}

function SettingsForm({ settings }: { settings: CompanySettings }) {
  const t = useT();
  const isAdmin = useRole() === 'ADMIN';
  const update = useUpdateCompanySettings();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pending = useRef<CompanySettingsForm | null>(null);
  const form = useForm<CompanySettingsForm>({
    resolver: zodResolver(companySettingsFormSchema),
    defaultValues: toFormValues(settings),
  });

  const save = (values: CompanySettingsForm) => {
    update.mutate(values, {
      onSuccess: () => toast.success(t.settings.saved),
      onError: (err) => applyApiErrorToForm(err, form, t),
    });
  };

  const onSubmit = (values: CompanySettingsForm) => {
    if (!values.segregationOfDutiesEnabled && settings.segregationOfDutiesEnabled) {
      pending.current = values;
      setConfirmOpen(true);
    } else {
      save(values);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="legalName">{t.settings.legalName}</Label>
        <Input id="legalName" disabled={!isAdmin} {...form.register('legalName')} />
        {form.formState.errors.legalName ? <p className="text-xs text-destructive">{form.formState.errors.legalName.message}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="npwp">{t.settings.npwp}</Label>
        <Input id="npwp" disabled={!isAdmin} {...form.register('npwp')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">{t.settings.address}</Label>
        <Textarea id="address" disabled={!isAdmin} {...form.register('address')} />
      </div>
      <div className="space-y-1.5">
        <Label>{t.settings.fiscalYearStart}</Label>
        <Controller
          control={form.control}
          name="fiscalYearStartMonth"
          render={({ field }) => (
            <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} disabled={!isAdmin}>
              <SelectTrigger className="w-48" aria-label={t.settings.fiscalYearStart}><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_ID.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t.settings.currency}</Label>
        <p className="text-sm text-muted-foreground">{settings.baseCurrency ?? 'IDR'}</p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">{t.settings.sod}</p>
          <p className="text-xs text-muted-foreground">{t.settings.sodHelp}</p>
        </div>
        <Controller control={form.control} name="segregationOfDutiesEnabled" render={({ field }) => (
          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!isAdmin} aria-label={t.settings.sod} />
        )} />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">{t.settings.pkp}</p>
          <p className="text-xs text-muted-foreground">{t.settings.pkpHelp}</p>
        </div>
        <Controller control={form.control} name="isPkp" render={({ field }) => (
          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!isAdmin} aria-label={t.settings.pkp} />
        )} />
      </div>

      {isAdmin ? (
        <Button type="submit" disabled={update.isPending}>{t.settings.save}</Button>
      ) : (
        <p className="text-sm text-muted-foreground">{t.settings.adminOnly}</p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t.settings.sod}
        description={t.settings.confirmDisableSod}
        confirmLabel={t.settings.save}
        destructive
        pending={update.isPending}
        onConfirm={() => { setConfirmOpen(false); if (pending.current) save(pending.current); }}
      />
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/settings/SettingsPage.test.tsx` (PASS, 3 tests).

- [ ] **Step 5: Commit**
```bash
git add src/features/settings/SettingsPage.tsx src/features/settings/SettingsPage.test.tsx
git commit -m "feat(settings): company settings page + form (SoD confirm-on-disable)"
```

## Context for Task 6

The page loads settings, then mounts `SettingsForm` with the real `defaultValues` (so RHF isn't initialised with undefined). `useRole() === 'ADMIN'` drives `disabled` on every field and whether the **Simpan** button (vs the admin-only note) renders. `applyApiErrorToForm(err, form, t)` is the established error handler (it applies field/root errors and toasts forbidden/SoD internally — no separate `toastApiError` needed). The SoD confirm fires only when turning the switch OFF from an ON state. `Switch`/`Select` are controlled via RHF `Controller`. The `ConfirmDialog` confirm button shares the label "Simpan" with the form button — the test scopes the confirm click with `within(dialog)`. The Radix `Switch` is a `role="switch"` button; `userEvent.click` toggles it (if flaky in jsdom, `fireEvent.click` works). Confirm import paths against `src/features/accounts/AccountFormDialog.tsx` (RHF + applyApiErrorToForm + toast) and `src/features/periods/PeriodsPage.tsx` (ConfirmDialog).

---

### Task 7: Route + nav + verification

**Files:** Create `src/app/routes/_app/settings.tsx`; Modify `src/components/common/AppShell.tsx`

- [ ] **Step 1: Create the route** — `src/app/routes/_app/settings.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
});
```

- [ ] **Step 2: Add the nav item** in `src/components/common/AppShell.tsx` — add `Settings` to the `lucide-react` import, and add to the `nav` array (the `as const` array) as the LAST item (after `payments`):

```tsx
    { to: '/settings', label: t.nav.settings, icon: Settings },
```

(Visible to everyone — GET is any-auth. The ADMIN-only Audit `Link` still renders after the array map.)

- [ ] **Step 3: Regenerate the route tree** — start `pnpm dev` in the background; poll `grep -q "/settings" src/routeTree.gen.ts && echo REGENERATED`; then stop the dev server. Verify: `grep -c "settings" src/routeTree.gen.ts` prints ≥ 1.

- [ ] **Step 4: Full verification**
  - `pnpm test --run` — expect all green (~221: 214 prior + 7 new = schema 2, hooks 2, SettingsPage 3).
  - `pnpm lint` — 0 errors (pre-existing warnings acceptable).
  - `pnpm build` — success (`tsc -b && vite build`; tsc accepts the typed `/settings` route + nav `Link`).

If `pnpm build` fails at `tsc` over an unknown `/settings` route, the tree wasn't regenerated — repeat Step 3 and rebuild.

- [ ] **Step 5: Dev smoke (optional)** — `pnpm dev`, log in as ADMIN, open `/settings`: confirm the form loads the real values, edit Legal Name + Simpan (success toast), and that toggling SoD off prompts the confirm. **⚠️ If you toggle SoD while testing, set it back ON and save so `segregationOfDutiesEnabled` is restored to `true`** (SoD-restore discipline). A non-admin login should see the fields disabled + the admin-only note. Stop the server.

- [ ] **Step 6: Commit**
```bash
git add src/app/routes/_app/settings.tsx src/components/common/AppShell.tsx src/routeTree.gen.ts
git commit -m "feat(settings): /settings route + nav entry"
```

---

## Done Criteria

- A "Pengaturan" nav link → `/settings`: a form showing the company settings (legal name, NPWP, address, fiscal-year start month, SoD + PKP switches, read-only currency). ADMIN can edit and **Simpan**; turning SoD off prompts a confirm before saving. Non-admins see the values disabled with an "admin only" note.
- All tests pass (~221); lint clean; build green. `MONTHS_ID` lives in `src/lib/format/months.ts` (periods unchanged in behavior).

## Out of Scope (YAGNI)

NPWP format masking/validation, editing `baseCurrency` (not in the DTO), logo upload, multi-company, client-side enforcement of `fiscalYearStartMonth` on periods. This is the last core slice — after it the only deferred item is the dashboard "Jurnal Draft" → `/journals` link.

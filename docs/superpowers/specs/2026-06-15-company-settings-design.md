# Company Settings (Plan 10) — Design

**Plan:** 10 — Company Settings (Pengaturan), a single-form editor for the company singleton — including the Segregation-of-Duties toggle. The **last core slice**; after it the app is feature-complete.

**Status:** approved design, pre-implementation.

---

## Purpose

Let users view the company's settings (any auth) and let an ADMIN edit them: legal identity (name, NPWP, address), fiscal-year start month, and the two control flags — `segregationOfDutiesEnabled` (the SoD enforcement that the whole app already handles defensively) and `isPkp` (VAT-registered). One GET, one PATCH.

---

## Reconciled API shape

`GET /company/settings` · **any auth**; `PATCH /company/settings` · **ADMIN**.

**GET response** (live-reconciled 2026-06-15):
```jsonc
{
  "id": "42ddc5f2-…",
  "singleton": true,
  "legalName": "My Company",
  "npwp": null,                       // nullable
  "address": null,                    // nullable
  "fiscalYearStartMonth": 1,          // 1-12
  "baseCurrency": "IDR",              // read-only (NOT in the PATCH DTO)
  "segregationOfDutiesEnabled": true,
  "isPkp": true,
  "createdAt": "…", "updatedAt": "…"
}
```

**PATCH body** = `UpdateCompanySettingsDto` (all optional — partial update): `{ legalName?: string, npwp?: string, address?: string, fiscalYearStartMonth?: number(1-12), segregationOfDutiesEnabled?: boolean, isPkp?: boolean }`. The PATCH was **not run live** (it would mutate the real singleton and could flip the SoD flag, which must stay `true`); its response is assumed to be the updated settings object (the schema is tolerant). `baseCurrency` is read-only — not editable.

---

## Architecture

New module **`src/features/settings/`** — schema, two hooks, and the page/form.

**Data layer:**
- `useCompanySettings()` → `useQuery({ queryKey: queryKeys.companySettings, queryFn: () => apiFetch('/company/settings', { schema: companySettingsSchema }) })` (any-auth).
- `useUpdateCompanySettings()` → `useMutation({ mutationFn: (body: CompanySettingsForm) => apiFetch('/company/settings', { method: 'PATCH', body, schema: companySettingsSchema }), onSuccess: invalidate queryKeys.companySettings })`. PATCH is ADMIN-gated server-side (a non-admin PATCH → `403`, surfaced via `toastApiError`); the UI also hides the Save button for non-admins.

`queryKeys.companySettings = ['company-settings'] as const` added to `src/lib/query/keys.ts`.

**Roles:** the page renders for everyone (GET any-auth). Editing is ADMIN-only — fields `disabled` and the Save button hidden behind `RoleGate allow={['ADMIN']}` for non-admins, with a muted "admin only" note.

---

## Components

### Schema — `src/features/settings/schema.ts`

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

// Map the loaded settings → form defaults (nullable text → '').
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

Month names: reuse `MONTHS_ID` — **lift it from `src/features/periods/schema.ts` to a shared `src/lib/format/months.ts`** (both periods and settings use it; re-export from the periods schema to avoid touching periods call-sites, or update the one import). A small refactor that removes cross-feature coupling.

### `useCompanySettings` / `useUpdateCompanySettings` — `src/features/settings/hooks.ts`

As in the data layer above. The update hook's `onSuccess` invalidates `queryKeys.companySettings` and the page shows a success toast.

### `SettingsPage` — `src/features/settings/SettingsPage.tsx`

- `useCompanySettings()` → loading `Skeleton` / `ErrorState` / then the form.
- A guarded inner form component (`SettingsForm`) receives the loaded `settings`; `useRole()` decides editability. RHF `useForm({ resolver: zodResolver(companySettingsFormSchema), defaultValues: toFormValues(settings) })`.
- Fields: **Legal Name** (`Input`, required), **NPWP** (`Input`), **Alamat** (`Textarea`), **Awal Tahun Fiskal** (`Select` 1-12 via `MONTHS_ID`), **Mata Uang** (read-only `<p>` showing `settings.baseCurrency ?? 'IDR'`), **Segregasi Tugas** (`Switch` + helper), **PKP** (`Switch` + helper). All inputs get `disabled={!isAdmin}`.
- Non-admin: no Save button; a muted `t.settings.adminOnly` note. Admin: a **Simpan** button (`RoleGate allow={['ADMIN']}`).
- **Submit flow:** `onSubmit(values)` — if `values.segregationOfDutiesEnabled === false && settings.segregationOfDutiesEnabled === true` (turning SoD off) → stash `values`, open a `ConfirmDialog` (`t.settings.confirmDisableSod`); its `onConfirm` runs the save. Otherwise save directly.
- `save(values)` → `useUpdateCompanySettings().mutate(values, { onSuccess: () => toast(t.settings.saved), onError: (e) => applyApiErrorToForm(e, form.setError) ?? toastApiError(e) })`. (Follow the exact `applyApiErrorToForm`/`toastApiError` pattern used by `AccountFormDialog`.)

The Save button shows a pending state while the mutation is in flight.

### Route & nav

- `src/app/routes/_app/settings.tsx` → `SettingsPage`.
- `AppShell`: add `{ to: '/settings', label: t.nav.settings, icon: Settings }` to the `nav` array (last item — visible to everyone, since GET is any-auth). Import `Settings` from `lucide-react`. (The ADMIN-only Audit `Link` still renders after the array map.)

---

## i18n

`nav.settings: 'Pengaturan'` + a `settings` group in `src/lib/i18n/messages.id.ts`:

```
title: 'Pengaturan Perusahaan'
legalName: 'Nama Resmi'
npwp: 'NPWP'
address: 'Alamat'
fiscalYearStart: 'Awal Tahun Fiskal'
currency: 'Mata Uang'
sod: 'Segregasi Tugas'
sodHelp: 'Pembuat dokumen tidak boleh menyetujui atau posting dokumennya sendiri.'
pkp: 'PKP (Pengusaha Kena Pajak)'
pkpHelp: 'Perusahaan terdaftar sebagai pemungut PPN.'
save: 'Simpan'
saved: 'Pengaturan tersimpan'
adminOnly: 'Hanya admin yang dapat mengubah pengaturan.'
confirmDisableSod: 'Menonaktifkan segregasi tugas menghapus kontrol bahwa pembuat dokumen tidak boleh menyetujui sendiri. Lanjutkan?'
```

(`MONTHS_ID` provides the month options — not i18n strings.)

---

## Data flow

1. Page mounts → `useCompanySettings()` → form populates from the singleton.
2. ADMIN edits a field → **Simpan** → `onSubmit`. If turning SoD off → `ConfirmDialog` → confirm → PATCH; else PATCH directly. Success → toast + invalidate (form re-syncs to the saved values).
3. Non-admin → fields disabled, no Save, "admin only" note.
4. A non-admin PATCH (shouldn't happen via UI) → `403` → `toastApiError`.

## Error & edge handling

- Loading/error → `Skeleton` / `ErrorState` (with `traceId`).
- 403 FORBIDDEN / field-level 422 → `toastApiError` / `applyApiErrorToForm`.
- `npwp`/`address` null → `''` in the form; submitting empty sends `''`.
- The form is only mounted after settings load (so `defaultValues` are real, not undefined).

---

## Testing

TDD; `SettingsPage` renders standalone with `QueryClientProvider`; role via `useSession.setUser`. MSW: add `GET`/`PATCH /company/settings` + a `companySettingsFixture` to `src/test/handlers.ts`.

- **`schema.test.ts`** — parse the GET fixture (incl. `npwp`/`address` null); `toFormValues` maps nulls to `''`.
- **`hooks.test.tsx`** — `useCompanySettings` returns the parsed object; `useUpdateCompanySettings` PATCHes the body (capture the request) and reports success.
- **`SettingsPage.test.tsx`**:
  - **ADMIN**: the form shows "My Company" and the SoD switch on; editing Legal Name + **Simpan** → PATCH fires with the new `legalName`; switching SoD off + Simpan → a `ConfirmDialog` appears, and confirming sends `segregationOfDutiesEnabled: false`.
  - **VIEWER**: the Legal Name input is `disabled`, there is no **Simpan** button, and the "Hanya admin…" note shows.

Full suite expected ≈ **214 + ~8 new**. Final task: `pnpm test --run`, `pnpm lint`, `pnpm build` green; `routeTree.gen.ts` regenerated.

⚠️ **The optional dev smoke must restore `segregationOfDutiesEnabled` to `true`** if it toggles SoD while testing the live save (the SoD-restore discipline; see [[live-api-reconciliation]]).

---

## Scope

**In:** the settings form (legalName, npwp, address, fiscalYearStartMonth, segregationOfDutiesEnabled, isPkp + read-only baseCurrency), GET/PATCH hooks, read-only-for-non-admin, SoD confirm-on-disable, the `/settings` route, nav, i18n, tests, and lifting `MONTHS_ID` to a shared module.

**Out (deferred / YAGNI):** NPWP format masking/validation, editing `baseCurrency` (not in the DTO), a company logo upload, multi-company support, and any client-side enforcement of `fiscalYearStartMonth` onto periods (a server concern). After this slice the core app is feature-complete; the only deferred item is the tiny dashboard "Jurnal Draft" → `/journals` link.

---

## Reuse summary

| Need | Reuse (unchanged) |
|---|---|
| Fetch + parse | `apiFetch` (`schema`, PATCH `body`), `useQuery`/`useMutation` |
| Form | RHF + `zodResolver`, `applyApiErrorToForm` (per `AccountFormDialog`) |
| Inputs | shadcn `Input`/`Textarea`/`Switch`/`Select`/`Label`, `Button` |
| Confirm | `ConfirmDialog` |
| Role gating | `RoleGate`/`useRole` |
| Errors | `applyApiErrorToForm`, `toastApiError` (403 already mapped) |
| Loading/error | `Skeleton`, `ErrorState`, `PageHeader` |
| Months | `MONTHS_ID` (lifted to `src/lib/format/months.ts`) |
| Query keys | `src/lib/query/keys.ts` (+`companySettings`) |

New: `src/features/settings/*` (schema + hooks + `SettingsPage`/`SettingsForm`), one route, a `settings` i18n group + `nav.settings`, an AppShell nav item, `GET`/`PATCH /company/settings` MSW handlers, and `src/lib/format/months.ts`.

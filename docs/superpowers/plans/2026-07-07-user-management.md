# User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ADMIN user management (`/v1/users` CRUD) plus the password lifecycle — self-service change password and a forced first-login change with global `403 PASSWORD_CHANGE_REQUIRED` handling.

**Architecture:** Three cohesive slices. (1) **Foundations**: extend the session/`/auth/me` model with `mustChangePassword`, and teach `apiFetch` to convert a `403 PASSWORD_CHANGE_REQUIRED` into a session-flag flip. (2) **Password lifecycle UI**: a shared `ChangePasswordForm`, a self-service dialog from the account menu, and a blocking `ChangePasswordScreen` gated inside `AppShell`. (3) **Admin Users page**: a bespoke `features/users/` feature (list + create/edit dialogs + one-time temp-password reveal + reset) reusing the app's list/dialog primitives.

**Tech Stack:** React 19 + React Compiler, TypeScript strict, TanStack Router (file-based) + Query v5, react-hook-form + zod v4, shadcn/ui, Vitest 4 + RTL + MSW v2. Spec: `docs/superpowers/specs/2026-07-07-user-management-design.md`.

## Global Constraints

- **i18n:** every user-facing string via `useT()` (`src/lib/i18n/messages.id.ts`, Indonesian). No hardcoded copy. **No em-dashes in UI strings.**
- **Status:** convey state with icon + text, never color alone (use `StatusBadge`).
- **Async UI:** wrap query rendering in `QueryState` (loading → not-found → error → data).
- **Role gating is defense-in-depth** — the backend enforces; the UI mirrors. `/users/*` is ADMIN-only end-to-end.
- **Credentials:** never auto-fill or programmatically enter the temp password; it is *displayed once* to the operator, copy-to-clipboard only, never logged or persisted.
- **Typecheck = `pnpm run build`** (`tsc -b`; root `tsc --noEmit` is a no-op). Tests: `pnpm test --run`. Lint: `pnpm run lint`. React Compiler runs only in the build/dev, not Vitest.
- **New routes:** regenerate `src/routeTree.gen.ts` by briefly starting the dev server (`pnpm dev`, wait ~6s, kill) — there is no standalone `tsr` CLI.
- **Password rule:** `newPassword` 8–128 chars. Change-password endpoint is throttled 10/min.
- **React Compiler + react-hook-form:** read form values in memoized field sub-components with `useWatch({ control, name })`, never `form.watch(...)`, or the control freezes (see `stores` note in CLAUDE.md history).

---

## Phase 1 — Foundations (session flag, schema, global 403)

### Task 1: `mustChangePassword` on the session model

**Files:**
- Modify: `src/lib/schemas/auth.ts`
- Modify: `src/stores/session.ts`
- Modify: `src/test/handlers.ts:152-158` (the `/auth/me` fixture)
- Test: `src/lib/schemas/auth.test.ts` (create)

**Interfaces:**
- Produces: `meSchema` now yields `{ id, email, role, mustChangePassword: boolean }`; `AuthUser` gains `mustChangePassword: boolean`; new store action `setMustChangePassword(flag: boolean): void`; new `okFlagSchema = z.object({ ok: z.boolean() })`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/schemas/auth.test.ts`:
```ts
import { expect, it } from 'vitest';
import { meSchema } from './auth';

it('meSchema defaults mustChangePassword to false when absent', () => {
  const me = meSchema.parse({ id: 'u1', email: 'a@b.c', role: 'ADMIN' });
  expect(me.mustChangePassword).toBe(false);
});

it('meSchema keeps mustChangePassword when present', () => {
  const me = meSchema.parse({ id: 'u1', email: 'a@b.c', role: 'ADMIN', mustChangePassword: true });
  expect(me.mustChangePassword).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/lib/schemas/auth.test.ts`
Expected: FAIL (`mustChangePassword` is `undefined`).

- [ ] **Step 3: Implement**

In `src/lib/schemas/auth.ts`, extend `meSchema` and add `okFlagSchema`:
```ts
export const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: roleSchema,
  // Absent on older payloads -> false. The live /auth/me always returns it.
  mustChangePassword: z.boolean().default(false),
});

export const okFlagSchema = z.object({ ok: z.boolean() });
```

In `src/stores/session.ts`, extend `AuthUser` and add the action. Change the type:
```ts
export type AuthUser = { id: string; email: string; role: Role; mustChangePassword: boolean };
```
Add to `SessionState` interface: `setMustChangePassword(flag: boolean): void;`
Add to the store body (next to `setUser`):
```ts
setMustChangePassword: (flag) =>
  set((s) => (s.user ? { user: { ...s.user, mustChangePassword: flag } } : {})),
```

In `src/test/handlers.ts`, update the `/auth/me` success return so live-shaped fixtures include the field:
```ts
return HttpResponse.json({ id: 'u1', email: 'admin@buku.id', role: 'ADMIN', mustChangePassword: false });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test --run src/lib/schemas/auth.test.ts src/features/auth`
Expected: PASS (existing auth/hydrate tests still green — `AuthUser` now requires `mustChangePassword`, but every `setUser` gets it from `meSchema`; check for any test that constructs `setUser({...})` by hand and add `mustChangePassword: false`).

- [ ] **Step 5: Fix any hand-built `setUser` calls in tests**

Run: `git grep -n "setUser({" src` — for each test that builds a user literal (e.g. `app-shell.test.tsx`, `DocumentEditorPage.test.tsx`, `SettingsPage.test.tsx`), add `mustChangePassword: false`. Re-run `pnpm test --run` until green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas/auth.ts src/stores/session.ts src/test/handlers.ts src/lib/schemas/auth.test.ts src
git commit -m "feat(auth): add mustChangePassword to session + /auth/me model"
```

---

### Task 2: Classify `403 PASSWORD_CHANGE_REQUIRED`

**Files:**
- Modify: `src/lib/api/classifyApiError.ts`
- Test: `src/lib/api/classifyApiError.test.ts` (add case)

**Interfaces:**
- Produces: `ApiErrorKind` gains `'passwordChangeRequired'`; a `403` with `code === 'PASSWORD_CHANGE_REQUIRED'` classifies to it.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/api/classifyApiError.test.ts`:
```ts
it('classifies 403 PASSWORD_CHANGE_REQUIRED distinctly', () => {
  const err = new ApiError({ status: 403, code: 'PASSWORD_CHANGE_REQUIRED', message: 'x' });
  expect(classifyApiError(err).kind).toBe('passwordChangeRequired');
});
```
(Ensure `ApiError` and `classifyApiError` are imported at the top of the file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/lib/api/classifyApiError.test.ts`
Expected: FAIL (currently classifies to `'forbidden'`).

- [ ] **Step 3: Implement**

In `src/lib/api/classifyApiError.ts`, add `'passwordChangeRequired'` to the `ApiErrorKind` union, and update the 403 branch:
```ts
else if (status === 403)
  kind =
    code === 'PASSWORD_CHANGE_REQUIRED'
      ? 'passwordChangeRequired'
      : code === 'SEGREGATION_OF_DUTIES'
        ? 'segregationOfDuties'
        : 'forbidden';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run src/lib/api/classifyApiError.test.ts`
Expected: PASS. `describeError` and `toastApiError` both `switch (kind)` with a `default:` branch (confirmed), so the new `passwordChangeRequired` kind falls through to the generic default with no typecheck or runtime break — no change needed there.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/classifyApiError.ts src/lib/api/classifyApiError.test.ts
git commit -m "feat(api): classify 403 PASSWORD_CHANGE_REQUIRED"
```

---

### Task 3: `apiFetch` flips the session flag on `PASSWORD_CHANGE_REQUIRED`

**Files:**
- Modify: `src/lib/api/client.ts` (in `runWithRetries`)
- Test: `src/lib/api/client.test.ts` (add case)

**Interfaces:**
- Consumes: `useSession.getState().setMustChangePassword` (Task 1).
- Produces: any `apiFetch` call that receives `403 PASSWORD_CHANGE_REQUIRED` sets the session flag `true`, then re-throws the `ApiError`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/api/client.test.ts` (follow the file's existing MSW `server.use(...)` + `useSession` setup):
```ts
it('flips mustChangePassword when a call returns 403 PASSWORD_CHANGE_REQUIRED', async () => {
  useSession.getState().setTokens({ accessToken: 'tok', refreshToken: 'r' });
  useSession.getState().setUser({ id: 'u1', email: 'a@b.c', role: 'VIEWER', mustChangePassword: false });
  server.use(
    http.get(`${API}/partners`, () =>
      HttpResponse.json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'x' }, { status: 403 }),
    ),
  );
  await expect(apiFetch('/partners')).rejects.toThrow();
  expect(useSession.getState().user?.mustChangePassword).toBe(true);
});
```
(Import `useSession` from `@/stores/session`, `http`/`HttpResponse` from `msw`, `API` from `@/test/handlers`, `server` from `@/test/server` — match the file's existing imports; add missing ones.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/lib/api/client.test.ts`
Expected: FAIL (flag stays `false`).

- [ ] **Step 3: Implement**

In `src/lib/api/client.ts`, add the import at the top (it already imports `useSession`) — no new import needed. In `runWithRetries`, inside the `catch` block after `const e = err;` and before the `401` branch, add:
```ts
// Password change required: the API 403-blocks every endpoint until the user
// changes their temp password. Flip the global flag so the shell renders the
// blocking screen, then let the error propagate.
if (e.status === 403 && e.code === 'PASSWORD_CHANGE_REQUIRED') {
  useSession.getState().setMustChangePassword(true);
  throw err;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run src/lib/api/client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/client.ts src/lib/api/client.test.ts
git commit -m "feat(api): route 403 PASSWORD_CHANGE_REQUIRED to the session flag"
```

---

## Phase 2 — Password lifecycle UI

### Task 4: `useChangePassword` hook

**Files:**
- Create: `src/features/auth/useChangePassword.ts`
- Test: `src/features/auth/useChangePassword.test.tsx`

**Interfaces:**
- Consumes: `okFlagSchema` (Task 1).
- Produces: `useChangePassword()` → mutation with variables `{ currentPassword: string; newPassword: string }`, resolving `{ ok: boolean }`; `POST /auth/change-password`.

- [ ] **Step 1: Write the failing test**

Create `src/features/auth/useChangePassword.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useChangePassword } from './useChangePassword';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('posts to /auth/change-password and resolves ok', async () => {
  let body: unknown;
  server.use(
    http.post(`${API}/auth/change-password`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({ ok: true });
    }),
  );
  const { result } = renderHook(() => useChangePassword(), { wrapper });
  await result.current.mutateAsync({ currentPassword: 'old', newPassword: 'new-password-1' });
  await waitFor(() => expect(body).toEqual({ currentPassword: 'old', newPassword: 'new-password-1' }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/features/auth/useChangePassword.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/features/auth/useChangePassword.ts`:
```ts
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { okFlagSchema } from '@/lib/schemas/auth';

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  return useMutation<{ ok: boolean }, ApiError, ChangePasswordInput>({
    mutationFn: (body) =>
      apiFetch('/auth/change-password', { method: 'POST', body, schema: okFlagSchema }),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run src/features/auth/useChangePassword.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/useChangePassword.ts src/features/auth/useChangePassword.test.tsx
git commit -m "feat(auth): useChangePassword hook"
```

---

### Task 5: `ChangePasswordForm` (shared, self-contained)

**Files:**
- Create: `src/features/auth/ChangePasswordForm.tsx`
- Modify: `src/lib/i18n/messages.id.ts` (add `auth` password keys)
- Test: `src/features/auth/ChangePasswordForm.test.tsx`

**Interfaces:**
- Consumes: `useChangePassword` (Task 4).
- Produces: `ChangePasswordForm({ onSuccess, submitLabel, currentPasswordLabel })` — a self-contained `<form>` (three fields + submit). Props: `onSuccess: () => void | Promise<void>`, `submitLabel: string`, `currentPasswordLabel: string`. Validates `newPassword` 8–128 and `confirmNewPassword` match; maps a `401` to a `currentPassword` field error.

- [ ] **Step 1: Add i18n keys**

In `src/lib/i18n/messages.id.ts`, inside the `auth: { ... }` namespace add:
```ts
    changePassword: 'Ubah Kata Sandi',
    currentPassword: 'Kata sandi saat ini',
    tempPasswordLabel: 'Kata sandi sementara',
    newPassword: 'Kata sandi baru',
    confirmNewPassword: 'Konfirmasi kata sandi baru',
    newPasswordHint: 'Minimal 8 karakter.',
    passwordChanged: 'Kata sandi berhasil diubah',
    passwordTooShort: 'Kata sandi minimal 8 karakter',
    passwordTooLong: 'Kata sandi maksimal 128 karakter',
    passwordMismatch: 'Konfirmasi kata sandi tidak cocok',
    currentPasswordWrong: 'Kata sandi saat ini salah',
    forcedTitle: 'Ganti kata sandi Anda',
    forcedSubtitle: 'Anda harus mengganti kata sandi sementara sebelum melanjutkan.',
```

- [ ] **Step 2: Write the failing test**

Create `src/features/auth/ChangePasswordForm.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { ChangePasswordForm } from './ChangePasswordForm';

function renderForm(onSuccess = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ChangePasswordForm onSuccess={onSuccess} submitLabel="Simpan" currentPasswordLabel="Kata sandi saat ini" />
    </QueryClientProvider>,
  );
  return onSuccess;
}

it('rejects a mismatched confirmation without calling the API', async () => {
  const user = userEvent.setup();
  const onSuccess = renderForm();
  await user.type(screen.getByLabelText('Kata sandi saat ini'), 'old');
  await user.type(screen.getByLabelText('Kata sandi baru'), 'new-password-1');
  await user.type(screen.getByLabelText('Konfirmasi kata sandi baru'), 'different-1');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByText('Konfirmasi kata sandi tidak cocok')).toBeInTheDocument();
  expect(onSuccess).not.toHaveBeenCalled();
});

it('calls onSuccess after a successful change', async () => {
  server.use(http.post(`${API}/auth/change-password`, () => HttpResponse.json({ ok: true })));
  const user = userEvent.setup();
  const onSuccess = renderForm();
  await user.type(screen.getByLabelText('Kata sandi saat ini'), 'old');
  await user.type(screen.getByLabelText('Kata sandi baru'), 'new-password-1');
  await user.type(screen.getByLabelText('Konfirmasi kata sandi baru'), 'new-password-1');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
});

it('shows a field error when the current password is wrong (401)', async () => {
  server.use(
    http.post(`${API}/auth/change-password`, () =>
      HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
    ),
  );
  const user = userEvent.setup();
  renderForm();
  await user.type(screen.getByLabelText('Kata sandi saat ini'), 'wrong');
  await user.type(screen.getByLabelText('Kata sandi baru'), 'new-password-1');
  await user.type(screen.getByLabelText('Konfirmasi kata sandi baru'), 'new-password-1');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByText('Kata sandi saat ini salah')).toBeInTheDocument();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test --run src/features/auth/ChangePasswordForm.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement**

Create `src/features/auth/ChangePasswordForm.tsx`:
```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/common/FieldError';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';
import { useChangePassword } from './useChangePassword';

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    confirmNewPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'mismatch',
  });
type Values = z.infer<typeof schema>;

export function ChangePasswordForm({
  onSuccess,
  submitLabel,
  currentPasswordLabel,
}: {
  onSuccess: () => void | Promise<void>;
  submitLabel: string;
  currentPasswordLabel: string;
}) {
  const t = useT();
  const change = useChangePassword();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  async function onSubmit(values: Values) {
    try {
      await change.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      await onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        form.setError('currentPassword', { message: t.auth.currentPasswordWrong });
      } else {
        form.setError('root', { message: t.common.error });
      }
    }
  }

  const e = form.formState.errors;
  const newPasswordError = e.newPassword
    ? e.newPassword.type === 'too_big'
      ? t.auth.passwordTooLong
      : t.auth.passwordTooShort
    : undefined;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">{currentPasswordLabel}</Label>
        <Input id="currentPassword" type="password" autoComplete="current-password" {...form.register('currentPassword')} />
        <FieldError message={e.currentPassword?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">{t.auth.newPassword}</Label>
        <Input id="newPassword" type="password" autoComplete="new-password" {...form.register('newPassword')} />
        <p className="text-xs text-muted-foreground">{t.auth.newPasswordHint}</p>
        <FieldError message={newPasswordError} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmNewPassword">{t.auth.confirmNewPassword}</Label>
        <Input id="confirmNewPassword" type="password" autoComplete="new-password" {...form.register('confirmNewPassword')} />
        <FieldError message={e.confirmNewPassword ? t.auth.passwordMismatch : undefined} />
      </div>
      <FieldError message={e.root?.message} />
      <Button type="submit" className="w-full" disabled={change.isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
```
Note: `t.auth.currentPasswordWrong` is passed as the `currentPassword` field message, so the field-level `FieldError message={e.currentPassword?.message}` renders it directly.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test --run src/features/auth/ChangePasswordForm.test.tsx`
Expected: PASS (all three cases).

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/ChangePasswordForm.tsx src/features/auth/ChangePasswordForm.test.tsx src/lib/i18n/messages.id.ts
git commit -m "feat(auth): shared ChangePasswordForm"
```

---

### Task 6: Self-service `ChangePasswordDialog` in the account menu

**Files:**
- Create: `src/features/auth/ChangePasswordDialog.tsx`
- Modify: `src/components/nav-user.tsx`
- Test: `src/components/nav-user.test.tsx` (create)

**Interfaces:**
- Consumes: `ChangePasswordForm` (Task 5).
- Produces: `ChangePasswordDialog({ open, onOpenChange })`; a `Ubah Kata Sandi` menu item in `NavUser` that opens it.

- [ ] **Step 1: Write the failing test**

Create `src/components/nav-user.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { NavUser } from './nav-user';

afterEach(() => useSession.getState().clear());

function renderNavUser() {
  useSession.getState().setUser({ id: 'u1', email: 'a@b.c', role: 'ADMIN', mustChangePassword: false });
  const qc = new QueryClient();
  const root = createRootRoute({ component: () => <NavUser /> });
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ['/'] }) });
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

it('opens the change-password dialog from the account menu', async () => {
  const user = userEvent.setup();
  renderNavUser();
  await user.click(await screen.findByRole('button', { name: 'Menu akun' }));
  await user.click(await screen.findByRole('menuitem', { name: 'Ubah Kata Sandi' }));
  expect(await screen.findByRole('dialog', { name: 'Ubah Kata Sandi' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/components/nav-user.test.tsx`
Expected: FAIL (no such menu item).

- [ ] **Step 3: Implement the dialog**

Create `src/features/auth/ChangePasswordDialog.tsx`:
```tsx
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n/useT';
import { ChangePasswordForm } from './ChangePasswordForm';

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label={t.auth.changePassword}>
        <DialogHeader>
          <DialogTitle>{t.auth.changePassword}</DialogTitle>
          <DialogDescription>{t.auth.newPasswordHint}</DialogDescription>
        </DialogHeader>
        <ChangePasswordForm
          submitLabel={t.auth.changePassword}
          currentPasswordLabel={t.auth.currentPassword}
          onSuccess={() => {
            toast.success(t.auth.passwordChanged);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Wire into `NavUser`**

In `src/components/nav-user.tsx`: add `import { useState } from "react";`, `import { KeyRound } from "lucide-react";`, and `import { ChangePasswordDialog } from "@/features/auth/ChangePasswordDialog";`. Inside the component add `const [pwOpen, setPwOpen] = useState(false);`. Add a menu item before the sign-out item:
```tsx
<DropdownMenuItem onSelect={() => setPwOpen(true)}>
  <KeyRound />
  {t.auth.changePassword}
</DropdownMenuItem>
<DropdownMenuSeparator />
```
And render the dialog after `</DropdownMenu>` (wrap the return in a fragment):
```tsx
<ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test --run src/components/nav-user.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/ChangePasswordDialog.tsx src/components/nav-user.tsx src/components/nav-user.test.tsx
git commit -m "feat(auth): self-service change-password from the account menu"
```

---

### Task 7: Blocking `ChangePasswordScreen` + `AppShell` guard

**Files:**
- Create: `src/features/auth/ChangePasswordScreen.tsx`
- Modify: `src/components/app-shell.tsx`
- Test: `src/components/app-shell.test.tsx` (add case)

**Interfaces:**
- Consumes: `ChangePasswordForm` (Task 5), `fetchMe` (`features/auth/useMe`), `useSession`.
- Produces: `ChangePasswordScreen` (no props); `AppShell` early-returns it when `user.mustChangePassword`.

- [ ] **Step 1: Write the failing test**

Add to `src/components/app-shell.test.tsx` (it already imports `AppShell`, `useSession`, and has a router harness — reuse `renderInRouter`):
```ts
it('blocks the shell with the change-password screen when mustChangePassword', async () => {
  useSession.getState().setUser({ id: '1', email: 'admin@buku.id', role: 'ADMIN', mustChangePassword: true });
  renderInRouter(<AppShell><div>secret content</div></AppShell>);
  expect(await screen.findByRole('heading', { name: 'Ganti kata sandi Anda' })).toBeInTheDocument();
  expect(screen.queryByText('secret content')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/components/app-shell.test.tsx`
Expected: FAIL (renders shell content, no such heading).

- [ ] **Step 3: Implement the screen**

Create `src/features/auth/ChangePasswordScreen.tsx`:
```tsx
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { BookText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';
import { logoutCurrentDevice } from '@/lib/api/logout';
import { useSession } from '@/stores/session';
import { fetchMe } from './useMe';
import { ChangePasswordForm } from './ChangePasswordForm';

export function ChangePasswordScreen() {
  const t = useT();
  const navigate = useNavigate();

  async function handleSignOut() {
    await logoutCurrentDevice();
    useSession.getState().clear();
    void navigate({ to: '/login' });
  }

  async function onSuccess() {
    toast.success(t.auth.passwordChanged);
    useSession.getState().setMustChangePassword(false);
    // Re-hydrate to pick up the server's cleared flag (belt and suspenders).
    try {
      useSession.getState().setUser(await fetchMe());
    } catch {
      /* the in-memory flag flip already unlocks the shell */
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-center gap-2">
          <BookText className="size-6" aria-hidden="true" />
          <span className="text-lg font-semibold">{t.app.name}</span>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{t.auth.forcedTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.auth.forcedSubtitle}</p>
        </div>
        <ChangePasswordForm
          submitLabel={t.auth.changePassword}
          currentPasswordLabel={t.auth.tempPasswordLabel}
          onSuccess={onSuccess}
        />
        <Button variant="ghost" className="w-full" onClick={() => void handleSignOut()}>
          {t.auth.signOut}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the `AppShell` guard**

In `src/components/app-shell.tsx`, import the screen and the store, and early-return after `useHydrateSession()`/`useT()` but before the shell markup:
```tsx
import { useSession } from "@/stores/session";
import { ChangePasswordScreen } from "@/features/auth/ChangePasswordScreen";
// ...
export function AppShell({ children }: { children: ReactNode }) {
	useHydrateSession();
	const t = useT();
	const mustChangePassword = useSession((s) => s.user?.mustChangePassword ?? false);
	if (mustChangePassword) return <ChangePasswordScreen />;
	// ...existing return unchanged
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test --run src/components/app-shell.test.tsx`
Expected: PASS (new case + existing shell tests still green).

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/ChangePasswordScreen.tsx src/components/app-shell.tsx src/components/app-shell.test.tsx
git commit -m "feat(auth): blocking forced change-password screen via AppShell guard"
```

---

## Phase 3 — Admin Users management

### Task 8: Users schemas + query keys

**Files:**
- Create: `src/features/users/schema.ts`
- Modify: `src/lib/query/keys.ts`
- Test: `src/features/users/schema.test.ts`

**Interfaces:**
- Produces: `userSchema` → `User = { id, email, name, role, isActive, mustChangePassword, createdAt }`; `createUserResponseSchema` → `{ user: User; tempPassword: string }`; `userCreateSchema` (`{ email, name, role }`), `userEditSchema` (`{ name, role, isActive }`); `queryKeys.users` (via `createResourceKeys('users')`).

- [ ] **Step 1: Write the failing test**

Create `src/features/users/schema.test.ts`:
```ts
import { expect, it } from 'vitest';
import { userSchema, createUserResponseSchema, userCreateSchema } from './schema';

it('parses a user row', () => {
  const u = userSchema.parse({
    id: 'u1', email: 'a@b.c', name: 'Ana', role: 'ACCOUNTANT',
    isActive: true, mustChangePassword: false, createdAt: '2026-07-07T00:00:00.000Z',
  });
  expect(u.name).toBe('Ana');
});

it('parses the create/reset response with a temp password', () => {
  const r = createUserResponseSchema.parse({
    user: { id: 'u1', email: 'a@b.c', name: 'Ana', role: 'VIEWER', isActive: true, mustChangePassword: true, createdAt: '2026-07-07T00:00:00.000Z' },
    tempPassword: 'Temp-1234',
  });
  expect(r.tempPassword).toBe('Temp-1234');
});

it('rejects an invalid create email', () => {
  expect(userCreateSchema.safeParse({ email: 'nope', name: 'x', role: 'VIEWER' }).success).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/features/users/schema.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/features/users/schema.ts`:
```ts
import { z } from 'zod';
import { roleSchema } from '@/lib/schemas/auth';

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const createUserResponseSchema = z.object({ user: userSchema, tempPassword: z.string() });
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

export const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: roleSchema,
});
export type UserCreateValues = z.infer<typeof userCreateSchema>;

export const userEditSchema = z.object({
  name: z.string().min(1),
  role: roleSchema,
  isActive: z.boolean(),
});
export type UserEditValues = z.infer<typeof userEditSchema>;
```

In `src/lib/query/keys.ts`, add to the `queryKeys` object:
```ts
  users: createResourceKeys('users'),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run src/features/users/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/users/schema.ts src/features/users/schema.test.ts src/lib/query/keys.ts
git commit -m "feat(users): schemas + query keys"
```

---

### Task 9: Users hooks + MSW handlers

**Files:**
- Create: `src/features/users/hooks.ts`
- Modify: `src/test/handlers.ts` (add `/users` fixtures + handlers)
- Test: `src/features/users/hooks.test.tsx`

**Interfaces:**
- Consumes: Task 8 schemas + `queryKeys.users`.
- Produces: `useUsers(query: { limit: number; offset: number })` → `UseQueryResult<{ data: User[]; total; limit; offset }, ApiError>`; `useCreateUser()` → mutation `UserCreateValues → CreateUserResponse`; `useUpdateUser()` → mutation `{ id: string; data: Partial<UserEditValues> } → User`; `useResetPassword()` → mutation `string → CreateUserResponse`.

- [ ] **Step 1: Add MSW fixtures + handlers**

In `src/test/handlers.ts`, add a fixture near the other fixtures:
```ts
// --- users (user management) ---
export const userFixtures = () => [
  { id: 'u1', email: 'admin@buku.id', name: 'Admin', role: 'ADMIN', isActive: true, mustChangePassword: false, createdAt: '2026-07-01T00:00:00.000Z' },
  { id: 'u2', email: 'akuntan@buku.id', name: 'Akuntan', role: 'ACCOUNTANT', isActive: true, mustChangePassword: false, createdAt: '2026-07-02T00:00:00.000Z' },
];
```
Add handlers inside the `handlers` array (before the closing `]`):
```ts
  http.get(`${API}/users`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    const limit = Number(u.get('limit') ?? 20);
    const offset = Number(u.get('offset') ?? 0);
    return HttpResponse.json(paged(userFixtures(), limit, offset));
  }),
  http.post(`${API}/users`, async ({ request }) => {
    const body = (await request.json()) as { email: string; name: string; role: string };
    return HttpResponse.json(
      { user: { id: 'u-new', email: body.email, name: body.name, role: body.role, isActive: true, mustChangePassword: true, createdAt: '2026-07-07T00:00:00.000Z' }, tempPassword: 'Temp-abc123' },
      { status: 201 },
    );
  }),
  http.patch(`${API}/users/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...userFixtures()[0], id: params.id, ...body });
  }),
  http.post(`${API}/users/:id/reset-password`, ({ params }) =>
    HttpResponse.json({ user: { ...userFixtures()[0], id: params.id, mustChangePassword: true }, tempPassword: 'Temp-reset9' }),
  ),
```

- [ ] **Step 2: Write the failing test**

Create `src/features/users/hooks.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useUsers, useCreateUser, useResetPassword } from './hooks';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('lists users from the envelope', async () => {
  const { result } = renderHook(() => useUsers({ limit: 20, offset: 0 }), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.total).toBe(2);
  expect(result.current.data?.data[0].email).toBe('admin@buku.id');
});

it('create returns a temp password', async () => {
  const { result } = renderHook(() => useCreateUser(), { wrapper });
  const res = await result.current.mutateAsync({ email: 'x@y.z', name: 'X', role: 'VIEWER' });
  expect(res.tempPassword).toBe('Temp-abc123');
});

it('reset-password returns a fresh temp password', async () => {
  const { result } = renderHook(() => useResetPassword(), { wrapper });
  const res = await result.current.mutateAsync('u2');
  expect(res.tempPassword).toBe('Temp-reset9');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test --run src/features/users/hooks.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement**

Create `src/features/users/hooks.ts`:
```ts
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import {
  userSchema,
  createUserResponseSchema,
  type User,
  type CreateUserResponse,
  type UserCreateValues,
  type UserEditValues,
} from './schema';

const envelopeSchema = z.object({
  data: userSchema.array(),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});
export type UsersEnvelope = z.infer<typeof envelopeSchema>;

export function useUsers(query: { limit: number; offset: number }): UseQueryResult<UsersEnvelope, ApiError> {
  return useQuery<UsersEnvelope, ApiError>({
    queryKey: queryKeys.users.list(query),
    queryFn: () => apiFetch('/users', { schema: envelopeSchema, query }),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation<CreateUserResponse, ApiError, UserCreateValues>({
    mutationFn: (data) => apiFetch('/users', { method: 'POST', body: data, schema: createUserResponseSchema }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation<User, ApiError, { id: string; data: Partial<UserEditValues> }>({
    mutationFn: ({ id, data }) => apiFetch(`/users/${id}`, { method: 'PATCH', body: data, schema: userSchema }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation<CreateUserResponse, ApiError, string>({
    mutationFn: (id) => apiFetch(`/users/${id}/reset-password`, { method: 'POST', schema: createUserResponseSchema }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test --run src/features/users/hooks.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/users/hooks.ts src/features/users/hooks.test.tsx src/test/handlers.ts
git commit -m "feat(users): CRUD hooks + MSW handlers"
```

---

### Task 10: Role labels + `TempPasswordDialog`

**Files:**
- Create: `src/features/users/user-meta.ts`
- Create: `src/features/users/TempPasswordDialog.tsx`
- Modify: `src/lib/i18n/messages.id.ts` (add `nav.users` + `users` namespace)
- Test: `src/features/users/TempPasswordDialog.test.tsx`

**Interfaces:**
- Produces: `roleLabel(t, role)` + `ROLE_OPTIONS: Role[]`; `TempPasswordDialog({ open, onOpenChange, email, tempPassword })`.

- [ ] **Step 1: Add i18n keys**

In `src/lib/i18n/messages.id.ts`: add `users: 'Pengguna',` inside the `nav: { ... }` namespace. Then add a new top-level namespace (after `settings`):
```ts
  users: {
    title: 'Pengguna',
    email: 'Email',
    name: 'Nama',
    role: 'Peran',
    searchHint: 'Pencarian pada halaman ini',
    newUser: 'Pengguna Baru',
    editUser: 'Ubah Pengguna',
    emailExists: 'Email sudah terdaftar',
    resetPassword: 'Setel ulang kata sandi',
    confirmResetTitle: 'Setel ulang kata sandi?',
    confirmResetDesc: 'Pengguna akan keluar dari semua perangkat dan menerima kata sandi sementara baru.',
    confirmDeactivateTitle: 'Nonaktifkan pengguna ini?',
    cannotEditSelfRole: 'Anda tidak dapat mengubah peran Anda sendiri.',
    tempPasswordTitle: 'Kata sandi sementara',
    tempPasswordWarning: 'Salin sekarang. Kata sandi ini hanya ditampilkan sekali dan tidak dapat dilihat lagi.',
    tempPasswordFor: 'Untuk {email}',
    copy: 'Salin',
    copied: 'Tersalin',
    roleLabels: {
      VIEWER: 'Peninjau',
      ACCOUNTANT: 'Akuntan',
      APPROVER: 'Penyetuju',
      ADMIN: 'Admin',
    },
  },
```

- [ ] **Step 2: Write the failing test**

Create `src/features/users/TempPasswordDialog.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TempPasswordDialog } from './TempPasswordDialog';

it('shows the temp password and a one-time warning', () => {
  render(<TempPasswordDialog open onOpenChange={vi.fn()} email="a@b.c" tempPassword="Temp-abc123" />);
  expect(screen.getByText('Temp-abc123')).toBeInTheDocument();
  expect(screen.getByText(/hanya ditampilkan sekali/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test --run src/features/users/TempPasswordDialog.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement**

Create `src/features/users/user-meta.ts`:
```ts
import type { Role } from '@/stores/session';
import type { Messages } from '@/lib/i18n/messages.id';

export const ROLE_OPTIONS: Role[] = ['VIEWER', 'ACCOUNTANT', 'APPROVER', 'ADMIN'];

export function roleLabel(t: Messages, role: Role): string {
  return t.users.roleLabels[role];
}
```

Create `src/features/users/TempPasswordDialog.tsx`:
```tsx
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n/useT';

export function TempPasswordDialog({
  open,
  onOpenChange,
  email,
  tempPassword,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  email: string;
  tempPassword: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
    } catch {
      /* clipboard blocked; the value is on screen to copy manually */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label={t.users.tempPasswordTitle}>
        <DialogHeader>
          <DialogTitle>{t.users.tempPasswordTitle}</DialogTitle>
          <DialogDescription>{t.users.tempPasswordFor.replace('{email}', email)}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <code className="flex-1 font-mono text-sm">{tempPassword}</code>
          <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? t.users.copied : t.users.copy}
          </Button>
        </div>
        <p className="text-xs text-warning-foreground">{t.users.tempPasswordWarning}</p>
      </DialogContent>
    </Dialog>
  );
}
```
(`text-warning-foreground` is a defined token in `src/index.css` — confirmed present.)

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test --run src/features/users/TempPasswordDialog.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/users/user-meta.ts src/features/users/TempPasswordDialog.tsx src/features/users/TempPasswordDialog.test.tsx src/lib/i18n/messages.id.ts
git commit -m "feat(users): role labels + one-time temp-password dialog"
```

---

### Task 11: `UserFormDialog` (create/edit)

**Files:**
- Create: `src/features/users/UserFormDialog.tsx`
- Test: `src/features/users/UserFormDialog.test.tsx`

**Interfaces:**
- Consumes: `useCreateUser`, `useUpdateUser` (Task 9); `ROLE_OPTIONS`, `roleLabel` (Task 10); `FormDialog`, `FieldError`, `Select`, `Switch`.
- Produces: `UserFormDialog({ open, onOpenChange, mode, user?, currentUserId, onCreated })` where `onCreated: (resp: CreateUserResponse) => void` fires after a successful create (so the page opens `TempPasswordDialog`). Edit disables role + isActive when `user.id === currentUserId` (self-lockout guard).

- [ ] **Step 1: Write the failing test**

Create `src/features/users/UserFormDialog.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { UserFormDialog } from './UserFormDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof UserFormDialog>> = {}) {
  const onCreated = vi.fn();
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <UserFormDialog open mode="create" onOpenChange={vi.fn()} currentUserId="me" onCreated={onCreated} {...props} />
    </QueryClientProvider>,
  );
  return onCreated;
}

it('create: submitting email+name+role calls onCreated with the temp password', async () => {
  const user = userEvent.setup();
  const onCreated = renderDialog();
  await user.type(screen.getByLabelText('Email'), 'x@y.z');
  await user.type(screen.getByLabelText('Nama'), 'X User');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ tempPassword: 'Temp-abc123' })));
});

it('edit: role select is disabled when editing yourself', async () => {
  renderDialog({
    mode: 'edit',
    currentUserId: 'u1',
    user: { id: 'u1', email: 'a@b.c', name: 'Me', role: 'ADMIN', isActive: true, mustChangePassword: false, createdAt: '2026-07-01T00:00:00.000Z' },
  });
  expect(await screen.findByLabelText('Peran')).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/features/users/UserFormDialog.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/features/users/UserFormDialog.tsx`:
```tsx
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormDialog } from '@/components/common/FormDialog';
import { FieldError } from '@/components/common/FieldError';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { useT } from '@/lib/i18n/useT';
import type { Role } from '@/stores/session';
import { useCreateUser, useUpdateUser } from './hooks';
import { ROLE_OPTIONS, roleLabel } from './user-meta';
import {
  userCreateSchema, userEditSchema,
  type User, type CreateUserResponse, type UserCreateValues, type UserEditValues,
} from './schema';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: 'create' | 'edit';
  user?: User;
  currentUserId?: string;
  onCreated: (resp: CreateUserResponse) => void;
}

export function UserFormDialog(props: Props) {
  if (props.mode === 'edit' && props.user) {
    return <EditForm key={props.user.id} {...props} user={props.user} />;
  }
  return <CreateForm {...props} />;
}

function CreateForm({ open, onOpenChange, onCreated }: Props) {
  const t = useT();
  const create = useCreateUser();
  const form = useForm<UserCreateValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { email: '', name: '', role: 'VIEWER' },
  });
  const role = useWatch({ control: form.control, name: 'role' });

  async function onSubmit(values: UserCreateValues) {
    try {
      const resp = await create.mutateAsync(values);
      onOpenChange(false);
      form.reset();
      onCreated(resp);
    } catch (err) {
      applyApiErrorToForm(err, form, t);
    }
  }

  const e = form.formState.errors;
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t.users.newUser}
      onSubmit={form.handleSubmit(onSubmit)} pending={form.formState.isSubmitting}>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t.users.email}</Label>
        <Input id="email" type="email" {...form.register('email')} />
        <FieldError message={e.email ? t.users.emailExists : undefined} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">{t.users.name}</Label>
        <Input id="name" {...form.register('name')} />
      </div>
      <RoleField label={t.users.role} value={role} onChange={(v) => form.setValue('role', v)} />
      <FieldError message={(e as Record<string, { message?: string } | undefined>).root?.message} />
    </FormDialog>
  );
}

function EditForm({ open, onOpenChange, user, currentUserId }: Props & { user: User }) {
  const t = useT();
  const update = useUpdateUser();
  const isSelf = user.id === currentUserId;
  const form = useForm<UserEditValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: { name: user.name, role: user.role, isActive: user.isActive },
  });
  const role = useWatch({ control: form.control, name: 'role' });
  const isActive = useWatch({ control: form.control, name: 'isActive' });

  async function onSubmit(values: UserEditValues) {
    try {
      await update.mutateAsync({ id: user.id, data: values });
      toast.success(t.crud.saved);
      onOpenChange(false);
    } catch (err) {
      applyApiErrorToForm(err, form, t);
    }
  }

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t.users.editUser} description={user.email}
      onSubmit={form.handleSubmit(onSubmit)} pending={form.formState.isSubmitting}>
      <div className="space-y-1.5">
        <Label htmlFor="ename">{t.users.name}</Label>
        <Input id="ename" {...form.register('name')} />
      </div>
      <RoleField label={t.users.role} value={role} onChange={(v) => form.setValue('role', v)} disabled={isSelf} />
      {isSelf ? <p className="text-xs text-muted-foreground">{t.users.cannotEditSelfRole}</p> : null}
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={isActive} onCheckedChange={(v) => form.setValue('isActive', v)} disabled={isSelf} aria-label={t.crud.status} />
        {t.crud.active}
      </label>
    </FormDialog>
  );
}

function RoleField({ label, value, onChange, disabled }: { label: string; value: Role; onChange: (v: Role) => void; disabled?: boolean }) {
  const t = useT();
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={disabled}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{roleLabel(t, r)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
```
Note: `useWatch`, not `form.watch`, per the Global Constraints (React Compiler).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --run src/features/users/UserFormDialog.test.tsx`
Expected: PASS. (The disabled-Select assertion checks the trigger's `disabled` attribute via `aria-label="Peran"`.)

- [ ] **Step 5: Commit**

```bash
git add src/features/users/UserFormDialog.tsx src/features/users/UserFormDialog.test.tsx
git commit -m "feat(users): create/edit dialog with self-lockout guard"
```

---

### Task 12: `UsersPage` (list, actions, wiring)

**Files:**
- Create: `src/features/users/UsersPage.tsx`
- Test: `src/features/users/UsersPage.test.tsx`

**Interfaces:**
- Consumes: `useUsers` (Task 9), `UserFormDialog` + `onCreated` (Task 11), `TempPasswordDialog` (Task 10), `useResetPassword`/`useUpdateUser` (Task 9), `roleLabel` (Task 10), and primitives `PageHeader`, `Input`, `DataTable`, `Pagination`, `QueryState`, `SkeletonTable`, `RoleGate`, `StatusBadge`, `ConfirmDialog`, `RowActions`, `EmptyState`.
- Produces: `UsersPage` (no props) — the ADMIN Users route body.

- [ ] **Step 1: Write the failing test**

Create `src/features/users/UsersPage.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { UsersPage } from './UsersPage';

afterEach(() => useSession.getState().clear());

function renderPage() {
  useSession.getState().setUser({ id: 'u1', email: 'admin@buku.id', role: 'ADMIN', mustChangePassword: false });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}><UsersPage /></QueryClientProvider>);
}

it('lists users with email and role label', async () => {
  renderPage();
  expect(await screen.findByText('akuntan@buku.id')).toBeInTheDocument();
  expect(screen.getByText('Akuntan')).toBeInTheDocument();
});

it('create flow reveals the temp password', async () => {
  const user = userEvent.setup();
  renderPage();
  await user.click(await screen.findByRole('button', { name: 'Baru' }));
  await user.type(await screen.findByLabelText('Email'), 'x@y.z');
  await user.type(screen.getByLabelText('Nama'), 'X User');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByText('Temp-abc123')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --run src/features/users/UsersPage.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/features/users/UsersPage.tsx`:
```tsx
import { useState } from 'react';
import { Plus, SearchX } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { QueryState } from '@/components/common/QueryState';
import { RoleGate, useRole } from '@/components/common/RoleGate';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { RowActions } from '@/components/common/RowActions';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { textColumn } from '@/components/common/columnKit';
import { useT } from '@/lib/i18n/useT';
import { useSession } from '@/stores/session';
import { useUsers, useUpdateUser, useResetPassword } from './hooks';
import { UserFormDialog } from './UserFormDialog';
import { TempPasswordDialog } from './TempPasswordDialog';
import { roleLabel } from './user-meta';
import type { User, CreateUserResponse } from './schema';

const LIMIT = 20;

export function UsersPage() {
  const t = useT();
  const currentUserId = useSession((s) => s.user?.id);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [reveal, setReveal] = useState<{ email: string; tempPassword: string } | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);

  const query = useUsers({ limit: LIMIT, offset });
  const update = useUpdateUser();
  const reset = useResetPassword();

  function onCreated(resp: CreateUserResponse) {
    setReveal({ email: resp.user.email, tempPassword: resp.tempPassword });
  }
  async function confirmReset() {
    if (!resetting) return;
    const resp = await reset.mutateAsync(resetting.id);
    setResetting(null);
    setReveal({ email: resp.user.email, tempPassword: resp.tempPassword });
  }
  async function confirmDeactivate() {
    if (!deactivating) return;
    await update.mutateAsync({ id: deactivating.id, data: { isActive: false } });
    setDeactivating(null);
    toast.success(t.crud.deactivated);
  }
  async function activate(u: User) {
    await update.mutateAsync({ id: u.id, data: { isActive: true } });
    toast.success(t.crud.activated);
  }

  const columns: ColumnDef<User>[] = [
    textColumn<User>('email', t.users.email),
    textColumn<User>('name', t.users.name),
    { accessorKey: 'role', header: t.users.role, cell: ({ row }) => roleLabel(t, row.original.role) },
    { accessorKey: 'isActive', header: t.crud.status, cell: ({ row }) => <StatusBadge active={row.original.isActive} /> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => {
        const u = row.original;
        const isSelf = u.id === currentUserId;
        return (
          <RowActions
            onEdit={() => setEditing(u)}
            active={u.isActive}
            onToggleActive={isSelf ? undefined : () => (u.isActive ? setDeactivating(u) : void activate(u))}
            onDelete={() => setResetting(u)}
          />
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.users.title}
        actions={
          <RoleGate allow={['ADMIN']}>
            <Button onClick={() => setCreating(true)}><Plus className="size-4" /> {t.crud.new}</Button>
          </RoleGate>
        }
      />
      <div className="mb-2 max-w-xs">
        <Input aria-label={t.common.search} placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{t.users.searchHint}</p>

      <QueryState query={query} loading={<SkeletonTable rows={6} cols={5} />} onRetry>
        {(env) => {
          const q = search.trim().toLowerCase();
          const rows = q ? env.data.filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)) : env.data;
          return (
            <>
              {rows.length === 0 ? (
                <EmptyState icon={SearchX} title={t.common.noResults} description={t.common.noResultsHint}
                  action={search ? <Button variant="outline" onClick={() => setSearch('')}>{t.common.clearSearch}</Button> : undefined} />
              ) : (
                <DataTable columns={columns} data={rows} />
              )}
              <Pagination offset={offset} limit={LIMIT} total={env.total} onChange={setOffset} />
            </>
          );
        }}
      </QueryState>

      <UserFormDialog open={creating} onOpenChange={setCreating} mode="create" currentUserId={currentUserId} onCreated={onCreated} />
      <UserFormDialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }} mode="edit" user={editing ?? undefined} currentUserId={currentUserId} onCreated={onCreated} />

      {reveal ? (
        <TempPasswordDialog open onOpenChange={(o) => { if (!o) setReveal(null); }} email={reveal.email} tempPassword={reveal.tempPassword} />
      ) : null}

      <ConfirmDialog
        open={!!resetting}
        onOpenChange={(o) => { if (!o) setResetting(null); }}
        title={t.users.confirmResetTitle}
        description={t.users.confirmResetDesc}
        confirmLabel={t.users.resetPassword}
        pending={reset.isPending}
        onConfirm={() => void confirmReset()}
      />
      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(o) => { if (!o) setDeactivating(null); }}
        title={t.users.confirmDeactivateTitle}
        confirmLabel={t.crud.deactivate}
        destructive
        pending={update.isPending}
        onConfirm={() => void confirmDeactivate()}
      />
    </div>
  );
}
```
Note: the row-action dropdown's "reset password" reuses `RowActions`' `onDelete` slot (its ADMIN-gated destructive item). Rename the label so it reads as reset, not delete — see Step 4.

- [ ] **Step 4: Repurpose the `RowActions` destructive slot label for users**

`RowActions` currently hardcodes `t.common.delete` for the `onDelete` item. Add an optional `deleteLabel?: string` prop to `src/components/common/RowActions.tsx` (default `t.common.delete`) and pass `deleteLabel={t.users.resetPassword}` from the `UsersPage` actions column. Update the item render: `{deleteLabel ?? t.common.delete}`. (This keeps `RowActions` generic; existing callers are unaffected.)

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test --run src/features/users/UsersPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/users/UsersPage.tsx src/features/users/UsersPage.test.tsx src/components/common/RowActions.tsx
git commit -m "feat(users): admin Users page (list, create/edit, reset, deactivate)"
```

---

### Task 13: Route + nav item + route-tree regen

**Files:**
- Create: `src/app/routes/_app/users.tsx`
- Modify: `src/components/app-shared.tsx` (nav)
- Modify: `src/routeTree.gen.ts` (regenerated, not hand-edited)
- Test: `src/components/app-shell.test.tsx` (extend `NAV_PATHS`) or a small nav test

**Interfaces:**
- Consumes: `UsersPage` (Task 12).
- Produces: `/users` route; a `Pengguna` ADMIN-only nav item.

- [ ] **Step 1: Create the route file**

Create `src/app/routes/_app/users.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { UsersPage } from '@/features/users/UsersPage';

export const Route = createFileRoute('/_app/users')({
  component: UsersPage,
});
```

- [ ] **Step 2: Add the nav item**

In `src/components/app-shared.tsx`: add `'/users'` to the `NavTo` union; import `UserCog` from `lucide-react`. In `useNavItems`, extend the ADMIN block so both Users and Audit are added for admins:
```ts
if (role === 'ADMIN') {
  setup.push({ to: '/users', label: t.nav.users, icon: UserCog });
  setup.push({ to: '/audit', label: t.nav.audit, icon: ScrollText });
}
```
(Remove the old single `setup.push({ audit })` line.)

- [ ] **Step 3: Regenerate the route tree**

Run: `pnpm dev` in the background, wait ~6s for `src/routeTree.gen.ts` to include `/_app/users`, then kill it.
```bash
pnpm dev & DEV_PID=$!; sleep 7; kill $DEV_PID
git diff --stat src/routeTree.gen.ts   # should show /users added
```

- [ ] **Step 4: Extend the shell nav test**

In `src/components/app-shell.test.tsx`, add `'/users'` to the `NAV_PATHS` array (so the router harness knows the route). Add an assertion in the ADMIN nav test:
```ts
expect(await screen.findByRole('link', { name: 'Pengguna' })).toBeInTheDocument();
```
And in the VIEWER case assert it is absent:
```ts
expect(screen.queryByRole('link', { name: 'Pengguna' })).not.toBeInTheDocument();
```

- [ ] **Step 5: Run test + build**

Run: `pnpm test --run src/components/app-shell.test.tsx && pnpm run build`
Expected: tests PASS; build succeeds (route tree typechecks; `NavTo` includes `/users`).

- [ ] **Step 6: Commit**

```bash
git add src/app/routes/_app/users.tsx src/components/app-shared.tsx src/routeTree.gen.ts src/components/app-shell.test.tsx
git commit -m "feat(users): /users route + ADMIN nav item"
```

---

### Task 14: Full gate + live verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full gate**

Run: `pnpm run build && pnpm test --run && pnpm run lint`
Expected: build OK; all tests pass (exit 0); lint 0 errors (the 3 pre-existing React Compiler `incompatible-library` warnings are expected — do not fix).

- [ ] **Step 2: Live-verify against the real API (compiler present)**

Start `pnpm dev --port 5173 --strictPort` (CORS allows only :5173). Log in as ADMIN. Verify, without mutating beyond a throwaway test user:
- `/users` lists users; role labels + status render; pagination works.
- Create a user → temp password reveals once + copy works; the new user appears.
- Edit a user's role/name → persists; editing yourself disables role + active.
- Reset password → confirm → new temp password reveals.
- Deactivate/activate a user (not yourself).
- Account menu → Ubah Kata Sandi opens the dialog; mismatch + wrong-current show inline errors.
- Forced flow: the newly created user's temp password → log in as them in a separate session → the blocking `ChangePasswordScreen` appears and unlocks after a successful change.

- [ ] **Step 3: Final commit (if any test-fixture tweaks were needed)**

```bash
git add -A
git commit -m "test(users): live-verification fixups" --allow-empty
```

---

## Self-Review

**Spec coverage:**
- Admin list/create/edit/deactivate/reset → Tasks 8–13. ✓
- One-time temp-password reveal → Task 10 + wired in Task 12. ✓
- Self-service change password (account menu) → Tasks 4–6. ✓
- Forced first-login change + blocking screen → Task 7. ✓
- Global `403 PASSWORD_CHANGE_REQUIRED` handling → Tasks 2–3. ✓
- `mustChangePassword` on session/`/auth/me` → Task 1. ✓
- Role labels single-source → Task 10 (`user-meta.ts`). ✓
- Self-lockout guards + `422` surfaced → Task 11 (disable self role/active) + `applyApiErrorToForm` toasts. ✓
- ADMIN gating (route + nav + page) → Task 13 nav + `RoleGate` in Task 12; API enforces. ✓
- i18n namespaces, no em-dashes, StatusBadge, QueryState → folded into Tasks 5/10/12. ✓
- Hard delete intentionally omitted (spec Out of scope) — `useRemove`/DELETE not used. ✓

**Placeholder scan:** none — every step carries real code/commands.

**Type consistency:** `AuthUser.mustChangePassword` / `setMustChangePassword` (Task 1) used in Tasks 3, 7. `CreateUserResponse` (Task 8) flows create→`onCreated`→`TempPasswordDialog` (Tasks 11–12). `useUpdateUser({ id, data: Partial<UserEditValues> })` used for edit + deactivate/activate (Tasks 11–12). `roleLabel(t, role)` (Task 10) used in Tasks 11–12.

**Pre-checked risks (resolved):** `text-warning-foreground` exists in `src/index.css`. `describeError`/`toastApiError` both switch on `ApiErrorKind` with a `default:` branch, so the new `passwordChangeRequired` kind needs no renderer change. The one live-time check that remains is Task 1 Step 5 (hand-built `setUser({...})` literals in existing tests must gain `mustChangePassword: false`).

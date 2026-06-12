# Foundation & Auth Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Indonesian accounting web client and build the cross-cutting foundation — decimal money, the auth-aware API client with single-flight 401-refresh, the session store, the i18n layer, login, a protected route guard, and the branded app shell — so a user can log in, stay logged in across token expiry, and navigate a role-aware shell in light/dark.

**Architecture:** Vite SPA (React 19 + React Compiler) with TanStack Router for type-safe routing and TanStack Query for server state. A bespoke `fetch` wrapper attaches the bearer token, parses the API error envelope into a typed `ApiError`, and performs single-flight refresh on 401. Server data lives only in React Query; session/theme live in Zustand. All money is decimal strings via a `Money` value object; all visible strings come from a Bahasa Indonesia catalog behind a `useT()` hook so English is a later drop-in.

**Tech Stack:** Vite 7, TypeScript, React 19, React Compiler, TanStack Router, TanStack Query v5, Zustand, Zod, React Hook Form, Tailwind CSS v4, shadcn/ui, decimal.js, date-fns, sonner, lucide-react, Vitest + React Testing Library + MSW, pnpm.

---

## Canonical interfaces (used across all tasks — keep names/signatures consistent)

```ts
// lib/api/errors.ts
class ApiError extends Error {
  status: number;        // HTTP status
  code: string;          // envelope code, e.g. "UNBALANCED_ENTRY"
  details?: { errors?: string[] } & Record<string, unknown>;
  traceId?: string;      // == X-Request-Id
}

// lib/api/client.ts
interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  schema?: import('zod').ZodType<T>;   // parse+validate response when provided
  idempotencyKey?: string;             // sets Idempotency-Key header
  auth?: boolean;                      // default true
  query?: Record<string, string | number | undefined>;
}
function apiFetch<T>(path: string, opts?: RequestOptions<T>): Promise<T>;

// lib/money/money.ts — Money value object (decimal.js, ROUND_HALF_UP, 4dp wire format)
class Money {
  static from(v: string | number | Money): Money;
  static zero(): Money;
  plus(o: Money): Money; minus(o: Money): Money;
  times(o: Money | string | number): Money;
  eq(o: Money): boolean; gt(o: Money): boolean; lt(o: Money): boolean;
  isZero(): boolean; isNegative(): boolean;
  toApi(): string;        // "2000000.0000" (4 decimals)
  toRupiah(): string;     // "Rp 2.000.000"
  toString(): string;     // == toApi()
}

// stores/session.ts (zustand)
type Role = 'VIEWER' | 'ACCOUNTANT' | 'APPROVER' | 'ADMIN';
type AuthUser = { id: string; email: string; role: Role };
interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  setTokens(pair: { accessToken: string; refreshToken: string }): void;
  setUser(user: AuthUser | null): void;
  setStatus(s: SessionState['status']): void;
  clear(): void;
}
```

---

## File structure created by this plan

```
package.json, vite.config.ts, tsconfig*.json, eslint.config.js, .prettierrc, .env.example
index.html
src/
  main.tsx                      # bootstrap: providers + router
  app/
    providers.tsx               # QueryClientProvider + ThemeProvider + Toaster
    router.tsx                  # TanStack Router instance
    routes/
      __root.tsx                # root layout (renders shell or login outlet)
      index.tsx                 # redirect to /dashboard
      login.tsx                 # public login route
      _app.tsx                  # authenticated layout (guard + AppShell)
      _app/dashboard.tsx        # placeholder dashboard (cards come in Plan 4)
  lib/
    api/{client.ts, errors.ts, refresh.ts, config.ts}
    money/money.ts
    format/{date.ts, number.ts}
    i18n/{messages.id.ts, useT.ts}
    schemas/{common.ts, auth.ts}
    query/{client.ts, keys.ts}
  stores/{session.ts, theme.ts}
  features/auth/{LoginForm.tsx, useLogin.ts, useMe.ts, guard.ts}
  components/
    ui/                         # shadcn-generated primitives
    common/{RoleGate.tsx, PageHeader.tsx, ErrorState.tsx, EmptyState.tsx,
            DataTable.tsx, MoneyText.tsx, MoneyInput.tsx, AppShell.tsx,
            ThemeToggle.tsx}
  test/{setup.ts, server.ts, handlers.ts, utils.tsx}
```

---

## Task 0: Scaffold Vite + React 19 + TypeScript

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`

- [ ] **Step 1: Scaffold the project in the current directory**

Run:
```bash
pnpm create vite@latest . --template react-ts
```
Expected: prompts to scaffold into the current (non-empty) directory — accept "Ignore files and continue". Creates `package.json`, `vite.config.ts`, `src/`, `index.html`.

- [ ] **Step 2: Install dependencies**

Run:
```bash
pnpm install
```
Expected: `node_modules/` populated, no errors.

- [ ] **Step 3: Verify the dev server boots**

Run:
```bash
pnpm dev --port 5173 &
sleep 4 && curl -sf http://localhost:5173 >/dev/null && echo "DEV OK"; kill %1
```
Expected: prints `DEV OK`.

- [ ] **Step 4: Set the page title and lang**

In `index.html`, set `<html lang="id">` and `<title>Buku — Akuntansi</title>`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React 19 + TypeScript"
```

---

## Task 1: React Compiler, ESLint, Prettier

**Files:**
- Modify: `vite.config.ts`
- Create: `eslint.config.js`, `.prettierrc`

- [ ] **Step 1: Install tooling**

Run:
```bash
pnpm add -D babel-plugin-react-compiler eslint-plugin-react-hooks prettier eslint-config-prettier
```
Expected: added to devDependencies.

- [ ] **Step 2: Enable React Compiler in Vite**

Replace `vite.config.ts` with:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react({
      babel: { plugins: [['babel-plugin-react-compiler', {}]] },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173 },
});
```

- [ ] **Step 3: Add the `@` path alias to TypeScript**

In `tsconfig.json` (or `tsconfig.app.json` if present), add under `compilerOptions`:
```json
"baseUrl": ".",
"paths": { "@/*": ["src/*"] }
```

- [ ] **Step 4: Configure ESLint with the React Compiler rule**

Create `eslint.config.js`:
```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/react-compiler': 'error',
    },
  },
  prettier,
);
```
Install the eslint deps if missing:
```bash
pnpm add -D eslint @eslint/js typescript-eslint globals
```

- [ ] **Step 5: Add `.prettierrc`**

```json
{ "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 90 }
```

- [ ] **Step 6: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "format": "prettier --write .",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 7: Verify lint passes**

Run: `pnpm lint`
Expected: completes with no errors (warnings acceptable).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: enable React Compiler, ESLint, Prettier"
```

---

## Task 2: Tailwind CSS v4 + shadcn/ui

**Files:**
- Create: `src/index.css` (Tailwind entry), `components.json` (shadcn)
- Modify: `vite.config.ts`, `src/main.tsx`

- [ ] **Step 1: Install Tailwind v4 Vite plugin**

Run:
```bash
pnpm add tailwindcss @tailwindcss/vite
pnpm add -D tailwindcss-animate
```

- [ ] **Step 2: Add the Tailwind plugin to Vite**

In `vite.config.ts`, import and add `tailwindcss()` to `plugins` (before/after react is fine):
```ts
import tailwindcss from '@tailwindcss/vite';
// plugins: [react({...}), tailwindcss()],
```

- [ ] **Step 3: Create the CSS entry**

Create `src/index.css`:
```css
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.52 0.18 264);        /* indigo accent */
  --primary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --border: oklch(0.922 0 0);
  --destructive: oklch(0.577 0.245 27);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.62 0.19 264);
  --primary-foreground: oklch(0.145 0 0);
  --muted: oklch(0.25 0 0);
  --muted-foreground: oklch(0.7 0 0);
  --border: oklch(0.3 0 0);
  --destructive: oklch(0.65 0.22 27);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --radius-lg: var(--radius);
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

body { @apply bg-background text-foreground; }
```
Install the animate CSS package referenced above:
```bash
pnpm add tw-animate-css
```

- [ ] **Step 4: Import the CSS in the entry**

In `src/main.tsx`, ensure `import './index.css';` is present (remove any leftover `App.css`).

- [ ] **Step 5: Initialize shadcn**

Run:
```bash
pnpm dlx shadcn@latest init -d
```
Expected: creates `components.json`, writes a `lib/utils.ts` with `cn()`. Choose defaults (New York style, neutral base) if prompted.

- [ ] **Step 6: Add the base shadcn components used by the foundation**

Run:
```bash
pnpm dlx shadcn@latest add button input label card dropdown-menu sonner table form sidebar skeleton badge dialog select avatar
```
Expected: files written under `src/components/ui/`.

- [ ] **Step 7: Verify build still compiles**

Run: `pnpm build`
Expected: type-checks and builds with no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: add Tailwind v4 + shadcn/ui with indigo theme tokens"
```

---

## Task 3: Providers, React Query, TanStack Router

**Files:**
- Create: `src/lib/query/client.ts`, `src/app/providers.tsx`, `src/app/routes/__root.tsx`, `src/app/routes/index.tsx`, `src/app/routes/login.tsx`
- Modify: `vite.config.ts`, `src/main.tsx`

- [ ] **Step 1: Install router + query**

Run:
```bash
pnpm add @tanstack/react-router @tanstack/react-query
pnpm add -D @tanstack/router-plugin @tanstack/router-devtools @tanstack/react-query-devtools
```

- [ ] **Step 2: Enable the router plugin (file-based routes)**

In `vite.config.ts` add (must be listed **before** `react()`):
```ts
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
// plugins: [TanStackRouterVite({ routesDirectory: './src/app/routes', generatedRouteTree: './src/routeTree.gen.ts' }), react({...}), tailwindcss()],
```

- [ ] **Step 3: Create the Query client**

Create `src/lib/query/client.ts`:
```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});
```

- [ ] **Step 4: Create providers**

Create `src/app/providers.tsx`:
```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/query/client';
import { ThemeProvider } from '@/stores/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```
> `ThemeProvider` is created in Task 11; until then, temporarily replace `<ThemeProvider>...</ThemeProvider>` with `<>{children}</>` so this file compiles, and restore it in Task 11.

- [ ] **Step 5: Create the root + initial routes**

Create `src/app/routes/__root.tsx`:
```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({ component: () => <Outlet /> });
```
Create `src/app/routes/index.tsx`:
```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => { throw redirect({ to: '/dashboard' }); },
});
```
Create `src/app/routes/login.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  component: () => <div data-testid="login-route">Login</div>,
});
```

- [ ] **Step 6: Wire the router in `main.tsx`**

Replace `src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Providers } from '@/app/providers';
import { routeTree } from './routeTree.gen';
import './index.css';

const router = createRouter({ routeTree });
declare module '@tanstack/react-router' {
  interface Register { router: typeof router; }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
```

- [ ] **Step 7: Verify dev boots and `/` redirects toward `/dashboard`**

Run:
```bash
pnpm dev --port 5173 &
sleep 4 && curl -sf http://localhost:5173/login | grep -q "root" && echo "ROUTER OK"; kill %1
```
Expected: prints `ROUTER OK` (the SPA shell HTML is served). `src/routeTree.gen.ts` is generated by the plugin.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: wire React Query + TanStack Router providers"
```

---

## Task 4: Test infrastructure (Vitest + RTL + MSW)

**Files:**
- Create: `src/test/setup.ts`, `src/test/server.ts`, `src/test/handlers.ts`, `src/test/utils.tsx`, `vitest.config.ts`

- [ ] **Step 1: Install test deps**

Run:
```bash
pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw
```

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

- [ ] **Step 3: Create MSW server + default handlers**

Create `src/test/handlers.ts`:
```ts
import { http, HttpResponse } from 'msw';

export const API = 'http://localhost:4000';

export const handlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json(
        { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
        { status: 401, headers: { 'X-Request-Id': 'trace-login' } },
      );
    }
    return HttpResponse.json({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  }),
  http.get(`${API}/auth/me`, ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'No token' }, { status: 401 });
    }
    return HttpResponse.json({ id: 'u1', email: 'admin@buku.id', role: 'ADMIN' });
  }),
];
```
Create `src/test/server.ts`:
```ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

- [ ] **Step 4: Create the global setup**

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';
import { API } from './handlers';

// Point the app at the mock API base for all tests.
import.meta.env.VITE_API_BASE_URL = API;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());
```

- [ ] **Step 5: Create a render helper with providers**

Create `src/test/utils.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}
```

- [ ] **Step 6: Add a smoke test**

Create `src/test/smoke.test.ts`:
```ts
import { expect, test } from 'vitest';

test('test runner works', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 7: Run the test suite**

Run: `pnpm test`
Expected: 1 passing test.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "test: add Vitest + RTL + MSW infrastructure"
```

---

## Task 5: `Money` value object (TDD)

**Files:**
- Create: `src/lib/money/money.ts`
- Test: `src/lib/money/money.test.ts`

- [ ] **Step 1: Install decimal.js**

Run: `pnpm add decimal.js`

- [ ] **Step 2: Write the failing test**

Create `src/lib/money/money.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { Money } from './money';

describe('Money', () => {
  it('serializes to a 4-decimal API string', () => {
    expect(Money.from('2000000').toApi()).toBe('2000000.0000');
    expect(Money.from('1.5').toApi()).toBe('1.5000');
  });

  it('adds and subtracts without float drift', () => {
    expect(Money.from('0.1').plus(Money.from('0.2')).toApi()).toBe('0.3000');
    expect(Money.from('100').minus(Money.from('33.33')).toApi()).toBe('66.6700');
  });

  it('multiplies quantity by unit price', () => {
    expect(Money.from('150000').times('3').toApi()).toBe('450000.0000');
  });

  it('rounds half up to 4dp (Faktur Pajak rule)', () => {
    expect(Money.from('1.00005').toApi()).toBe('1.0001');
    expect(Money.from('1.00004').toApi()).toBe('1.0000');
  });

  it('formats to rupiah with id-ID grouping and no decimals', () => {
    expect(Money.from('2000000.0000').toRupiah()).toBe('Rp 2.000.000');
  });

  it('compares values', () => {
    expect(Money.from('5').gt(Money.from('4'))).toBe(true);
    expect(Money.from('0').isZero()).toBe(true);
    expect(Money.from('-1').isNegative()).toBe(true);
  });

  it('round-trips an API string', () => {
    const m = Money.from('2000000.0000');
    expect(Money.from(m.toApi()).eq(m)).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test src/lib/money/money.test.ts`
Expected: FAIL — `Money` not found.

- [ ] **Step 4: Implement `Money`**

Create `src/lib/money/money.ts`:
```ts
import Decimal from 'decimal.js';

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

const rupiahFmt = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export class Money {
  private readonly d: Decimal;
  private constructor(d: Decimal) { this.d = d; }

  static from(v: string | number | Money): Money {
    if (v instanceof Money) return new Money(v.d);
    return new Money(new Decimal(v));
  }
  static zero(): Money { return new Money(new Decimal(0)); }

  plus(o: Money): Money { return new Money(this.d.plus(o.d)); }
  minus(o: Money): Money { return new Money(this.d.minus(o.d)); }
  times(o: Money | string | number): Money {
    const factor = o instanceof Money ? o.d : new Decimal(o);
    return new Money(this.d.times(factor));
  }
  eq(o: Money): boolean { return this.d.eq(o.d); }
  gt(o: Money): boolean { return this.d.gt(o.d); }
  lt(o: Money): boolean { return this.d.lt(o.d); }
  isZero(): boolean { return this.d.isZero(); }
  isNegative(): boolean { return this.d.isNegative(); }

  toApi(): string { return this.d.toFixed(4, Decimal.ROUND_HALF_UP); }
  toRupiah(): string {
    return rupiahFmt.format(this.d.toNumber()).replace(/ /g, ' ');
  }
  toString(): string { return this.toApi(); }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test src/lib/money/money.test.ts`
Expected: PASS (all 7 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add decimal-safe Money value object"
```

---

## Task 6: Date & number formatting (TDD)

**Files:**
- Create: `src/lib/format/date.ts`, `src/lib/format/number.ts`
- Test: `src/lib/format/format.test.ts`

- [ ] **Step 1: Install date-fns**

Run: `pnpm add date-fns`

- [ ] **Step 2: Write the failing test**

Create `src/lib/format/format.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatDateID, toApiDate, isRangeValid } from './date';
import { formatInt } from './number';

describe('date format', () => {
  it('formats an API date as dd/mm/yyyy', () => {
    expect(formatDateID('2026-06-12')).toBe('12/06/2026');
  });
  it('produces a YYYY-MM-DD api date from a Date', () => {
    expect(toApiDate(new Date(2026, 5, 12))).toBe('2026-06-12');
  });
  it('validates that from <= to', () => {
    expect(isRangeValid('2026-01-01', '2026-12-31')).toBe(true);
    expect(isRangeValid('2026-12-31', '2026-01-01')).toBe(false);
  });
});

describe('number format', () => {
  it('groups integers with id-ID separators', () => {
    expect(formatInt(2000000)).toBe('2.000.000');
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test src/lib/format/format.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement the formatters**

Create `src/lib/format/date.ts`:
```ts
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

/** Display an API date string (YYYY-MM-DD) as dd/mm/yyyy. */
export function formatDateID(apiDate: string): string {
  return format(parseISO(apiDate), 'dd/MM/yyyy', { locale: id });
}

/** Convert a Date to a date-only API string (local calendar date). */
export function toApiDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True when from <= to (the API rejects from > to with 422). */
export function isRangeValid(from: string, to: string): boolean {
  return from <= to;
}
```
Create `src/lib/format/number.ts`:
```ts
const intFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
export function formatInt(n: number): string {
  return intFmt.format(n);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test src/lib/format/format.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add id-ID date and number formatters"
```

---

## Task 7: i18n message catalog + `useT` (TDD)

**Files:**
- Create: `src/lib/i18n/messages.id.ts`, `src/lib/i18n/useT.ts`
- Test: `src/lib/i18n/useT.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/i18n/useT.test.ts`:
```ts
import { renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useT } from './useT';

it('returns the Bahasa Indonesia catalog', () => {
  const { result } = renderHook(() => useT());
  expect(result.current.common.save).toBe('Simpan');
  expect(result.current.auth.signIn).toBe('Masuk');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/i18n/useT.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the catalog and hook**

Create `src/lib/i18n/messages.id.ts`:
```ts
export const id = {
  app: { name: 'Buku', tagline: 'Akuntansi Indonesia' },
  common: {
    save: 'Simpan',
    cancel: 'Batal',
    delete: 'Hapus',
    create: 'Buat',
    edit: 'Ubah',
    loading: 'Memuat…',
    noData: 'Tidak ada data',
    error: 'Terjadi kesalahan',
    reference: 'Referensi',
    search: 'Cari',
    actions: 'Aksi',
  },
  auth: {
    signIn: 'Masuk',
    signOut: 'Keluar',
    email: 'Email',
    password: 'Kata sandi',
    loginTitle: 'Masuk ke Buku',
    invalidCredentials: 'Email atau kata sandi salah',
  },
  nav: {
    dashboard: 'Dasbor',
    accounts: 'Bagan Akun',
    partners: 'Mitra Bisnis',
    taxCodes: 'Kode Pajak',
    salesInvoices: 'Faktur Penjualan',
    payments: 'Pembayaran',
  },
  roles: {
    forbidden: 'Anda tidak memiliki izin untuk tindakan ini',
    segregationOfDuties:
      'Pembuat dokumen tidak boleh menyetujui sendiri. Serahkan ke approver lain.',
  },
} as const;

export type Messages = typeof id;
```
Create `src/lib/i18n/useT.ts`:
```ts
import { id, type Messages } from './messages.id';

/** Returns the active message catalog. Single locale today (id); English later. */
export function useT(): Messages {
  return id;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/lib/i18n/useT.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Bahasa Indonesia message catalog and useT"
```

---

## Task 8: API client — config, `ApiError`, envelope parsing (TDD)

**Files:**
- Create: `src/lib/api/config.ts`, `src/lib/api/errors.ts`, `src/lib/api/client.ts`
- Test: `src/lib/api/client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/api/client.test.ts`:
```ts
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { apiFetch } from './client';
import { ApiError } from './errors';

describe('apiFetch', () => {
  it('parses a bare array response', async () => {
    server.use(http.get(`${API}/partners`, () => HttpResponse.json([{ id: '1' }])));
    const data = await apiFetch<{ id: string }[]>('/partners', { auth: false });
    expect(data).toEqual([{ id: '1' }]);
  });

  it('throws a typed ApiError carrying code, status, and traceId', async () => {
    server.use(
      http.get(`${API}/boom`, () =>
        HttpResponse.json(
          { code: 'UNBALANCED_ENTRY', message: 'debits != credits' },
          { status: 422, headers: { 'X-Request-Id': 'trace-xyz' } },
        ),
      ),
    );
    await expect(apiFetch('/boom', { auth: false })).rejects.toMatchObject({
      status: 422,
      code: 'UNBALANCED_ENTRY',
      traceId: 'trace-xyz',
    });
    await expect(apiFetch('/boom', { auth: false })).rejects.toBeInstanceOf(ApiError);
  });

  it('attaches the bearer token from the session store', async () => {
    useSession.getState().setTokens({ accessToken: 'tok-9', refreshToken: 'r' });
    let seen: string | null = null;
    server.use(
      http.get(`${API}/whoami`, ({ request }) => {
        seen = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiFetch('/whoami');
    expect(seen).toBe('Bearer tok-9');
  });

  it('sets the Idempotency-Key header when provided', async () => {
    let key: string | null = null;
    server.use(
      http.post(`${API}/x/post`, ({ request }) => {
        key = request.headers.get('Idempotency-Key');
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiFetch('/x/post', { method: 'POST', idempotencyKey: 'idem-1', auth: false });
    expect(key).toBe('idem-1');
  });
});
```
> This test depends on `useSession` (Task 10). Implement Task 10 before running, or stub `getAccessToken()` — see Step 4.

- [ ] **Step 2: Create config and errors**

Create `src/lib/api/config.ts`:
```ts
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
```
Create `src/lib/api/errors.ts`:
```ts
export class ApiError extends Error {
  status: number;
  code: string;
  details?: { errors?: string[] } & Record<string, unknown>;
  traceId?: string;

  constructor(args: {
    status: number;
    code: string;
    message: string;
    details?: ApiError['details'];
    traceId?: string;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.status = args.status;
    this.code = args.code;
    this.details = args.details;
    this.traceId = args.traceId;
  }

  /** Per-field validation messages from the envelope, if any. */
  get fieldErrors(): string[] {
    return this.details?.errors ?? [];
  }
}
```

- [ ] **Step 3: Implement the client core (no refresh yet)**

Create `src/lib/api/client.ts`:
```ts
import type { ZodType } from 'zod';
import { useSession } from '@/stores/session';
import { API_BASE_URL } from './config';
import { ApiError } from './errors';

export interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  schema?: ZodType<T>;
  idempotencyKey?: string;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions<unknown>['query']): string {
  const url = new URL(API_BASE_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function toApiError(res: Response): Promise<ApiError> {
  const traceId = res.headers.get('X-Request-Id') ?? undefined;
  let body: { code?: string; message?: string; details?: ApiError['details'] } = {};
  try { body = await res.json(); } catch { /* non-JSON error body */ }
  return new ApiError({
    status: res.status,
    code: body.code ?? `HTTP_${res.status}`,
    message: body.message ?? res.statusText,
    details: body.details,
    traceId: body.traceId ?? traceId,
  });
}

export async function rawFetch<T>(
  path: string,
  opts: RequestOptions<T> = {},
): Promise<{ res: Response; data: T }> {
  const { method = 'GET', body, idempotencyKey, auth = true, query, schema } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  if (auth) {
    const token = useSession.getState().accessToken;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await toApiError(res);
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  const data = schema ? schema.parse(json) : (json as T);
  return { res, data };
}

export async function apiFetch<T>(path: string, opts: RequestOptions<T> = {}): Promise<T> {
  const { data } = await rawFetch<T>(path, opts);
  return data;
}
```
> `traceId` falls back to the `X-Request-Id` header when the body omits it.

- [ ] **Step 4: Run to verify (requires Task 10's `useSession`)**

If implementing in order, defer running this until after Task 10. Then run:
`pnpm test src/lib/api/client.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add API client core with ApiError envelope parsing"
```

---

## Task 9: Single-flight 401-refresh + 429 backoff (TDD)

**Files:**
- Create: `src/lib/api/refresh.ts`
- Modify: `src/lib/api/client.ts`
- Test: `src/lib/api/refresh.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/api/refresh.test.ts`:
```ts
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { apiFetch } from './client';

afterEach(() => { useSession.getState().clear(); vi.restoreAllMocks(); });

describe('401 refresh', () => {
  it('refreshes once on 401, then retries and succeeds', async () => {
    useSession.getState().setTokens({ accessToken: 'expired', refreshToken: 'r-good' });
    let refreshCalls = 0;
    server.use(
      http.get(`${API}/secure`, ({ request }) => {
        const tok = request.headers.get('Authorization');
        return tok === 'Bearer fresh'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 });
      }),
      http.post(`${API}/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json({ accessToken: 'fresh', refreshToken: 'r-good-2' });
      }),
    );
    const data = await apiFetch<{ ok: boolean }>('/secure');
    expect(data.ok).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(useSession.getState().accessToken).toBe('fresh');
  });

  it('shares a single refresh across concurrent 401s', async () => {
    useSession.getState().setTokens({ accessToken: 'expired', refreshToken: 'r-good' });
    let refreshCalls = 0;
    server.use(
      http.get(`${API}/a`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer fresh'
          ? HttpResponse.json({ r: 'a' })
          : HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
      ),
      http.get(`${API}/b`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer fresh'
          ? HttpResponse.json({ r: 'b' })
          : HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
      ),
      http.post(`${API}/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json({ accessToken: 'fresh', refreshToken: 'r2' });
      }),
    );
    const [a, b] = await Promise.all([
      apiFetch<{ r: string }>('/a'),
      apiFetch<{ r: string }>('/b'),
    ]);
    expect([a.r, b.r].sort()).toEqual(['a', 'b']);
    expect(refreshCalls).toBe(1);
  });

  it('clears the session when refresh fails', async () => {
    useSession.getState().setTokens({ accessToken: 'expired', refreshToken: 'r-bad' });
    server.use(
      http.get(`${API}/secure`, () =>
        HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
      ),
      http.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ code: 'UNAUTHORIZED', message: 'expired' }, { status: 401 }),
      ),
    );
    await expect(apiFetch('/secure')).rejects.toMatchObject({ status: 401 });
    expect(useSession.getState().status).toBe('anonymous');
    expect(useSession.getState().accessToken).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/api/refresh.test.ts`
Expected: FAIL — no refresh behavior yet (second call still 401s).

- [ ] **Step 3: Implement single-flight refresh**

Create `src/lib/api/refresh.ts`:
```ts
import { useSession } from '@/stores/session';
import { API_BASE_URL } from './config';

let inFlight: Promise<string | null> | null = null;

/**
 * Exchange the refresh token for a fresh pair. Concurrent callers share one
 * request. Resolves to the new access token, or null if refresh failed (and
 * the session has been cleared).
 */
export function refreshAccessToken(): Promise<string | null> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const refreshToken = useSession.getState().refreshToken;
    if (!refreshToken) { useSession.getState().clear(); return null; }
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) { useSession.getState().clear(); return null; }
      const pair = (await res.json()) as { accessToken: string; refreshToken: string };
      useSession.getState().setTokens(pair);
      return pair.accessToken;
    } catch {
      useSession.getState().clear();
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
```

- [ ] **Step 4: Wire refresh + 429 backoff into `apiFetch`**

In `src/lib/api/client.ts`, add the import and replace the `apiFetch` function (keep `rawFetch` as-is):
```ts
import { refreshAccessToken } from './refresh';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function apiFetch<T>(path: string, opts: RequestOptions<T> = {}): Promise<T> {
  const auth = opts.auth ?? true;
  try {
    const { data } = await rawFetch<T>(path, opts);
    return data;
  } catch (err) {
    const e = err as ApiError;
    // 401 -> single-flight refresh, then retry once.
    if (e.status === 401 && auth) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        const { data } = await rawFetch<T>(path, opts);
        return data;
      }
    }
    // 429 -> back off once, honoring Retry-After (seconds), then retry once.
    if (e.status === 429) {
      const retryAfter = Number(e.details?.['retryAfter']) || 1;
      await sleep(retryAfter * 1000);
      const { data } = await rawFetch<T>(path, opts);
      return data;
    }
    throw err;
  }
}
```
> Add `import { ApiError } from './errors';` if not already imported in `client.ts`.

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test src/lib/api/refresh.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: single-flight 401 refresh with retry and 429 backoff"
```

---

## Task 10: Session store with localStorage persistence (TDD)

**Files:**
- Create: `src/stores/session.ts`
- Test: `src/stores/session.test.ts`

- [ ] **Step 1: Install zustand**

Run: `pnpm add zustand`

- [ ] **Step 2: Write the failing test**

Create `src/stores/session.test.ts`:
```ts
import { afterEach, describe, expect, it } from 'vitest';
import { useSession } from './session';

afterEach(() => { useSession.getState().clear(); localStorage.clear(); });

describe('session store', () => {
  it('stores tokens and persists them to localStorage', () => {
    useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
    expect(useSession.getState().accessToken).toBe('a');
    expect(localStorage.getItem('buku.session')).toContain('"accessToken":"a"');
  });

  it('sets the user and marks the session authenticated', () => {
    useSession.getState().setUser({ id: '1', email: 'x@y.z', role: 'ADMIN' });
    expect(useSession.getState().status).toBe('authenticated');
  });

  it('clears tokens, user, and storage and becomes anonymous', () => {
    useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
    useSession.getState().clear();
    expect(useSession.getState().accessToken).toBeNull();
    expect(useSession.getState().status).toBe('anonymous');
    expect(localStorage.getItem('buku.session')).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test src/stores/session.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the session store**

Create `src/stores/session.ts`:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Role = 'VIEWER' | 'ACCOUNTANT' | 'APPROVER' | 'ADMIN';
export type AuthUser = { id: string; email: string; role: Role };

export interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  setTokens(pair: { accessToken: string; refreshToken: string }): void;
  setUser(user: AuthUser | null): void;
  setStatus(s: SessionState['status']): void;
  clear(): void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      status: 'loading',
      setTokens: (pair) =>
        set({ accessToken: pair.accessToken, refreshToken: pair.refreshToken }),
      setUser: (user) => set({ user, status: user ? 'authenticated' : 'anonymous' }),
      setStatus: (status) => set({ status }),
      clear: () =>
        set({ accessToken: null, refreshToken: null, user: null, status: 'anonymous' }),
    }),
    {
      name: 'buku.session',
      storage: createJSONStorage(() => localStorage),
      // Persist only the tokens; user + status are re-derived on load via /auth/me.
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }),
    },
  ),
);
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test src/stores/session.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Now run the deferred Task 8 + Task 9 tests**

Run: `pnpm test src/lib/api/`
Expected: PASS (client.test.ts + refresh.test.ts all green).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add persisted session store"
```

---

## Task 11: Theme store + provider (TDD)

**Files:**
- Create: `src/stores/theme.tsx`
- Modify: `src/app/providers.tsx`
- Test: `src/stores/theme.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/stores/theme.test.tsx`:
```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useTheme } from './theme';

afterEach(() => { localStorage.clear(); document.documentElement.classList.remove('dark'); });

it('toggles the dark class on the html element', () => {
  const { result } = renderHook(() => useTheme());
  act(() => result.current.setTheme('dark'));
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  act(() => result.current.setTheme('light'));
  expect(document.documentElement.classList.contains('dark')).toBe(false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/stores/theme.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the theme store + provider**

Create `src/stores/theme.tsx`:
```tsx
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme(t: Theme): void;
  toggle(): void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },
      toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
    }),
    { name: 'buku.theme' },
  ),
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return <>{children}</>;
}
```

- [ ] **Step 4: Restore `ThemeProvider` in providers**

In `src/app/providers.tsx`, ensure the real `ThemeProvider` from `@/stores/theme` wraps the tree (undo the temporary fragment from Task 3, Step 4).

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test src/stores/theme.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add persisted light/dark theme store"
```

---

## Task 12: Auth response schemas + login mutation (TDD)

**Files:**
- Create: `src/lib/schemas/common.ts`, `src/lib/schemas/auth.ts`, `src/features/auth/useLogin.ts`, `src/features/auth/useMe.ts`, `src/lib/query/keys.ts`
- Test: `src/features/auth/useLogin.test.tsx`

- [ ] **Step 1: Install zod**

Run: `pnpm add zod`

- [ ] **Step 2: Write the failing test**

Create `src/features/auth/useLogin.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { useLogin } from './useLogin';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('logs in, stores tokens, and hydrates the user', async () => {
  const { result } = renderHook(() => useLogin(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ email: 'admin@buku.id', password: 'ok' });
  });
  await waitFor(() => {
    expect(useSession.getState().accessToken).toBe('access-1');
    expect(useSession.getState().user?.role).toBe('ADMIN');
    expect(useSession.getState().status).toBe('authenticated');
  });
});

it('surfaces an ApiError on bad credentials', async () => {
  const { result } = renderHook(() => useLogin(), { wrapper });
  await expect(
    result.current.mutateAsync({ email: 'admin@buku.id', password: 'wrong' }),
  ).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test src/features/auth/useLogin.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 4: Create the schemas**

Create `src/lib/schemas/common.ts`:
```ts
import { z } from 'zod';

/** A monetary value as the API's 4-decimal string. */
export const moneyString = z
  .string()
  .regex(/^-?\d+(\.\d{1,4})?$/, 'expected a decimal money string');
```
Create `src/lib/schemas/auth.ts`:
```ts
import { z } from 'zod';

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const roleSchema = z.enum(['VIEWER', 'ACCOUNTANT', 'APPROVER', 'ADMIN']);

export const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: roleSchema,
});

export type TokenPair = z.infer<typeof tokenPairSchema>;
export type Me = z.infer<typeof meSchema>;
```

- [ ] **Step 5: Create query keys**

Create `src/lib/query/keys.ts`:
```ts
export const queryKeys = {
  me: ['auth', 'me'] as const,
};
```

- [ ] **Step 6: Implement `useMe` and `useLogin`**

Create `src/features/auth/useMe.ts`:
```ts
import { apiFetch } from '@/lib/api/client';
import { meSchema, type Me } from '@/lib/schemas/auth';

export function fetchMe(): Promise<Me> {
  return apiFetch('/auth/me', { schema: meSchema });
}
```
Create `src/features/auth/useLogin.ts`:
```ts
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { tokenPairSchema } from '@/lib/schemas/auth';
import { useSession } from '@/stores/session';
import { fetchMe } from './useMe';

export interface LoginInput { email: string; password: string; }

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const pair = await apiFetch('/auth/login', {
        method: 'POST',
        body: input,
        auth: false,
        schema: tokenPairSchema,
      });
      useSession.getState().setTokens(pair);
      const me = await fetchMe();
      useSession.getState().setUser(me);
      return me;
    },
  });
}
```

- [ ] **Step 7: Run to verify it passes**

Run: `pnpm test src/features/auth/useLogin.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: auth schemas + login mutation with user hydration"
```

---

## Task 13: Login page UI (TDD)

**Files:**
- Create: `src/features/auth/LoginForm.tsx`
- Modify: `src/app/routes/login.tsx`
- Test: `src/features/auth/LoginForm.test.tsx`

- [ ] **Step 1: Install form deps**

Run: `pnpm add react-hook-form @hookform/resolvers`

- [ ] **Step 2: Write the failing test**

Create `src/features/auth/LoginForm.test.tsx`:
```tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { useSession } from '@/stores/session';
import { LoginForm } from './LoginForm';

afterEach(() => useSession.getState().clear());

it('validates required fields before submitting', async () => {
  renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /masuk/i }));
  expect(await screen.findByText(/email/i)).toBeInTheDocument();
});

it('logs in and calls onSuccess', async () => {
  const onSuccess = vi.fn();
  renderWithProviders(<LoginForm onSuccess={onSuccess} />);
  await userEvent.type(screen.getByLabelText(/email/i), 'admin@buku.id');
  await userEvent.type(screen.getByLabelText(/kata sandi/i), 'ok');
  await userEvent.click(screen.getByRole('button', { name: /masuk/i }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  expect(useSession.getState().user?.role).toBe('ADMIN');
});

it('shows an error message on bad credentials', async () => {
  renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
  await userEvent.type(screen.getByLabelText(/email/i), 'admin@buku.id');
  await userEvent.type(screen.getByLabelText(/kata sandi/i), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: /masuk/i }));
  expect(await screen.findByText(/salah/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test src/features/auth/LoginForm.test.tsx`
Expected: FAIL — `LoginForm` not found.

- [ ] **Step 4: Implement `LoginForm`**

Create `src/features/auth/LoginForm.tsx`:
```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';
import { useLogin } from './useLogin';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useT();
  const login = useLogin();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await login.mutateAsync(values);
      onSuccess();
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 401
        ? t.auth.invalidCredentials
        : t.common.error;
      form.setError('root', { message: msg });
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t.auth.loginTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input id="email" type="email" autoComplete="username"
                {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{t.auth.email}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input id="password" type="password" autoComplete="current-password"
                {...form.register('password')} />
            </div>
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {t.auth.signIn}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Mount it in the login route**

Replace `src/app/routes/login.tsx`:
```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LoginForm } from '@/features/auth/LoginForm';

export const Route = createFileRoute('/login')({
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = useNavigate();
  return <LoginForm onSuccess={() => navigate({ to: '/dashboard' })} />;
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm test src/features/auth/LoginForm.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: branded login form with validation and error handling"
```

---

## Task 14: Route guard + session hydration (TDD)

**Files:**
- Create: `src/features/auth/guard.ts`, `src/features/auth/useHydrateSession.ts`
- Modify: `src/app/routes/_app.tsx` (new), `src/app/routes/_app/dashboard.tsx` (new)
- Test: `src/features/auth/guard.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/auth/guard.test.ts`:
```ts
import { afterEach, describe, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { requireAuth } from './guard';

afterEach(() => useSession.getState().clear());

describe('requireAuth', () => {
  it('throws a redirect to /login when there is no token', () => {
    expect(() => requireAuth()).toThrow();
  });
  it('passes when a token is present', () => {
    useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
    expect(() => requireAuth()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/auth/guard.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the guard + hydration hook**

Create `src/features/auth/guard.ts`:
```ts
import { redirect } from '@tanstack/react-router';
import { useSession } from '@/stores/session';

/** Route `beforeLoad` guard: redirect to /login when unauthenticated. */
export function requireAuth(): void {
  if (!useSession.getState().accessToken) {
    throw redirect({ to: '/login' });
  }
}
```
Create `src/features/auth/useHydrateSession.ts`:
```ts
import { useEffect } from 'react';
import { useSession } from '@/stores/session';
import { fetchMe } from './useMe';

/** On mount, if a token exists but no user yet, fetch /auth/me to hydrate. */
export function useHydrateSession() {
  const status = useSession((s) => s.status);
  const accessToken = useSession((s) => s.accessToken);
  useEffect(() => {
    if (accessToken && !useSession.getState().user) {
      fetchMe()
        .then((me) => useSession.getState().setUser(me))
        .catch(() => useSession.getState().clear());
    } else if (!accessToken) {
      useSession.getState().setStatus('anonymous');
    }
  }, [accessToken]);
  return status;
}
```

- [ ] **Step 4: Create the authenticated layout route**

Create `src/app/routes/_app.tsx`:
```tsx
import { Outlet, createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/features/auth/guard';
import { AppShell } from '@/components/common/AppShell';

export const Route = createFileRoute('/_app')({
  beforeLoad: () => requireAuth(),
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
```
Create `src/app/routes/_app/dashboard.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { useT } from '@/lib/i18n/useT';

export const Route = createFileRoute('/_app/dashboard')({
  component: function DashboardRoute() {
    const t = useT();
    return <PageHeader title={t.nav.dashboard} />;
  },
});
```
> `AppShell` and `PageHeader` are created in Tasks 15–16; this route will compile once those exist. Implement Tasks 15–16 before running `pnpm build`.

- [ ] **Step 5: Run to verify the guard test passes**

Run: `pnpm test src/features/auth/guard.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: authenticated layout route, auth guard, and session hydration"
```

---

## Task 15: Shared primitives — RoleGate, PageHeader, ErrorState, EmptyState (TDD)

**Files:**
- Create: `src/components/common/RoleGate.tsx`, `src/components/common/PageHeader.tsx`, `src/components/common/ErrorState.tsx`, `src/components/common/EmptyState.tsx`
- Test: `src/components/common/RoleGate.test.tsx`, `src/components/common/ErrorState.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/common/RoleGate.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { RoleGate } from './RoleGate';

afterEach(() => useSession.getState().clear());

it('renders children when the user role is allowed', () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'APPROVER' });
  render(<RoleGate allow={['APPROVER', 'ADMIN']}><button>Post</button></RoleGate>);
  expect(screen.getByRole('button', { name: 'Post' })).toBeInTheDocument();
});

it('hides children when the role is not allowed', () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  render(<RoleGate allow={['APPROVER', 'ADMIN']}><button>Post</button></RoleGate>);
  expect(screen.queryByRole('button', { name: 'Post' })).not.toBeInTheDocument();
});
```
Create `src/components/common/ErrorState.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { ErrorState } from './ErrorState';

it('shows the message and the traceId reference', () => {
  const err = new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Boom', traceId: 'trace-7' });
  render(<ErrorState error={err} />);
  expect(screen.getByText('Boom')).toBeInTheDocument();
  expect(screen.getByText(/trace-7/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test src/components/common/`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the primitives**

Create `src/components/common/RoleGate.tsx`:
```tsx
import type { ReactNode } from 'react';
import { useSession, type Role } from '@/stores/session';

/** Render children only when the current user's role is in `allow`. */
export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const role = useSession((s) => s.user?.role);
  if (!role || !allow.includes(role)) return null;
  return <>{children}</>;
}

export function useRole(): Role | undefined {
  return useSession((s) => s.user?.role);
}

export function hasRole(role: Role | undefined, allow: Role[]): boolean {
  return !!role && allow.includes(role);
}
```
Create `src/components/common/PageHeader.tsx`:
```tsx
import type { ReactNode } from 'react';

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}
```
Create `src/components/common/ErrorState.tsx`:
```tsx
import { TriangleAlert } from 'lucide-react';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';

export function ErrorState({ error }: { error: unknown }) {
  const t = useT();
  const isApi = error instanceof ApiError;
  const message = isApi ? error.message : t.common.error;
  const traceId = isApi ? error.traceId : undefined;
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <TriangleAlert className="size-6 text-destructive" />
      <p className="font-medium">{message}</p>
      {traceId && (
        <p className="text-xs text-muted-foreground">
          {t.common.reference}: <code>{traceId}</code>
        </p>
      )}
    </div>
  );
}
```
Create `src/components/common/EmptyState.tsx`:
```tsx
import { Inbox } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';

export function EmptyState({ message }: { message?: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-10 text-muted-foreground">
      <Inbox className="size-6" />
      <p className="text-sm">{message ?? t.common.noData}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm test src/components/common/`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: shared primitives RoleGate, PageHeader, ErrorState, EmptyState"
```

---

## Task 16: App shell — sidebar, topbar, role-aware nav, theme toggle

**Files:**
- Create: `src/components/common/AppShell.tsx`, `src/components/common/ThemeToggle.tsx`
- Test: `src/components/common/AppShell.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/AppShell.test.tsx`:
```tsx
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { AppShell } from './AppShell';

afterEach(() => useSession.getState().clear());

const NAV_PATHS = ['/dashboard', '/accounts', '/partners', '/tax-codes', '/sales-invoices', '/payments'];

function renderInRouter(ui: React.ReactNode) {
  const root = createRootRoute({ component: () => ui });
  const children = NAV_PATHS.map((path) =>
    createRoute({ getParentRoute: () => root, path, component: () => null }),
  );
  const router = createRouter({
    routeTree: root.addChildren(children),
    history: createMemoryHistory({ initialEntries: ['/dashboard'] }),
  });
  return render(<RouterProvider router={router} />);
}

it('renders the app name and the current user email', () => {
  useSession.getState().setUser({ id: '1', email: 'admin@buku.id', role: 'ADMIN' });
  renderInRouter(<AppShell><div>content</div></AppShell>);
  expect(screen.getByText('Buku')).toBeInTheDocument();
  expect(screen.getByText('admin@buku.id')).toBeInTheDocument();
  expect(screen.getByText('content')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/components/common/AppShell.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the theme toggle**

Create `src/components/common/ThemeToggle.tsx`:
```tsx
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/stores/theme';

export function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
```

- [ ] **Step 4: Implement the app shell**

Create `src/components/common/AppShell.tsx`:
```tsx
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  BookText, LayoutDashboard, Users, Receipt, Percent, Wallet, LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';
import { useSession } from '@/stores/session';
import { ThemeToggle } from './ThemeToggle';

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const user = useSession((s) => s.user);
  const clear = useSession((s) => s.clear);

  const nav = [
    { to: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/accounts', label: t.nav.accounts, icon: BookText },
    { to: '/partners', label: t.nav.partners, icon: Users },
    { to: '/tax-codes', label: t.nav.taxCodes, icon: Percent },
    { to: '/sales-invoices', label: t.nav.salesInvoices, icon: Receipt },
    { to: '/payments', label: t.nav.payments, icon: Wallet },
  ];

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-60 flex-col border-r bg-muted/30">
        <div className="flex items-center gap-2 px-5 py-4">
          <BookText className="size-5 text-primary" />
          <span className="text-lg font-semibold">{t.app.name}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: 'bg-primary/10 font-medium text-primary' }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b px-6">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label={t.auth.signOut} onClick={clear}>
            <LogOut className="size-4" />
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test src/components/common/AppShell.test.tsx`
Expected: PASS.

- [ ] **Step 6: Create placeholder routes for the nav targets**

The shell's typed `<Link>`s point at `/accounts`, `/partners`, `/tax-codes`,
`/sales-invoices`, `/payments`, which don't exist yet — without stubs the build
fails type-checking. Create one stub per target (each replaced by its real plan
later). Create `src/app/routes/_app/accounts.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { useT } from '@/lib/i18n/useT';

export const Route = createFileRoute('/_app/accounts')({
  component: function AccountsRoute() {
    return <PageHeader title={useT().nav.accounts} />;
  },
});
```
Repeat the same shape for the other four (only the route id, component name, and
title change):
- `src/app/routes/_app/partners.tsx` → `createFileRoute('/_app/partners')`, `PartnersRoute`, `useT().nav.partners`
- `src/app/routes/_app/tax-codes.tsx` → `createFileRoute('/_app/tax-codes')`, `TaxCodesRoute`, `useT().nav.taxCodes`
- `src/app/routes/_app/sales-invoices.tsx` → `createFileRoute('/_app/sales-invoices')`, `SalesInvoicesRoute`, `useT().nav.salesInvoices`
- `src/app/routes/_app/payments.tsx` → `createFileRoute('/_app/payments')`, `PaymentsRoute`, `useT().nav.payments`

- [ ] **Step 7: Verify the whole app type-checks and builds**

Run: `pnpm build`
Expected: type-checks and builds with no errors (all routes resolve).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: branded app shell with role-aware nav and theme toggle"
```

---

## Task 17: DataTable + MoneyText + MoneyInput (TDD)

**Files:**
- Create: `src/components/common/DataTable.tsx`, `src/components/common/MoneyText.tsx`, `src/components/common/MoneyInput.tsx`
- Test: `src/components/common/DataTable.test.tsx`, `src/components/common/MoneyInput.test.tsx`

- [ ] **Step 1: Install TanStack Table**

Run: `pnpm add @tanstack/react-table`

- [ ] **Step 2: Write the failing tests**

Create `src/components/common/DataTable.test.tsx`:
```tsx
import { createColumnHelper } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { DataTable } from './DataTable';

type Row = { code: string; name: string };
const col = createColumnHelper<Row>();
const columns = [
  col.accessor('code', { header: 'Kode' }),
  col.accessor('name', { header: 'Nama' }),
];

it('renders headers and rows', () => {
  render(<DataTable columns={columns} data={[{ code: '1-1000', name: 'Kas' }]} />);
  expect(screen.getByText('Kode')).toBeInTheDocument();
  expect(screen.getByText('1-1000')).toBeInTheDocument();
  expect(screen.getByText('Kas')).toBeInTheDocument();
});

it('shows an empty state when there are no rows', () => {
  render(<DataTable columns={columns} data={[]} />);
  expect(screen.getByText(/tidak ada data/i)).toBeInTheDocument();
});
```
Create `src/components/common/MoneyInput.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { MoneyInput } from './MoneyInput';

it('emits the raw string value, never a float', async () => {
  const onChange = vi.fn();
  render(<MoneyInput value="" onChange={onChange} aria-label="amount" />);
  await userEvent.type(screen.getByLabelText('amount'), '1500.50');
  expect(onChange).toHaveBeenLastCalledWith('1500.50');
});

it('rejects non-numeric characters', async () => {
  const onChange = vi.fn();
  render(<MoneyInput value="" onChange={onChange} aria-label="amount" />);
  await userEvent.type(screen.getByLabelText('amount'), 'abc');
  expect(onChange).not.toHaveBeenCalledWith('abc');
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `pnpm test src/components/common/DataTable.test.tsx src/components/common/MoneyInput.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement the components**

Create `src/components/common/MoneyText.tsx`:
```tsx
import { Money } from '@/lib/money/money';

/** Right-aligned, tabular rupiah display from a 4dp API string. */
export function MoneyText({ value }: { value: string }) {
  return (
    <span className="font-mono tabular-nums">{Money.from(value).toRupiah()}</span>
  );
}
```
Create `src/components/common/MoneyInput.tsx`:
```tsx
import { Input } from '@/components/ui/input';

interface MoneyInputProps {
  value: string;
  onChange: (raw: string) => void;
  'aria-label'?: string;
  id?: string;
  placeholder?: string;
}

/** Keeps the raw decimal string; only allows digits, one dot, and a leading minus. */
export function MoneyInput({ value, onChange, ...rest }: MoneyInputProps) {
  return (
    <Input
      inputMode="decimal"
      className="text-right font-mono tabular-nums"
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        if (next === '' || /^-?\d*\.?\d{0,4}$/.test(next)) onChange(next);
      }}
      {...rest}
    />
  );
}
```
Create `src/components/common/DataTable.tsx`:
```tsx
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { EmptyState } from './EmptyState';

interface DataTableProps<TData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[];
  data: TData[];
  emptyMessage?: string;
}

export function DataTable<TData>({ columns, data, emptyMessage }: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (data.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id}>
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `pnpm test src/components/common/DataTable.test.tsx src/components/common/MoneyInput.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: DataTable, MoneyText, and decimal-safe MoneyInput"
```

---

## Task 18: Environment config, README, full verification

**Files:**
- Create: `.env.example`, `README.md`

- [ ] **Step 1: Create `.env.example`**

```
# Base URL of the Indonesian Accounting API (no trailing slash)
VITE_API_BASE_URL=http://localhost:4000
```

- [ ] **Step 2: Create `README.md`**

```markdown
# Buku — Indonesian Accounting Client

React + Vite client for the Indonesian Accounting API (SAK/PSAK). See
`docs/api/frontend-guide.md` for API conventions and `docs/superpowers/specs/`
for the design.

## Setup
```bash
pnpm install
cp .env.example .env   # set VITE_API_BASE_URL to your API
pnpm dev
```

## Scripts
- `pnpm dev` — start the dev server
- `pnpm build` — type-check + production build
- `pnpm test` — run the test suite (Vitest)
- `pnpm lint` — ESLint

## Architecture
- Vite SPA, React 19 + React Compiler, TanStack Router + Query.
- Server state in React Query; session/theme in Zustand.
- Money is decimal strings end-to-end via `lib/money` (never floats).
- API access via `lib/api` (bearer auth, single-flight 401-refresh, 429 backoff,
  typed `ApiError` from the response envelope).
- All UI strings live in `lib/i18n/messages.id.ts` (Bahasa Indonesia; English-ready).

## Regenerating API request types
```bash
pnpm dlx openapi-typescript docs/api/openapi.json -o src/types/api.d.ts
```
```

- [ ] **Step 3: Generate API request types from the spec**

Run:
```bash
pnpm dlx openapi-typescript docs/api/openapi.json -o src/types/api.d.ts
```
Expected: writes `src/types/api.d.ts`. Commit it as the generated request-type source.

- [ ] **Step 4: Full verification — lint, test, build**

Run:
```bash
pnpm lint && pnpm test && pnpm build
```
Expected: lint clean, all tests pass, build succeeds.

- [ ] **Step 5: Manual smoke against the live API (optional but recommended)**

Run `pnpm dev`, open the app, and confirm: redirected to `/login`; logging in with a real API user lands on `/dashboard`; the sidebar shows the user email; the theme toggle switches light/dark and persists on reload; reloading keeps you logged in (token persisted), and an expired access token transparently refreshes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: add README, env example, and generated API request types"
```

---

## Done criteria for Plan 1

- `pnpm lint && pnpm test && pnpm build` all green.
- Login works against the live API; session persists across reload; access-token expiry refreshes transparently (single-flight); refresh failure returns to `/login`.
- Role-aware shell renders with the user's email; light/dark toggles and persists.
- `Money`, `apiFetch`, `ApiError`, `useSession`, `useT`, `RoleGate`, `DataTable`, `MoneyInput` are tested and ready for Plan 2 (Chart of Accounts + Partners + Tax Codes).
```

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

Currently ships a working login + role-aware shell foundation. Feature screens
(Chart of Accounts, Partners, Tax Codes, Sales Invoices, Payments) come in
subsequent plans.

## Tech stack

| Layer | Library |
|---|---|
| Build | Vite 8, TypeScript |
| UI | React 19 + React Compiler, Tailwind CSS v4, shadcn/ui |
| Routing | TanStack Router (file-based, type-safe) |
| Server state | TanStack Query v5 |
| Client state | Zustand |
| Validation | Zod |
| Forms | React Hook Form + @hookform/resolvers |
| Money | decimal.js via `lib/money/Money` |
| Testing | Vitest + React Testing Library + MSW |

## Regenerating API request types

```bash
pnpm dlx openapi-typescript docs/api/openapi.json -o src/types/api.d.ts
```

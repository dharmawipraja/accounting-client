# Dashboard "Jurnal Draft" Deep-Link (Plan 11) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard "Jurnal Draft" card a link to `/journals?status=DRAFT` (the draft/approval-queue view).

**Architecture:** Three small edits — a `JournalsPage` `initialStatus` prop, `validateSearch` on the existing journals index route, and a typed `<Link>` wrapping the draft card. Plus two test updates. No new files, no schemas, no i18n, **no route-tree regeneration** (modifying an existing route file's `validateSearch` needs none).

**Tech Stack:** React 19, TanStack Router (file-based) + Query v5, Vitest 4 + RTL + MSW v2.

**Reference spec:** `docs/superpowers/specs/2026-06-15-dashboard-draft-link-design.md`

---

### Task 1: `JournalsPage` initial status + journals route search param

**Files:**
- Modify: `src/features/journals/JournalsPage.tsx`
- Modify: `src/app/routes/_app/journals.index.tsx`
- Test: `src/features/journals/JournalsPage.test.tsx`

- [ ] **Step 1: Write the failing test** — in `src/features/journals/JournalsPage.test.tsx`, change the `renderPage` helper to accept an optional `initialStatus` and pass it through, then add a new test. The current helper renders `component: () => <JournalsPage />`; change that line to forward the arg:

```tsx
function renderPage(initialStatus?: 'DRAFT' | 'POSTED') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute();
  const index = createRoute({ getParentRoute: () => root, path: '/', component: () => <JournalsPage initialStatus={initialStatus} /> });
  const newR = createRoute({ getParentRoute: () => root, path: '/journals/new', component: () => null });
  const view = createRoute({ getParentRoute: () => root, path: '/journals/$id', component: () => null });
  const router = createRouter({ routeTree: root.addChildren([index, newR, view]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  return render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
}
```

Add this test (e.g. after the first one):

```tsx
it('seeds the status filter from initialStatus (deep-link to DRAFT)', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'APPROVER' });
  let seenStatus: string | null = null;
  server.use(http.get(`${API}/ledger/journal-entries`, ({ request }) => {
    seenStatus = new URL(request.url).searchParams.get('status');
    return HttpResponse.json(journalEntryListFixture());
  }));
  renderPage('DRAFT');
  await waitFor(() => expect(seenStatus).toBe('DRAFT'));
});
```

(`waitFor` is already imported in this file; `journalEntryListFixture`/`API`/`server` too.)

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/journals/JournalsPage.test.tsx` (FAIL: `JournalsPage` ignores the prop, so the request carries no `status` → `seenStatus` stays `null`).

- [ ] **Step 3: Add the prop to `JournalsPage`** — in `src/features/journals/JournalsPage.tsx`:

Change the signature:
```tsx
export function JournalsPage({ initialStatus }: { initialStatus?: 'DRAFT' | 'POSTED' } = {}) {
```
Change the status state initializer (currently `useState<(typeof STATUSES)[number]>('ALL')`):
```tsx
  const [status, setStatus] = useState<(typeof STATUSES)[number]>(initialStatus ?? 'ALL');
```
Everything else (the filter buttons, the list query `status: status === 'ALL' ? undefined : status`, pagination, actions) is unchanged.

- [ ] **Step 4: Add `validateSearch` to the journals index route** — replace `src/app/routes/_app/journals.index.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { JournalsPage } from '@/features/journals/JournalsPage';

export const Route = createFileRoute('/_app/journals/')({
  validateSearch: (search: Record<string, unknown>): { status?: 'DRAFT' | 'POSTED' } => ({
    status: search.status === 'DRAFT' || search.status === 'POSTED' ? search.status : undefined,
  }),
  component: function JournalsRoute() {
    const { status } = Route.useSearch();
    return <JournalsPage initialStatus={status} />;
  },
});
```

(`validateSearch` on an EXISTING route file needs no `routeTree.gen.ts` regeneration — the generated tree imports this route and picks up the new search type through TypeScript.)

- [ ] **Step 5: Run test to verify it passes** — `pnpm test --run src/features/journals/JournalsPage.test.tsx` (PASS — all prior cases + the new DRAFT case).

- [ ] **Step 6: Commit**
```bash
git add src/features/journals/JournalsPage.tsx src/app/routes/_app/journals.index.tsx src/features/journals/JournalsPage.test.tsx
git commit -m "feat(journals): seed status filter from a ?status= search param"
```

---

### Task 2: Dashboard draft-card link + verification

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Test: `src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Upgrade the dashboard test to a router stub + add the link assertion** — in `src/features/dashboard/DashboardPage.test.tsx`:

Add to the imports at the top:
```tsx
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
```

Replace the `renderPage` helper with a router-stubbed version (a root, the dashboard at `/`, and a `/journals` route the draft `Link` targets):
```tsx
function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRootRoute();
  const index = createRoute({ getParentRoute: () => root, path: '/', component: () => <DashboardPage /> });
  const journals = createRoute({
    getParentRoute: () => root,
    path: '/journals',
    validateSearch: (s: Record<string, unknown>): { status?: 'DRAFT' | 'POSTED' } => ({
      status: s.status === 'DRAFT' || s.status === 'POSTED' ? s.status : undefined,
    }),
    component: () => null,
  });
  const router = createRouter({ routeTree: root.addChildren([index, journals]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  return render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
}
```

Add this test (the existing card-value tests keep working unchanged inside the router):
```tsx
it('the Jurnal Draft card links to /journals filtered to DRAFT', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  renderPage();
  const draftValue = await screen.findByText('3'); // draft count
  const link = draftValue.closest('a');
  expect(link).not.toBeNull();
  expect(link?.getAttribute('href')).toContain('/journals');
  expect(link?.getAttribute('href')).toContain('status=DRAFT');
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/dashboard/DashboardPage.test.tsx` (FAIL: the draft card has no wrapping `<a>` yet → `closest('a')` is `null`).

- [ ] **Step 3: Wrap the draft card in a `Link`** — in `src/features/dashboard/DashboardPage.tsx`:

Add the import:
```tsx
import { Link } from '@tanstack/react-router';
```
Wrap the Jurnal Draft `SummaryCard` (the last card, `title={t.dashboard.draftEntries}`) in a `Link`:
```tsx
        <Link to="/journals" search={{ status: 'DRAFT' }} className="block rounded-xl transition-opacity hover:opacity-90">
          <SummaryCard title={t.dashboard.draftEntries} value={drafts.data?.total ?? '—'} loading={drafts.isLoading} error={drafts.isError} onRetry={() => void drafts.refetch()} />
        </Link>
```

(The typed `search={{ status: 'DRAFT' }}` only compiles because Task 1 added `validateSearch` to the `/journals` index route. No regen needed.)

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/dashboard/DashboardPage.test.tsx` (PASS — the existing card tests + the new link test).

- [ ] **Step 5: Full verification**
  - `pnpm test --run` — expect all green (~223: 221 prior + 2 new).
  - `pnpm lint` — 0 errors (pre-existing warnings acceptable).
  - `pnpm build` — success (`tsc -b && vite build`; the typed `Link search={{status}}` type-checks against the route's `validateSearch`). If `tsc` unexpectedly rejects `search={{ status: 'DRAFT' }}` (the route-tree types didn't pick up the new `validateSearch`), regenerate once: start `pnpm dev` in the background, wait a few seconds, stop it, then rebuild — and `git add src/routeTree.gen.ts` in Step 6 if it changed.

- [ ] **Step 6: Commit**
```bash
git add src/features/dashboard/DashboardPage.tsx src/features/dashboard/DashboardPage.test.tsx
git commit -m "feat(dashboard): Jurnal Draft card links to /journals?status=DRAFT"
```

---

## Done Criteria

- The dashboard "Jurnal Draft" card is a clickable link → `/journals?status=DRAFT`; landing there, the journals register's status filter is seeded to DRAFT (the list shows draft entries, DRAFT button active).
- Direct navigation to `/journals` (no param) still defaults to ALL.
- All tests pass (~223); lint clean; build green. No new route files / no route-tree regeneration.

## Out of Scope (YAGNI)

Making other dashboard cards clickable, a general `to`/`onClick` prop on `SummaryCard`, deep-linking the journals `sourceType` filter, or any new route. This closes the last deferred item.

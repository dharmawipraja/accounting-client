# AR/AP Aging (Plan 7c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AR Aging (Umur Piutang) + AP Aging (Umur Utang) to `/reports` — one kind-parameterized page showing a partner×bucket summary, with a partner's open documents revealed on click.

**Architecture:** Reuse the 7a/7b reports infrastructure entirely (`useReport`, `ReportDateControls`, `ReportContent`, `ReportTable`/`MoneyCell`, the routes group, the `reports` i18n group). Add one schema, one page component, and two thin routes. No new shared component. The page is pure and testable standalone; the two route files hold the only wiring (the `kind` prop).

**Tech Stack:** React 19, TanStack Router (file-based) + Query v5, Zod v4, shadcn/ui, decimal.js `Money`, Vitest 4 + RTL + MSW v2.

**Reference spec:** `docs/superpowers/specs/2026-06-15-ar-ap-aging-design.md`

---

## Ordering note

The two new `Link`s in `ReportsIndexPage` only type-check once both routes exist in `src/routeTree.gen.ts`. So the route files + the full `tsc` build are deferred to the last task (Task 4). The `AgingPage` (Task 3) renders directly in tests (no router) and is verified with `pnpm test --run`.

## Reconciliation note

The aging shape below was reconciled during the 7a cycle. **Before Task 2**, re-verify both endpoints live IF `.env` access is available: a throwaway `/tmp/reconcile-7c.mjs` that reads `.env` (`VITE_API_BASE_URL`, `RECONCILE_EMAIL`, `RECONCILE_PASSWORD`), logs in, and GETs `/reports/ar-aging?asOf=<today>` and `/reports/ap-aging?asOf=<today>`. Both are read-only (no `segregationOfDutiesEnabled` toggling). Keep the script in `/tmp` (never commit). If `.env` access is restricted (as during the 7b cycle), proceed with the shape below — the `z.record` bucket modelling is drift-resistant. If a field differs, adjust the Task 2 schema before pinning.

## File Structure

```
src/features/reports/
  schema.ts                  # Task 2 — extend: aging schemas + AGING_BUCKETS
  schema.test.ts             # Task 2 — extend: 1 new parse
  AgingPage.tsx / .test.tsx  # Task 3
  ReportsIndexPage.tsx       # Task 4 — append 2 cards
src/app/routes/_app/reports.ar-aging.tsx, reports.ap-aging.tsx  # Task 4
src/lib/i18n/messages.id.ts  # Task 1 — extend reports group
```

**Reuse (unchanged):** `useReport(path, params, schema, enabled?)`, `ReportDateControls mode="asOf"`, `ReportContent`, `ReportTable`/`MoneyCell`/`ReportColumn` (from 7b), `MoneyText`/`Money` (`from`/`plus`/`zero`/`toApi`), `formatDateID`/`toApiDate`, shadcn `TableCell`/`TableRow`, `PageHeader`, `Card`. No `handlers.ts` change — the page tests override `/reports/ar-aging` and `/reports/ap-aging` inline.

---

### Task 1: i18n — extend the `reports` group

**Files:** Modify `src/lib/i18n/messages.id.ts`

- [ ] **Step 1: Add the new keys**

In `src/lib/i18n/messages.id.ts`, inside the EXISTING `reports` group (e.g. after `totalKredit: 'Total Kredit',` and before the `subtype: {` nested object), add:

```ts
    arAging: 'Umur Piutang',
    arAgingDesc: 'Saldo piutang pelanggan menurut umur',
    apAging: 'Umur Utang',
    apAgingDesc: 'Saldo utang vendor menurut umur',
    pelanggan: 'Pelanggan',
    vendor: 'Vendor',
    lancar: 'Lancar',
    jatuhTempo: 'Jatuh Tempo',
    dibayar: 'Dibayar',
    outstanding: 'Outstanding',
    umur: 'Umur',
```

Keep `export type Messages = typeof id;` intact. These are NEW keys in the `reports` group (which already exists from 7a/7b). Do NOT add a `nav` entry. Do NOT touch any other group. (`total`, `tanggal`, `ref` already exist in the group from 7b and are reused. No `totalOutstanding` key — the grand total renders as a bare amount in the footer's Total column.)

- [ ] **Step 2: Verify** — Run: `pnpm build` (expected: succeeds).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/messages.id.ts
git commit -m "feat(reports): i18n for AR/AP aging"
```

---

### Task 2: Schema (extend `schema.ts`)

**Files:**
- Modify: `src/features/reports/schema.ts`
- Test: `src/features/reports/schema.test.ts` (extend)

- [ ] **Step 1: Write the failing test** — append to `src/features/reports/schema.test.ts`. Add `agingReportSchema` to the existing `import { … } from './schema'` line (do not duplicate the import; do not re-import `describe/it/expect`). Add this `describe`:

```ts
describe('aging report schema', () => {
  it('parses partners with buckets + documents, totals, and grand total', () => {
    const r = agingReportSchema.parse({
      kind: 'AR', asOf: '2026-06-30',
      partners: [{
        partnerId: 'p1', partnerName: 'PT Pelanggan',
        documents: [{ ref: 'INV/2026/000012', date: '2026-04-01', dueDate: '2026-05-01', total: '1000000.0000', paidAsOf: '0.0000', outstanding: '1000000.0000', bucket: '31-60' }],
        buckets: { Current: '0.0000', '1-30': '0.0000', '31-60': '1000000.0000', '61-90': '0.0000', '>90': '0.0000' },
      }],
      totalsByBucket: { Current: '0.0000', '1-30': '0.0000', '31-60': '1000000.0000', '61-90': '0.0000', '>90': '0.0000' },
      totalOutstanding: '1000000.0000',
    });
    expect(r.partners[0].partnerName).toBe('PT Pelanggan');
    expect(r.partners[0].buckets['31-60']).toBe('1000000.0000');
    expect(r.partners[0].documents[0].ref).toBe('INV/2026/000012');
    expect(r.totalOutstanding).toBe('1000000.0000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/reports/schema.test.ts` (FAIL: `agingReportSchema` not exported).

- [ ] **Step 3: Write the implementation** — append to `src/features/reports/schema.ts`:

```ts
export const agingDocumentSchema = z.object({
  ref: z.string(),
  date: z.string(),
  dueDate: z.string().nullish(),
  total: moneyString,
  paidAsOf: moneyString.nullish(),
  outstanding: moneyString,
  bucket: z.string(),
});
export type AgingDocument = z.infer<typeof agingDocumentSchema>;

const agingBucketsSchema = z.record(z.string(), moneyString);

export const agingPartnerSchema = z.object({
  partnerId: z.string(),
  partnerName: z.string(),
  documents: z.array(agingDocumentSchema).default([]),
  buckets: agingBucketsSchema,
});
export type AgingPartner = z.infer<typeof agingPartnerSchema>;

export const agingReportSchema = z.object({
  kind: z.string().nullish(),
  asOf: z.string().nullish(),
  partners: z.array(agingPartnerSchema),
  totalsByBucket: agingBucketsSchema,
  totalOutstanding: moneyString,
});
export type AgingReport = z.infer<typeof agingReportSchema>;

export const AGING_BUCKETS = ['Current', '1-30', '31-60', '61-90', '>90'] as const;
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/reports/schema.test.ts` (PASS, all schema tests including the new one).

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/schema.ts src/features/reports/schema.test.ts
git commit -m "feat(reports): AR/AP aging schema"
```

---

### Task 3: `AgingPage`

**Files:**
- Create: `src/features/reports/AgingPage.tsx`
- Test: `src/features/reports/AgingPage.test.tsx`

- [ ] **Step 1: Write the failing test** — create `src/features/reports/AgingPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { AgingPage } from './AgingPage';

afterEach(() => useSession.getState().clear());

const fixture = (asOf: string, kind: string) => ({
  kind, asOf,
  partners: [{
    partnerId: 'p1', partnerName: 'PT Pelanggan',
    documents: [{ ref: 'INV/2026/000012', date: '2026-04-01', dueDate: '2026-05-01', total: '1000000.0000', paidAsOf: '0.0000', outstanding: '1000000.0000', bucket: '31-60' }],
    buckets: { Current: '0.0000', '1-30': '0.0000', '31-60': '1000000.0000', '61-90': '0.0000', '>90': '0.0000' },
  }],
  totalsByBucket: { Current: '0.0000', '1-30': '0.0000', '31-60': '1000000.0000', '61-90': '0.0000', '>90': '0.0000' },
  totalOutstanding: '1000000.0000',
});

function renderPage(kind: 'AR' | 'AP') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><AgingPage kind={kind} /></QueryClientProvider>);
}

it('AR: renders Umur Piutang + a partner row; asOf drives the fetch; clicking a partner reveals its documents', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let seenAsOf: string | null = null;
  server.use(http.get(`${API}/reports/ar-aging`, ({ request }) => {
    seenAsOf = new URL(request.url).searchParams.get('asOf');
    return HttpResponse.json(fixture(seenAsOf ?? '', 'AR'));
  }));
  renderPage('AR');
  expect(await screen.findByText('PT Pelanggan')).toBeInTheDocument();
  expect(screen.getByText('Umur Piutang')).toBeInTheDocument();
  expect(screen.getByText('Pelanggan')).toBeInTheDocument(); // partner-column header
  await waitFor(() => expect(seenAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)); // default asOf = today
  expect(screen.queryByText('INV/2026/000012')).not.toBeInTheDocument(); // hidden until clicked
  fireEvent.click(screen.getByText('PT Pelanggan'));
  expect(await screen.findByText('INV/2026/000012')).toBeInTheDocument();
});

it('AP: requests /reports/ap-aging and shows Umur Utang + the Vendor label', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let called = false;
  server.use(http.get(`${API}/reports/ap-aging`, () => { called = true; return HttpResponse.json(fixture('2026-06-30', 'AP')); }));
  renderPage('AP');
  expect(await screen.findByText('Umur Utang')).toBeInTheDocument();
  expect(screen.getByText('Vendor')).toBeInTheDocument();
  expect(called).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test --run src/features/reports/AgingPage.test.tsx` (FAIL: cannot resolve `./AgingPage`).

- [ ] **Step 3: Write the implementation** — create `src/features/reports/AgingPage.tsx`:

```tsx
import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { MoneyText } from '@/components/common/MoneyText';
import { Money } from '@/lib/money/money';
import { formatDateID, toApiDate } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { ReportTable, MoneyCell, type ReportColumn } from './ReportTable';
import { useReport } from './useReport';
import { agingReportSchema, AGING_BUCKETS, type AgingPartner, type AgingDocument } from './schema';

function partnerTotal(p: AgingPartner): string {
  return AGING_BUCKETS.reduce((m, b) => m.plus(Money.from(p.buckets[b] ?? '0')), Money.zero()).toApi();
}

export function AgingPage({ kind }: { kind: 'AR' | 'AP' }) {
  const t = useT();
  const [asOf, setAsOf] = useState(() => toApiDate(new Date()));
  const [selected, setSelected] = useState<AgingPartner | null>(null);
  const path = kind === 'AR' ? '/reports/ar-aging' : '/reports/ap-aging';
  const query = useReport(path, { asOf }, agingReportSchema);
  const partnerLabel = kind === 'AR' ? t.reports.pelanggan : t.reports.vendor;

  const summaryColumns: ReportColumn<AgingPartner>[] = [
    { header: partnerLabel, cell: (p) => p.partnerName },
    ...AGING_BUCKETS.map((b): ReportColumn<AgingPartner> => ({
      header: b === 'Current' ? t.reports.lancar : b,
      align: 'right',
      cell: (p) => <MoneyCell value={p.buckets[b] ?? '0'} />,
    })),
    { header: t.reports.total, align: 'right', cell: (p) => <MoneyText value={partnerTotal(p)} /> },
  ];

  const docColumns: ReportColumn<AgingDocument>[] = [
    { header: t.reports.ref, cell: (d) => d.ref },
    { header: t.reports.tanggal, cell: (d) => formatDateID(d.date.slice(0, 10)) },
    { header: t.reports.jatuhTempo, cell: (d) => (d.dueDate ? formatDateID(d.dueDate.slice(0, 10)) : '') },
    { header: t.reports.total, align: 'right', cell: (d) => <MoneyText value={d.total} /> },
    { header: t.reports.dibayar, align: 'right', cell: (d) => <MoneyCell value={d.paidAsOf ?? '0'} /> },
    { header: t.reports.outstanding, align: 'right', cell: (d) => <MoneyText value={d.outstanding} /> },
    { header: t.reports.umur, cell: (d) => d.bucket },
  ];

  return (
    <div>
      <PageHeader title={kind === 'AR' ? t.reports.arAging : t.reports.apAging} />
      <ReportDateControls mode="asOf" asOf={asOf} onAsOf={setAsOf} />
      <ReportContent query={query}>
        {(rep) => (
          <div className="space-y-4">
            <ReportTable<AgingPartner>
              columns={summaryColumns}
              rows={rep.partners}
              onRowClick={(p) => setSelected(p)}
              footer={
                <TableRow>
                  <TableCell className="font-semibold">{t.reports.total}</TableCell>
                  {AGING_BUCKETS.map((b) => (
                    <TableCell key={b} className="text-right font-semibold tabular-nums">
                      <MoneyText value={rep.totalsByBucket[b] ?? '0'} />
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular-nums"><MoneyText value={rep.totalOutstanding} /></TableCell>
                </TableRow>
              }
            />
            {selected ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">{selected.partnerName}</div>
                <ReportTable<AgingDocument> columns={docColumns} rows={selected.documents} />
              </div>
            ) : null}
          </div>
        )}
      </ReportContent>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `pnpm test --run src/features/reports/AgingPage.test.tsx` (PASS, 2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/AgingPage.tsx src/features/reports/AgingPage.test.tsx
git commit -m "feat(reports): AR/AP Aging page (kind-parameterized)"
```

## Context for Task 3

`AgingPage` is a pure component (takes `kind: 'AR' | 'AP'`). It owns `asOf` state (default today) and `selected: AgingPartner | null`. It fetches `/reports/ar-aging` or `/reports/ap-aging` (by `kind`) via `useReport`. The summary `ReportTable` has the partner-label column, one column per `AGING_BUCKETS` (`Current` → "Lancar" header, the others render their key literally), and a per-partner Total (Money-sum of that partner's buckets). Clicking a partner row sets `selected`; a detail `ReportTable` of `selected.documents` renders below. The footer Total row has the partner-label cell + one cell per bucket (`totalsByBucket[b]`) + the `totalOutstanding` cell (7 cells = 7 summary columns). `MoneyCell` zero-suppresses bucket/paid cells; `MoneyText` always shows totals/outstanding. `buckets[b] ?? '0'` and `paidAsOf ?? '0'` guard the nullish/optional values. The page renders standalone in tests (no router); tests override the two endpoints inline. Reuse paths match the existing `TrialBalancePage.tsx`/`GeneralLedgerPage.tsx` in the same folder. `useSession.setUser` takes `{ id, email, role }`.

---

### Task 4: Landing cards + routes + verification

**Files:**
- Modify: `src/features/reports/ReportsIndexPage.tsx`
- Create: `src/app/routes/_app/reports.ar-aging.tsx`, `src/app/routes/_app/reports.ap-aging.tsx`

- [ ] **Step 1: Append two cards in `ReportsIndexPage.tsx`**

In `src/features/reports/ReportsIndexPage.tsx`, add two entries to the existing `reports` array (after the `general-ledger` entry; the array is `as const` — keep that):

```tsx
    { to: '/reports/ar-aging', title: t.reports.arAging, desc: t.reports.arAgingDesc },
    { to: '/reports/ap-aging', title: t.reports.apAging, desc: t.reports.apAgingDesc },
```

(The `Link to={r.to}` is typed against the route tree, so this compiles only after Step 3's regeneration — expected.)

- [ ] **Step 2: Create the two route files**

(Match the existing 7a/7b reports route files, e.g. `src/app/routes/_app/reports.balance-sheet.tsx`, for the exact `createFileRoute` id format.)

`src/app/routes/_app/reports.ar-aging.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { AgingPage } from '@/features/reports/AgingPage';

export const Route = createFileRoute('/_app/reports/ar-aging')({
  component: () => <AgingPage kind="AR" />,
});
```

`src/app/routes/_app/reports.ap-aging.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { AgingPage } from '@/features/reports/AgingPage';

export const Route = createFileRoute('/_app/reports/ap-aging')({
  component: () => <AgingPage kind="AP" />,
});
```

- [ ] **Step 3: Regenerate the route tree**

The new routes must be written into `src/routeTree.gen.ts` (by the `@tanstack/router-plugin` Vite plugin) before `tsc` accepts the two new typed `Link`s. Start the dev server in the background to regenerate, poll, then stop:

Start `pnpm dev` in the background. Poll with: `grep -q "reports/ar-aging" src/routeTree.gen.ts && echo REGENERATED` — wait until it prints REGENERATED (a few seconds). Then STOP the dev server. Verify: `grep -c "reports/ar-aging\|reports/ap-aging" src/routeTree.gen.ts` prints ≥ 2.

- [ ] **Step 4: Full verification**

Run: `pnpm test --run` — expect all green (~195: 192 prior + 3 new = schema 1, AgingPage 2).
Run: `pnpm lint` — expect 0 errors (pre-existing react-compiler/react-hook-form warnings acceptable; introduce no NEW errors).
Run: `pnpm build` — expect success (`tsc -b && vite build`; tsc now accepts the typed `/reports/ar-aging` + `/reports/ap-aging` routes).

If `pnpm build` fails at `tsc` over an unknown `/reports/ar-aging` or `/reports/ap-aging` route, the tree wasn't regenerated — repeat Step 3 and rebuild.

- [ ] **Step 5: Dev smoke (optional)**

`pnpm dev`, log in (creds in `.env`), open `/reports` → seven cards now (the 5 prior + Umur Piutang + Umur Utang); open Umur Piutang, change `asOf`, click a partner row → its documents appear below; open Umur Utang and confirm it loads the AP data with the Vendor label. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/features/reports/ReportsIndexPage.tsx src/app/routes/_app/reports.ar-aging.tsx src/app/routes/_app/reports.ap-aging.tsx src/routeTree.gen.ts
git commit -m "feat(reports): AR/AP aging routes and landing cards"
```

---

## Done Criteria

- `/reports` lists seven report cards (the 7a/7b five + Umur Piutang + Umur Utang).
- **Aging:** an as-of control, a partner×bucket summary table (Pelanggan/Vendor · Lancar · 1-30 · 31-60 · 61-90 · >90 · Total, zero-suppressed) with a `totalsByBucket` + `totalOutstanding` footer. Clicking a partner reveals its open documents (Ref · Tanggal · Jatuh Tempo · Total · Dibayar · Outstanding · Umur) below. AR and AP are the same page parameterized by `kind` (title + partner label + endpoint switch).
- Page tested standalone; route wiring lives in the thin route files. All tests pass (~195); lint clean; build green.

## Out of Scope (YAGNI)

True inline-accordion expansion, CSV/PDF export, a partner filter, custom bucket boundaries, document → source invoice/bill drill-through, clickable partner → ledger. **This is the final report slice** — after it the `/reports` area is complete (six reports). The roadmap then moves to periods + year-end close, audit log, and company settings.

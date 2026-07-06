import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useJournalPreview } from './useJournalPreview';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// POST /journal-entries/preview (nature PAYMENT): read-only dry run of the journal
// a payment would post. Distinct path from the CRUD at /ledger/journal-entries.
it('posts the PAYMENT preview body and returns the balanced lines', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let body: Record<string, unknown> | null = null;
  server.use(
    http.post(`${API}/journal-entries/preview`, async ({ request }) => {
      body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        lines: [
          { accountId: 'a1', accountCode: '1-1000', accountName: 'Kas', debit: '500000.0000', credit: '0.0000' },
          { accountId: 'ar', accountCode: '1-1200', accountName: 'Piutang Usaha', debit: '0.0000', credit: '500000.0000' },
        ],
      });
    }),
  );
  const { result } = renderHook(
    () =>
      useJournalPreview({
        direction: 'RECEIPT',
        cashAccountId: 'a1',
        date: '2026-06-16',
        allocations: [{ salesInvoiceId: 'i1', amount: '500000.0000' }],
      }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.data?.lines).toHaveLength(2));
  expect(body).toMatchObject({
    nature: 'PAYMENT',
    direction: 'RECEIPT',
    cashAccountId: 'a1',
    date: '2026-06-16',
    allocations: [{ salesInvoiceId: 'i1', amount: '500000.0000' }],
  });
  expect(result.current.data?.lines[0]).toMatchObject({ accountCode: '1-1000', debit: '500000.0000' });
});

it('does not fetch without a cash account or allocations', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let hit = false;
  server.use(http.post(`${API}/journal-entries/preview`, () => { hit = true; return HttpResponse.json({ lines: [] }); }));
  renderHook(() => useJournalPreview({ direction: 'RECEIPT', cashAccountId: '', date: '', allocations: [] }), { wrapper });
  await new Promise((r) => setTimeout(r, 500));
  expect(hit).toBe(false);
});

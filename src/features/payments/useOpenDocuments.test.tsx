import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useOpenDocuments } from './useOpenDocuments';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const invoice = (over: Record<string, unknown>) => ({
  id: 'x', invoiceNumber: 1, invoiceRef: 'INV/1', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z',
  dueDate: null, description: null, status: 'POSTED', subtotal: '0.0000', taxTotal: '0.0000',
  withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000',
  paymentStatus: 'UNPAID', lines: [], ...over,
});
const bill = (over: Record<string, unknown>) => ({
  id: 'y', billNumber: 1, billRef: 'BILL/1', partnerId: 'v1', date: '2026-06-15T00:00:00.000Z',
  dueDate: null, description: null, status: 'POSTED', subtotal: '0.0000', taxTotal: '0.0000',
  withholdingTotal: '0.0000', total: '1000000.0000', amountPaid: '0.0000', outstanding: '1000000.0000',
  paymentStatus: 'UNPAID', lines: [], ...over,
});

// The server filters by status/partner (?status=POSTED&partnerId=…), so open
// documents are found even when the partner's invoices sit beyond the first 200
// rows of the unfiltered list. outstanding>0 stays client-side (no server param).
it('RECEIPT → queries POSTED invoices for the partner server-side, filters outstanding>0', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let seen: URLSearchParams | null = null;
  const invoicesData = [
    invoice({ id: 'open', partnerId: 'p1' }),
    invoice({ id: 'paid', partnerId: 'p1', outstanding: '0.0000' }),
  ];
  server.use(
    http.get(`${API}/sales-invoices`, ({ request }) => {
      seen = new URL(request.url).searchParams;
      return HttpResponse.json({ data: invoicesData, total: invoicesData.length, limit: 200, offset: 0 });
    }),
    http.get(`${API}/purchase-bills`, () => HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 })),
  );
  const { result } = renderHook(() => useOpenDocuments('RECEIPT', 'p1'), { wrapper });
  await waitFor(() => expect(result.current.map((d) => d.id)).toEqual(['open']));
  expect(result.current[0]).toMatchObject({ ref: 'INV/1', outstanding: '1110000.0000' });
  expect(seen!.get('status')).toBe('POSTED');
  expect(seen!.get('partnerId')).toBe('p1');
});

it('does not fetch until a partner is selected', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let hit = false;
  server.use(
    http.get(`${API}/sales-invoices`, () => { hit = true; return HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 }); }),
  );
  const { result } = renderHook(() => useOpenDocuments('RECEIPT', undefined), { wrapper });
  expect(result.current).toEqual([]);
  await new Promise((r) => setTimeout(r, 50));
  expect(hit).toBe(false);
});

it('DISBURSEMENT → queries POSTED bills for the partner server-side', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  let seen: URLSearchParams | null = null;
  const billsData = [
    bill({ id: 'openb', partnerId: 'v1' }),
    bill({ id: 'paidb', partnerId: 'v1', outstanding: '0.0000' }),
  ];
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 })),
    http.get(`${API}/purchase-bills`, ({ request }) => {
      seen = new URL(request.url).searchParams;
      return HttpResponse.json({ data: billsData, total: billsData.length, limit: 200, offset: 0 });
    }),
  );
  const { result } = renderHook(() => useOpenDocuments('DISBURSEMENT', 'v1'), { wrapper });
  await waitFor(() => expect(result.current.map((d) => d.id)).toEqual(['openb']));
  expect(result.current[0]).toMatchObject({ ref: 'BILL/1', outstanding: '1000000.0000' });
  expect(seen!.get('status')).toBe('POSTED');
  expect(seen!.get('partnerId')).toBe('v1');
});

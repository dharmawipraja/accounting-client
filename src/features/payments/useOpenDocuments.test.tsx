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

it('RECEIPT → open POSTED invoices for the partner, mapped', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  const invoicesData = [
    invoice({ id: 'open', partnerId: 'p1' }),
    invoice({ id: 'draft', partnerId: 'p1', status: 'DRAFT' }),
    invoice({ id: 'paid', partnerId: 'p1', outstanding: '0.0000' }),
    invoice({ id: 'other', partnerId: 'p2' }),
  ];
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: invoicesData, total: invoicesData.length, limit: 200, offset: 0 })),
    http.get(`${API}/purchase-bills`, () => HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 })),
  );
  const { result } = renderHook(() => useOpenDocuments('RECEIPT', 'p1'), { wrapper });
  await waitFor(() => expect(result.current.map((d) => d.id)).toEqual(['open']));
  expect(result.current[0]).toMatchObject({ ref: 'INV/1', outstanding: '1110000.0000' });
});

it('DISBURSEMENT → open POSTED bills for the partner, mapped', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  const billsData = [
    bill({ id: 'openb', partnerId: 'v1' }),
    bill({ id: 'draftb', partnerId: 'v1', status: 'DRAFT' }),
    bill({ id: 'paidb', partnerId: 'v1', outstanding: '0.0000' }),
    bill({ id: 'otherb', partnerId: 'v2' }),
  ];
  server.use(
    http.get(`${API}/sales-invoices`, () => HttpResponse.json({ data: [], total: 0, limit: 200, offset: 0 })),
    http.get(`${API}/purchase-bills`, () => HttpResponse.json({ data: billsData, total: billsData.length, limit: 200, offset: 0 })),
  );
  const { result } = renderHook(() => useOpenDocuments('DISBURSEMENT', 'v1'), { wrapper });
  await waitFor(() => expect(result.current.map((d) => d.id)).toEqual(['openb']));
  expect(result.current[0]).toMatchObject({ ref: 'BILL/1', outstanding: '1000000.0000' });
});

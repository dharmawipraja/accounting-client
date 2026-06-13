import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useOpenInvoices } from './useOpenInvoices';

afterEach(() => useSession.getState().clear());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const base = (over: Record<string, unknown>) => ({
  id: 'x', invoiceNumber: 1, invoiceRef: 'INV/1', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z',
  dueDate: null, description: null, status: 'POSTED', subtotal: '0.0000', taxTotal: '0.0000',
  withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000',
  paymentStatus: 'UNPAID', lines: [], ...over,
});

it('returns only POSTED, outstanding>0 invoices for the partner', async () => {
  useSession.getState().setTokens({ accessToken: 'a', refreshToken: 'b' });
  server.use(http.get(`${API}/sales-invoices`, () => HttpResponse.json([
    base({ id: 'open', partnerId: 'p1' }),                         // ✓
    base({ id: 'draft', partnerId: 'p1', status: 'DRAFT' }),       // ✗ not posted
    base({ id: 'paid', partnerId: 'p1', outstanding: '0.0000' }),  // ✗ nothing outstanding
    base({ id: 'other', partnerId: 'p2' }),                        // ✗ other partner
  ])));
  const { result } = renderHook(() => useOpenInvoices('p1'), { wrapper });
  await waitFor(() => expect(result.current.map((i) => i.id)).toEqual(['open']));
});

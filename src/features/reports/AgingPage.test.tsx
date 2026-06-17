import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
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
  renderWithRouter(<AgingPage kind={kind} />);
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
  expect(await screen.findByText('Umur Utang')).toBeInTheDocument(); // title (immediate)
  expect(await screen.findByText('Vendor')).toBeInTheDocument(); // partner-column header (after data)
  expect(called).toBe(true);
});

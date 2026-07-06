import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { inRouter } from '@/test/utils';
import { useSession } from '@/stores/session';
import { OverdueReceivablesCard } from './OverdueReceivablesCard';

afterEach(() => useSession.getState().clear());

function renderCard(asOf: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{inRouter(<OverdueReceivablesCard asOf={asOf} />)}</QueryClientProvider>);
}

const buckets = (over: Record<string, string>) => ({ Current: '0.0000', '1-30': '0.0000', '31-60': '0.0000', '61-90': '0.0000', '>90': '0.0000', ...over });

it('shows the overdue total (all non-Current buckets) and links to AR aging', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(http.get(`${API}/reports/ar-aging`, () =>
    HttpResponse.json({
      kind: 'AR', asOf: '2026-07-06', partners: [],
      totalsByBucket: buckets({ Current: '2000000.0000', '31-60': '500000.0000', '>90': '250000.0000' }),
      totalOutstanding: '2750000.0000', truncated: false,
    })));
  renderCard('2026-07-06');
  // overdue = 500.000 + 250.000 = 750.000 (Current 2.000.000 excluded)
  expect(await screen.findByText('Rp 750.000')).toBeInTheDocument();
  expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining('/reports/ar-aging'));
});

it('renders nothing when there is no overdue receivable', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(http.get(`${API}/reports/ar-aging`, () =>
    HttpResponse.json({ kind: 'AR', asOf: '2026-07-06', partners: [], totalsByBucket: buckets({ Current: '1000000.0000' }), totalOutstanding: '1000000.0000', truncated: false })));
  const { container } = renderCard('2026-07-06');
  await waitFor(() => expect(container.querySelector('a')).toBeNull());
  expect(screen.queryByText(/jatuh tempo/i)).not.toBeInTheDocument();
});

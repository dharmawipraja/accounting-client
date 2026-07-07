import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { TaxCodeMultiSelect } from './TaxCodeMultiSelect';

afterEach(() => useSession.getState().clear());

function renderMS(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const codes = [
  { id: 'out', code: 'PPN-OUT-11', name: 'PPN Keluaran', kind: 'PPN_OUTPUT', rate: '0.11', taxAccountId: 'a', isActive: true },
  { id: 'inp', code: 'PPN-IN-11', name: 'PPN Masukan', kind: 'PPN_INPUT', rate: '0.11', taxAccountId: 'a', isActive: true },
  { id: 'pre', code: 'PPH23-PRE', name: 'PPh Prepaid', kind: 'PPH_PREPAID', rate: '0.02', taxAccountId: 'a', isActive: true },
];

it('offers only allowed kinds and toggles selection by id', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN', mustChangePassword: false });
  server.use(http.get(`${API}/tax/codes`, () => HttpResponse.json(paged(codes))));
  const onChange = vi.fn();
  renderMS(<TaxCodeMultiSelect value={[]} onChange={onChange} allowedKinds={['PPN_OUTPUT', 'PPH_PREPAID']} aria-label="Pajak" />);
  await user.click(screen.getByRole('combobox', { name: /pajak/i }));
  expect(await screen.findByRole('option', { name: /PPN-OUT-11/i })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /PPH23-PRE/i })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /PPN-IN-11/i })).not.toBeInTheDocument(); // PPN_INPUT excluded
  await user.click(screen.getByRole('option', { name: /PPN-OUT-11/i }));
  expect(onChange).toHaveBeenCalledWith(['out']);
});

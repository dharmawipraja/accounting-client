import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { expect, it, afterEach } from 'vitest';
import { server } from '@/test/server';
import { inRouter } from '@/test/utils';
import { useSession } from '@/stores/session';
import { PaymentEditorPage } from './PaymentEditorPage';

afterEach(() => useSession.getState().clear());

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{inRouter(ui)}</QueryClientProvider>);
}

// The API has no payment update endpoint (create / post / void / delete only),
// so an existing payment must always open read-only — even while DRAFT.
it('renders an existing draft payment read-only with the recreate hint', async () => {
  server.resetHandlers();
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  renderPage(<PaymentEditorPage id="pay1" />);

  expect(await screen.findByText(/tidak dapat diubah/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /simpan/i })).not.toBeInTheDocument();
  expect(screen.getByLabelText(/tanggal/i)).toBeDisabled();
});

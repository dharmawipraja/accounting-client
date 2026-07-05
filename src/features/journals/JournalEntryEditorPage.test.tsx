import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { inRouter } from '@/test/utils';
import { id as messages } from '@/lib/i18n/messages.id';
import { useSession } from '@/stores/session';
import { JournalEntryEditorPage } from './JournalEntryEditorPage';

afterEach(() => useSession.getState().clear());

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{inRouter(ui)}</QueryClientProvider>);
}

// Journal creation is ACCOUNTANT/APPROVER/ADMIN per the role matrix; a VIEWER
// navigating to /journals/new by URL must not get a live form.
it('create mode shows forbidden (no form) to a VIEWER', async () => {
  useSession.getState().setUser({ id: 'u2', email: 'v@b.c', role: 'VIEWER' });
  renderPage(<JournalEntryEditorPage />);
  expect(await screen.findByText(messages.roles.forbidden)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /simpan/i })).not.toBeInTheDocument();
});

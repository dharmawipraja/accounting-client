import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API, auditFixtures } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { AuditPage } from './AuditPage';

afterEach(() => useSession.getState().clear());

function renderPage(role: 'ADMIN' | 'VIEWER' = 'ADMIN') {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><AuditPage /></QueryClientProvider>);
}

it('ADMIN: lists entries + status badges; a row opens the detail Sheet with the body JSON; prev disabled at offset 0', async () => {
  renderPage('ADMIN');
  expect(await screen.findByText('/auth/login')).toBeInTheDocument();
  expect(screen.getByText('/ledger/periods/p1/close')).toBeInTheDocument();
  expect(screen.getByText('401')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sebelumnya' })).toBeDisabled();
  const user = userEvent.setup();
  await user.click(screen.getByText('/auth/login'));
  const sheet = await screen.findByRole('dialog');
  expect(within(sheet).getByText(/REDACTED/)).toBeInTheDocument();
});

it('ADMIN: Berikutnya advances the offset when a full page returns', async () => {
  let seenOffset: string | null = null;
  const fullPage = Array.from({ length: 50 }, (_, i) => ({ ...auditFixtures()[0], id: `a${i}` }));
  server.use(http.get(`${API}/audit`, ({ request }) => {
    seenOffset = new URL(request.url).searchParams.get('offset');
    return HttpResponse.json(fullPage);
  }));
  renderPage('ADMIN');
  await screen.findAllByText('/ledger/periods/p1/close');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Berikutnya' }));
  await waitFor(() => expect(seenOffset).toBe('50'));
});

it('VIEWER: sees the forbidden notice and does not fetch', async () => {
  let called = false;
  server.use(http.get(`${API}/audit`, () => { called = true; return HttpResponse.json([]); }));
  renderPage('VIEWER');
  expect(await screen.findByText(/tidak memiliki izin/i)).toBeInTheDocument();
  await new Promise((r) => setTimeout(r, 150));
  expect(called).toBe(false);
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { API, companySettingsFixture } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { SettingsPage } from './SettingsPage';

afterEach(() => useSession.getState().clear());

function renderPage(role: 'ADMIN' | 'VIEWER' = 'ADMIN') {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}><SettingsPage /></QueryClientProvider>);
}

it('ADMIN: form populates; editing Legal Name + Simpan PATCHes the new value', async () => {
  let patched: Record<string, unknown> | null = null;
  server.use(
    http.get(`${API}/company/settings`, () => HttpResponse.json(companySettingsFixture())),
    http.patch(`${API}/company/settings`, async ({ request }) => { patched = (await request.json()) as Record<string, unknown>; return HttpResponse.json({ ...companySettingsFixture(), ...patched }); }),
  );
  renderPage('ADMIN');
  const legal = await screen.findByLabelText('Nama Resmi');
  expect(legal).toHaveValue('My Company');
  const user = userEvent.setup();
  await user.clear(legal);
  await user.type(legal, 'PT Baru');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(patched).toMatchObject({ legalName: 'PT Baru' }));
});

it('ADMIN: turning SoD off + Simpan asks for confirmation then PATCHes false', async () => {
  let patched: Record<string, unknown> | null = null;
  server.use(
    http.get(`${API}/company/settings`, () => HttpResponse.json(companySettingsFixture())),
    http.patch(`${API}/company/settings`, async ({ request }) => { patched = (await request.json()) as Record<string, unknown>; return HttpResponse.json({ ...companySettingsFixture(), ...patched }); }),
  );
  renderPage('ADMIN');
  await screen.findByLabelText('Nama Resmi');
  const user = userEvent.setup();
  await user.click(screen.getByRole('switch', { name: 'Segregasi Tugas' }));
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(patched).toMatchObject({ segregationOfDutiesEnabled: false }));
});

it('VIEWER: fields disabled, no Simpan button, admin-only note', async () => {
  server.use(http.get(`${API}/company/settings`, () => HttpResponse.json(companySettingsFixture())));
  renderPage('VIEWER');
  expect(await screen.findByLabelText('Nama Resmi')).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Simpan' })).not.toBeInTheDocument();
  expect(screen.getByText(/hanya admin/i)).toBeInTheDocument();
});

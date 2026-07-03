import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it } from 'vitest';
import { z } from 'zod';
import { renderWithRouter } from '@/test/renderWithRouter';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { StatementReportPage, type StatementReportConfig } from './StatementReportPage';

afterEach(() => useSession.getState().clear());

const schema = z.object({ value: z.string() });
type Data = z.infer<typeof schema>;

const baseConfig = (over: Partial<StatementReportConfig<Data>> = {}): StatementReportConfig<Data> => ({
  title: 'Laporan Uji',
  path: '/reports/_stmt_test',
  schema,
  mode: 'asOf',
  buildRows: (d) => [{ label: 'Nilai', amount: d.value }],
  ...over,
});

it('asOf mode: renders the title + statement row and fetches with an asOf param only', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let seen: URLSearchParams | null = null;
  server.use(http.get(`${API}/reports/_stmt_test`, ({ request }) => {
    seen = new URL(request.url).searchParams;
    return HttpResponse.json({ value: '123000.0000' });
  }));
  renderWithRouter(<StatementReportPage config={baseConfig()} />);
  expect(await screen.findByText('Nilai')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Laporan Uji' })).toBeInTheDocument();
  await waitFor(() => expect(seen?.get('asOf')).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  expect(seen!.get('from')).toBeNull();
});

it('range mode: fetches with from + to params', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  let seen: URLSearchParams | null = null;
  server.use(http.get(`${API}/reports/_stmt_test`, ({ request }) => {
    seen = new URL(request.url).searchParams;
    return HttpResponse.json({ value: '5000.0000' });
  }));
  renderWithRouter(<StatementReportPage config={baseConfig({ mode: 'range' })} />);
  expect(await screen.findByText('Nilai')).toBeInTheDocument();
  await waitFor(() => expect(seen?.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  expect(seen!.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

it('renders the optional footer below the statement', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(http.get(`${API}/reports/_stmt_test`, () => HttpResponse.json({ value: '1.0000' })));
  renderWithRouter(<StatementReportPage config={baseConfig({ footer: (d) => <span>{`footer:${d.value}`}</span> })} />);
  expect(await screen.findByText('footer:1.0000')).toBeInTheDocument();
});

import { useQuery, QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { id as messages } from '@/lib/i18n/messages.id';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { useDocumentAction } from '@/lib/crud/useDocumentAction';
import { salesInvoicesApi } from '@/features/sales-invoices/hooks';
import { DocumentListPage } from './DocumentListPage';
import type { DocumentListConfig, PageEnvelope } from './useDocumentListController';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => useSession.getState().clear());

type Doc = { id: string; name: string; status: string };
const col = createColumnHelper<Doc>();

// A real list hook over a synthetic endpoint, so QueryState + Pagination behave realistically.
const useDocs = (q: Record<string, string | number | undefined>): UseQueryResult<PageEnvelope<Doc>, ApiError> =>
  useQuery({ queryKey: ['test-docs', q], queryFn: () => apiFetch('/test-docs', { query: q }) }) as UseQueryResult<PageEnvelope<Doc>, ApiError>;

// thin local hooks pointing the action endpoints at /test-docs/:id/{post} via the real useDocumentAction shape
const usePostInvoiceLike = () => useDocumentAction({ key: 'test-docs', basePath: '/test-docs', action: 'post' });
const useRemoveLike = () => salesInvoicesApi.useRemove();

function useTestConfig(): DocumentListConfig<Doc> {
  // mutations come from the real sales-invoices hooks so we exercise the live POST + idempotency path
  // (the synthetic /test-docs/:id/post handler stands in for the resource).
  const post = usePostInvoiceLike();
  const del = useRemoveLike();
  return {
    title: 'Dokumen Uji',
    colCount: 3,
    list: useDocs,
    columns: (h) => [
      col.accessor('name', { header: 'Nama', cell: (c) => c.getValue() }),
      col.accessor('status', { header: 'Status', cell: (c) => c.getValue() }),
      col.display({ id: 'a', header: '', cell: (c) => (
        <div>
          <button onClick={() => h.onDelete!(c.row.original)}>Hapus</button>
          <button onClick={() => h.onPost!(c.row.original)}>Posting</button>
        </div>
      ) }),
    ],
    actions: {
      delete: { mutation: del, success: messages.crud.deleted, confirm: { title: messages.crud.confirmDeleteTitle, label: messages.common.delete } },
      post: { mutation: post, success: 'Diposting', confirm: { title: 'Posting?', label: 'Posting' } },
    },
    filters: [{ param: 'status', options: [
      { value: 'ALL', label: 'Semua' }, { value: 'DRAFT', label: 'Draf' }, { value: 'POSTED', label: 'Diposting' },
    ] }],
    search: { predicate: (d, q) => d.name.toLowerCase().includes(q) },
    newControl: <a href="/new">Baru</a>,
  };
}

function Harness() {
  return <DocumentListPage config={useTestConfig()} />;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Harness /></QueryClientProvider>);
}

const docs = [
  { id: 'd1', name: 'Alpha', status: 'DRAFT' },
  { id: 'd2', name: 'Beta', status: 'POSTED' },
];

it('renders the title, role-gated New control, rows, and pagination label', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(http.get(`${API}/test-docs`, () => HttpResponse.json({ data: docs, total: 2, limit: 20, offset: 0 })));
  renderPage();
  expect(await screen.findByText('Alpha')).toBeInTheDocument();
  expect(screen.getByText('Dokumen Uji')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Baru' })).toBeInTheDocument();
  expect(screen.getByText(/menampilkan 1.+2 dari 2/i)).toBeInTheDocument();
});

it('hides the New control for VIEWER', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  server.use(http.get(`${API}/test-docs`, () => HttpResponse.json({ data: docs, total: 2, limit: 20, offset: 0 })));
  renderPage();
  await screen.findByText('Alpha');
  expect(screen.queryByRole('link', { name: 'Baru' })).not.toBeInTheDocument();
});

it('posts after confirm and sends an idempotency key', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let seenKey: string | null = null;
  server.use(
    http.get(`${API}/test-docs`, () => HttpResponse.json({ data: [docs[0]], total: 1, limit: 20, offset: 0 })),
    http.post(`${API}/test-docs/d1/post`, ({ request }) => { seenKey = request.headers.get('Idempotency-Key'); return HttpResponse.json({}); }),
  );
  renderPage();
  await screen.findByText('Alpha');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(seenKey).toBeTruthy());
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Diposting'));
});

it('routes a 403 SoD post error through toastApiError', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(
    http.get(`${API}/test-docs`, () => HttpResponse.json({ data: [docs[0]], total: 1, limit: 20, offset: 0 })),
    http.post(`${API}/test-docs/d1/post`, () => HttpResponse.json({ code: 'SEGREGATION_OF_DUTIES', message: 'x' }, { status: 403 })),
  );
  renderPage();
  await screen.findByText('Alpha');
  await user.click(screen.getByRole('button', { name: 'Posting' }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Posting' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(messages.roles.segregationOfDuties));
});

it('resets offset to 0 when a status filter is clicked', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  let lastQuery: URLSearchParams | null = null;
  server.use(http.get(`${API}/test-docs`, ({ request }) => {
    lastQuery = new URL(request.url).searchParams;
    return HttpResponse.json({ data: docs, total: 30, limit: 20, offset: Number(lastQuery.get('offset') ?? '0') });
  }));
  renderPage();
  await screen.findByText('Alpha');
  await user.click(screen.getByRole('button', { name: /berikutnya/i })); // offset → 20
  await waitFor(() => expect(lastQuery?.get('offset')).toBe('20'));
  await user.click(screen.getByRole('button', { name: 'Draf' }));        // filter → offset 0 + status=DRAFT
  await waitFor(() => expect(lastQuery?.get('offset')).toBe('0'));
  expect(lastQuery!.get('status')).toBe('DRAFT');
});

it('applies page-scoped search over the loaded page', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  server.use(http.get(`${API}/test-docs`, () => HttpResponse.json({ data: docs, total: 2, limit: 20, offset: 0 })));
  renderPage();
  await screen.findByText('Alpha');
  await user.type(screen.getByPlaceholderText(messages.common.search), 'beta');
  await waitFor(() => expect(screen.queryByText('Alpha')).not.toBeInTheDocument());
  expect(screen.getByText('Beta')).toBeInTheDocument();
});

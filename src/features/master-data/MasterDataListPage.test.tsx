import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { z } from 'zod';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { id as messages } from '@/lib/i18n/messages.id';
import { createMasterDataHooks, createResourceKeys } from '@/lib/crud/createResourceHooks';
import { MasterDataListPage } from './MasterDataListPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(() => useSession.getState().clear());

// ---- synthetic mdtest resource ----
const mdItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  isActive: z.boolean(),
});
type MdItem = z.infer<typeof mdItemSchema>;

const mdApi = createMasterDataHooks<MdItem>({
  keys: createResourceKeys('mdtest'),
  basePath: '/mdtest',
  itemSchema: mdItemSchema,
  paginated: true,
});

const col = createColumnHelper<MdItem>();

const fixtures: MdItem[] = [
  { id: 'm1', code: 'A-001', name: 'Alpha', isActive: true },
  { id: 'm2', code: 'B-002', name: 'Beta', isActive: false },
];

function Harness() {
  const activate = mdApi.useActivate();
  const deactivate = mdApi.useDeactivate();
  const remove = mdApi.useRemove();
  return (
    <MasterDataListPage<MdItem>
      title="Master Data Uji"
      usePagedList={mdApi.usePagedList}
      actions={{ activate, deactivate, remove }}
      columns={(h) => [
        col.accessor('code', { header: 'Kode' }),
        col.accessor('name', { header: 'Nama' }),
        col.display({
          id: 'actions',
          header: '',
          cell: (c) => (
            <div>
              <button onClick={() => h.onToggleActive(c.row.original)}>Toggle</button>
              <button onClick={() => h.onDelete(c.row.original)}>Hapus</button>
            </div>
          ),
        }),
      ]}
      formDialog={(p) => (
        p.open ? <div role="dialog" aria-label="form">{p.mode}</div> : null
      )}
    />
  );
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Harness /></QueryClientProvider>);
}

// ---- MSW handlers ----
function pagedHandler(data: MdItem[]) {
  return http.get(`${API}/mdtest`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const offset = Number(url.searchParams.get('offset') ?? '0');
    return HttpResponse.json({ data: data.slice(offset, offset + limit), total: data.length, limit, offset });
  });
}

// 1. Typing in search resets offset to 0
it('typing in search resets offset to 0', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });

  // 25 items so page 2 is reachable
  const manyItems: MdItem[] = Array.from({ length: 25 }, (_, i) => ({
    id: `m${i}`, code: `CODE-${i}`, name: `Item ${i}`, isActive: true,
  }));

  let lastOffset: string | null = null;
  server.use(
    http.get(`${API}/mdtest`, ({ request }) => {
      const url = new URL(request.url);
      lastOffset = url.searchParams.get('offset');
      const limit = Number(url.searchParams.get('limit') ?? '20');
      const offset = Number(url.searchParams.get('offset') ?? '0');
      return HttpResponse.json({ data: manyItems.slice(offset, offset + limit), total: manyItems.length, limit, offset });
    }),
  );

  renderPage();
  await screen.findByText('Item 0');

  // advance to page 2
  await user.click(screen.getByRole('button', { name: /berikutnya/i }));
  await waitFor(() => expect(lastOffset).toBe('20'));

  // type in search — offset should reset to 0
  await user.type(screen.getByPlaceholderText(messages.common.search), 'x');
  await waitFor(() => expect(lastOffset).toBe('0'));
});

// 1b. Search spans the whole dataset, not just the current page
it('search finds a record that is not on the current page', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });

  const manyItems: MdItem[] = Array.from({ length: 25 }, (_, i) => ({
    id: `m${i}`, code: `CODE-${i}`, name: `Item ${i}`, isActive: true,
  }));
  server.use(pagedHandler(manyItems));

  renderPage();
  await screen.findByText('Item 0');

  // advance to page 2 — "Item 3" (page 1) is no longer visible
  await user.click(screen.getByRole('button', { name: /berikutnya/i }));
  await waitFor(() => expect(screen.queryByText('Item 3')).not.toBeInTheDocument());

  // searching still finds it (fetches the whole set and filters client-side)
  await user.type(screen.getByPlaceholderText(messages.common.search), 'Item 3');
  expect(await screen.findByText('Item 3')).toBeInTheDocument();
});

// 2. Toggling active row opens deactivate confirm → confirming calls deactivate + success toast
it('toggling active row opens deactivate confirm and calls deactivate on confirm', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });

  let deactivateCalled = false;
  server.use(
    pagedHandler(fixtures),
    http.post(`${API}/mdtest/m1/deactivate`, () => {
      deactivateCalled = true;
      return HttpResponse.json({});
    }),
  );

  renderPage();
  await screen.findByText('Alpha');

  // Click Toggle on the active row (m1 — Alpha)
  const rows = screen.getAllByRole('row');
  const alphaRow = rows.find((r) => within(r).queryByText('Alpha'));
  await user.click(within(alphaRow!).getByRole('button', { name: 'Toggle' }));

  // Confirm dialog should open with deactivate title
  const dialog = await screen.findByRole('alertdialog');
  expect(within(dialog).getByText(messages.crud.confirmDeactivateTitle)).toBeInTheDocument();

  // Click confirm
  await user.click(within(dialog).getByRole('button', { name: messages.crud.deactivate }));

  await waitFor(() => expect(deactivateCalled).toBe(true));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith(messages.crud.deactivated));
});

// 3. Toggling inactive row activates immediately with no dialog
it('toggling inactive row activates immediately without a confirm dialog', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });

  let activateCalled = false;
  server.use(
    pagedHandler(fixtures),
    http.patch(`${API}/mdtest/m2`, () => {
      activateCalled = true;
      return HttpResponse.json({ ...fixtures[1], isActive: true });
    }),
  );

  renderPage();
  await screen.findByText('Beta');

  // Click Toggle on the inactive row (m2 — Beta)
  const rows = screen.getAllByRole('row');
  const betaRow = rows.find((r) => within(r).queryByText('Beta'));
  await user.click(within(betaRow!).getByRole('button', { name: 'Toggle' }));

  // No dialog should appear
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

  await waitFor(() => expect(activateCalled).toBe(true));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith(messages.crud.activated));
});

// 4. Delete opens destructive confirm with the delete title
it('delete opens destructive confirm dialog with the delete title', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });

  server.use(pagedHandler(fixtures));

  renderPage();
  await screen.findByText('Alpha');

  const rows = screen.getAllByRole('row');
  const alphaRow = rows.find((r) => within(r).queryByText('Alpha'));
  await user.click(within(alphaRow!).getByRole('button', { name: 'Hapus' }));

  const dialog = await screen.findByRole('alertdialog');
  expect(within(dialog).getByText(messages.crud.confirmDeleteTitle)).toBeInTheDocument();
  // Confirm button should use the delete label
  expect(within(dialog).getByRole('button', { name: messages.common.delete })).toBeInTheDocument();
});

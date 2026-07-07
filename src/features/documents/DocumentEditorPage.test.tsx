import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { UseQueryResult } from '@tanstack/react-query';
import { renderWithRouter } from '@/test/renderWithRouter';
import { id as messages } from '@/lib/i18n/messages.id';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/stores/session';
import { DocumentEditorPage, type DocumentEditorPageConfig } from './DocumentEditorPage';

// Document mutations are ACCOUNTANT/APPROVER/ADMIN per the role matrix; the page
// itself re-checks the role (defense-in-depth beyond hiding the nav links).
beforeEach(() => useSession.getState().setUser({ id: 'u1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false }));
// Unmount BEFORE clearing the session: clearing drops the token, which flips
// useRoleReady() true with a null role, re-rendering a still-mounted plain-render
// (routerless) test into the forbidden branch — whose breadcrumb <Link> then
// throws "Cannot read properties of null (reading 'isServer')". cleanup() first
// tears the tree down so the store change reaches nothing.
afterEach(() => { cleanup(); useSession.getState().clear(); });

type Doc = { id: string; status: string };

// The module reads only these fields off the query, so a hand-crafted result is
// deterministic and needs no QueryClient/MSW.
function fakeQuery(over: Partial<UseQueryResult<Doc, ApiError>>): UseQueryResult<Doc, ApiError> {
  return {
    isPending: false,
    isError: false,
    fetchStatus: 'idle',
    data: undefined,
    error: null,
    refetch: vi.fn(),
    ...over,
  } as unknown as UseQueryResult<Doc, ApiError>;
}

function makeConfig(query: UseQueryResult<Doc, ApiError>, onDone = vi.fn()): DocumentEditorPageConfig<Doc> {
  return {
    useItem: () => query,
    onDone,
    parent: { to: '/sales-invoices', label: 'kembali' },
    titles: { create: 'Buat Dokumen', edit: 'Ubah Dokumen', view: 'Lihat Dokumen' },
    renderForm: ({ mode, readOnly, doc }) => <div>{`form:${mode}:${String(readOnly)}:${doc?.id ?? 'none'}`}</div>,
  };
}

// The header/breadcrumb branches render a TanStack <Link>, so they need a router
// (and an async first query, since RouterProvider mounts on the next tick). The
// loading / not-found / error branches render no Link, so plain render() suffices.

it('create mode (no id) renders the create title + breadcrumb and the form without consulting the query', async () => {
  renderWithRouter(<DocumentEditorPage config={makeConfig(fakeQuery({}))} />);
  expect(await screen.findByRole('heading', { name: 'Buat Dokumen' })).toBeInTheDocument();
  expect(screen.getByText('form:create:false:none')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'kembali' })).toBeInTheDocument();
});

it('edit mode shows a loading skeleton while the item is fetching', () => {
  const { container } = render(
    <DocumentEditorPage config={makeConfig(fakeQuery({ isPending: true, fetchStatus: 'fetching' }))} id="d1" />,
  );
  expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
});

it('edit mode renders record-not-found on a 404 and wires back-to-list to onDone', async () => {
  const user = userEvent.setup();
  const onDone = vi.fn();
  const q = fakeQuery({ isError: true, error: new ApiError({ status: 404, code: 'NOT_FOUND', message: 'x' }) });
  render(<DocumentEditorPage config={makeConfig(q, onDone)} id="d1" />);
  const back = screen.getByRole('button', { name: messages.notFound.backToList });
  await user.click(back);
  expect(onDone).toHaveBeenCalledTimes(1);
});

it('edit mode on a DRAFT doc renders the edit title and an editable form', async () => {
  renderWithRouter(<DocumentEditorPage config={makeConfig(fakeQuery({ data: { id: 'd1', status: 'DRAFT' } }))} id="d1" />);
  expect(await screen.findByRole('heading', { name: 'Ubah Dokumen' })).toBeInTheDocument();
  expect(screen.getByText('form:edit:false:d1')).toBeInTheDocument();
});

it('edit mode on a POSTED doc renders the view title and a read-only form', async () => {
  renderWithRouter(<DocumentEditorPage config={makeConfig(fakeQuery({ data: { id: 'd1', status: 'POSTED' } }))} id="d1" />);
  expect(await screen.findByRole('heading', { name: 'Lihat Dokumen' })).toBeInTheDocument();
  expect(screen.getByText('form:edit:true:d1')).toBeInTheDocument();
});

// While /auth/me is still hydrating (token present, user null), the role is
// UNKNOWN — render the loading skeleton, never a premature "forbidden".
it('create mode shows a skeleton (not forbidden) while the role is unhydrated', () => {
  useSession.getState().clear();
  useSession.getState().setTokens({ accessToken: 'tok', refreshToken: 'r' });
  const { container } = render(<DocumentEditorPage config={makeConfig(fakeQuery({}))} />);
  expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  expect(screen.queryByText(messages.roles.forbidden)).not.toBeInTheDocument();
  expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
});

it('create mode shows forbidden (no form) to a VIEWER', async () => {
  useSession.getState().setUser({ id: 'u2', email: 'v@b.c', role: 'VIEWER', mustChangePassword: false });
  renderWithRouter(<DocumentEditorPage config={makeConfig(fakeQuery({}))} />);
  expect(await screen.findByText(messages.roles.forbidden)).toBeInTheDocument();
  expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
});

it('edit mode on a DRAFT doc is read-only for a VIEWER', async () => {
  useSession.getState().setUser({ id: 'u2', email: 'v@b.c', role: 'VIEWER', mustChangePassword: false });
  renderWithRouter(<DocumentEditorPage config={makeConfig(fakeQuery({ data: { id: 'd1', status: 'DRAFT' } }))} id="d1" />);
  expect(await screen.findByRole('heading', { name: 'Lihat Dokumen' })).toBeInTheDocument();
  expect(screen.getByText('form:edit:true:d1')).toBeInTheDocument();
});

// Duplicate: with duplicateFromId (and no id), fetch the source doc and render a
// CREATE-mode form pre-filled from it — a new draft, not an edit of the source.
it('duplicate mode prefills a create form from the source document', async () => {
  const source = fakeQuery({ data: { id: 'src1', status: 'POSTED' } });
  renderWithRouter(<DocumentEditorPage config={makeConfig(source)} duplicateFromId="src1" />);
  expect(await screen.findByRole('heading', { name: 'Buat Dokumen' })).toBeInTheDocument();
  // create mode, editable, prefilled from src1
  expect(screen.getByText('form:create:false:src1')).toBeInTheDocument();
});

it('edit mode on a non-404 error falls through to the error state (not notFound, not data)', () => {
  const q = fakeQuery({ isError: true, error: new ApiError({ status: 500, code: 'SERVER', message: 'x' }) });
  render(<DocumentEditorPage config={makeConfig(q)} id="d1" />);
  expect(screen.queryByRole('button', { name: messages.notFound.backToList })).not.toBeInTheDocument();
  expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { UseQueryResult } from '@tanstack/react-query';
import { id as messages } from '@/lib/i18n/messages.id';
import { ApiError } from '@/lib/api/errors';
import { DocumentEditorPage, type DocumentEditorPageConfig } from './DocumentEditorPage';

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
    back: <span>kembali</span>,
    titles: { create: 'Buat Dokumen', edit: 'Ubah Dokumen', view: 'Lihat Dokumen' },
    renderForm: ({ mode, readOnly }) => <div>{`form:${mode}:${String(readOnly)}`}</div>,
  };
}

it('create mode (no id) renders the create title and form without consulting the query', () => {
  render(<DocumentEditorPage config={makeConfig(fakeQuery({}))} />);
  expect(screen.getByText('Buat Dokumen')).toBeInTheDocument();
  expect(screen.getByText('form:create:false')).toBeInTheDocument();
  expect(screen.getByText('kembali')).toBeInTheDocument();
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

it('edit mode on a DRAFT doc renders the edit title and an editable form', () => {
  render(<DocumentEditorPage config={makeConfig(fakeQuery({ data: { id: 'd1', status: 'DRAFT' } }))} id="d1" />);
  expect(screen.getByText('Ubah Dokumen')).toBeInTheDocument();
  expect(screen.getByText('form:edit:false')).toBeInTheDocument();
});

it('edit mode on a POSTED doc renders the view title and a read-only form', () => {
  render(<DocumentEditorPage config={makeConfig(fakeQuery({ data: { id: 'd1', status: 'POSTED' } }))} id="d1" />);
  expect(screen.getByText('Lihat Dokumen')).toBeInTheDocument();
  expect(screen.getByText('form:edit:true')).toBeInTheDocument();
});

it('edit mode on a non-404 error falls through to the error state (not notFound, not data)', () => {
  const q = fakeQuery({ isError: true, error: new ApiError({ status: 500, code: 'SERVER', message: 'x' }) });
  render(<DocumentEditorPage config={makeConfig(q)} id="d1" />);
  expect(screen.queryByRole('button', { name: messages.notFound.backToList })).not.toBeInTheDocument();
  expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
});

import { render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { id as messages } from '@/lib/i18n/messages.id';
import { useSession } from '@/stores/session';
import { DataTable } from '@/components/common/DataTable';
import { documentStatusLabel } from './statusLabel';
import { docStatusColumn, paymentStatusColumn, documentActionsColumn } from './documentColumns';

afterEach(() => useSession.getState().clear());

type Doc = { id: string; status: string; paymentStatus: string | null };

const labels = { edit: 'Ubah', view: 'Lihat', delete: 'Hapus', post: 'Posting', void: 'Batalkan' };
const noop = () => {};

it('docStatusColumn renders the DocStatusChip with the POSTED label', () => {
  render(
    <DataTable
      columns={[docStatusColumn<Doc>('status', 'Status', messages)]}
      data={[{ id: 'd1', status: 'POSTED', paymentStatus: null }]}
    />,
  );
  expect(screen.getByText(documentStatusLabel(messages, 'POSTED'))).toBeInTheDocument();
});

it('paymentStatusColumn shows the paid chip and an em-dash when null', () => {
  render(
    <DataTable
      columns={[paymentStatusColumn<Doc>('paymentStatus', 'Bayar', messages)]}
      data={[
        { id: 'd1', status: 'POSTED', paymentStatus: 'PAID' },
        { id: 'd2', status: 'DRAFT', paymentStatus: null },
      ]}
    />,
  );
  expect(screen.getByText(messages.documents.paid)).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '—' })).toBeInTheDocument();
});

it('documentActionsColumn shows edit/delete/post on a DRAFT row for an authorized role', () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN', mustChangePassword: false });
  const col = documentActionsColumn<Doc>({
    renderOpenLink: (d, label) => <a href={`/x/${d.id}`}>{label}</a>,
    onPost: noop,
    onVoid: noop,
    onDelete: noop,
    labels,
  });
  render(<DataTable columns={[col]} data={[{ id: 'd1', status: 'DRAFT', paymentStatus: null }]} />);
  expect(screen.getByText('Ubah')).toBeInTheDocument();
  expect(screen.getByText('Hapus')).toBeInTheDocument();
  expect(screen.getByText('Posting')).toBeInTheDocument();
  expect(screen.queryByText('Batalkan')).not.toBeInTheDocument();
});

it('documentActionsColumn shows a Duplicate link (when provided) on any status, role-gated', () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  const col = documentActionsColumn<Doc>({
    renderOpenLink: (d, label) => <a href={`/x/${d.id}`}>{label}</a>,
    renderDuplicateLink: (d, label) => <a href={`/new?from=${d.id}`}>{label}</a>,
    onPost: noop, onVoid: noop, onDelete: noop,
    labels: { ...labels, duplicate: 'Duplikat' },
  });
  render(<DataTable columns={[col]} data={[{ id: 'd9', status: 'POSTED', paymentStatus: 'PAID' }]} />);
  const dup = screen.getByRole('link', { name: 'Duplikat' });
  expect(dup).toHaveAttribute('href', '/new?from=d9');
});

it('documentActionsColumn hides the Duplicate link from a VIEWER', () => {
  useSession.getState().setUser({ id: '1', email: 'v@b.c', role: 'VIEWER', mustChangePassword: false });
  const col = documentActionsColumn<Doc>({
    renderOpenLink: (d, label) => <a href={`/x/${d.id}`}>{label}</a>,
    renderDuplicateLink: (d, label) => <a href={`/new?from=${d.id}`}>{label}</a>,
    onPost: noop, onVoid: noop, onDelete: noop,
    labels: { ...labels, duplicate: 'Duplikat' },
  });
  render(<DataTable columns={[col]} data={[{ id: 'd9', status: 'POSTED', paymentStatus: 'PAID' }]} />);
  expect(screen.queryByRole('link', { name: 'Duplikat' })).not.toBeInTheDocument();
});

it('documentActionsColumn shows view + void on a POSTED row', () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN', mustChangePassword: false });
  const col = documentActionsColumn<Doc>({
    renderOpenLink: (d, label) => <a href={`/x/${d.id}`}>{label}</a>,
    onPost: noop,
    onVoid: noop,
    onDelete: noop,
    labels,
  });
  render(<DataTable columns={[col]} data={[{ id: 'd1', status: 'POSTED', paymentStatus: null }]} />);
  expect(screen.getByText('Lihat')).toBeInTheDocument();
  expect(screen.getByText('Batalkan')).toBeInTheDocument();
  expect(screen.queryByText('Posting')).not.toBeInTheDocument();
  expect(screen.queryByText('Ubah')).not.toBeInTheDocument();
});

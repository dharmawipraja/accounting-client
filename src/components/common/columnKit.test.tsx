import { render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { id as messages } from '@/lib/i18n/messages.id';
import { useSession } from '@/stores/session';
import { DataTable } from './DataTable';
import {
  textColumn,
  dateColumn,
  moneyColumn,
  moneyDisplayColumn,
  activeStatusColumn,
  masterActionsColumn,
} from './columnKit';

afterEach(() => useSession.getState().clear());

type Row = { id: string; ref: string | null; date: string; total: string; isActive: boolean };
const rows: Row[] = [{ id: 'r1', ref: null, date: '2026-07-02T10:00:00Z', total: '1500000.0000', isActive: true }];

it('textColumn falls back to an em-dash for nullish values', () => {
  render(<DataTable columns={[textColumn<Row>('ref', 'Ref')]} data={rows} />);
  expect(screen.getByRole('cell', { name: '—' })).toBeInTheDocument();
});

it('dateColumn formats the first 10 chars of an ISO string', () => {
  render(<DataTable columns={[dateColumn<Row>('date', 'Tanggal')]} data={rows} />);
  expect(screen.getByText(/2026/)).toBeInTheDocument();
});

it('moneyColumn renders rupiah and right-aligns the header + cell', () => {
  render(<DataTable columns={[moneyColumn<Row>('total', 'Total')]} data={rows} />);
  expect(screen.getByRole('columnheader', { name: 'Total' })).toHaveClass('text-right');
  const cell = screen.getByRole('cell');
  expect(cell).toHaveClass('text-right');
  expect(cell.textContent).toMatch(/1\.500\.000/);
});

it('moneyDisplayColumn computes the amount from the row and right-aligns', () => {
  render(<DataTable columns={[moneyDisplayColumn<Row>('amt', 'Jumlah', (r) => r.total)]} data={rows} />);
  const cell = screen.getByRole('cell');
  expect(cell).toHaveClass('text-right');
  expect(cell.textContent).toMatch(/1\.500\.000/);
});

it('activeStatusColumn shows the active chip', () => {
  render(<DataTable columns={[activeStatusColumn<Row>(messages.crud.status)]} data={rows} />);
  expect(screen.getByText(messages.crud.active)).toBeInTheDocument();
});

it('masterActionsColumn renders the actions menu for an authorized role', () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN', mustChangePassword: false });
  const noop = () => {};
  render(
    <DataTable columns={[masterActionsColumn<Row>({ onEdit: noop, onToggleActive: noop, onDelete: noop })]} data={rows} />,
  );
  expect(screen.getByRole('button', { name: messages.common.actions })).toBeInTheDocument();
});

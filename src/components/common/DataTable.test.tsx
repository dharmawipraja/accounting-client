import { createColumnHelper } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { DataTable } from './DataTable';

type Row = { code: string; name: string };
const col = createColumnHelper<Row>();
const columns = [
  col.accessor('code', { header: 'Kode' }),
  col.accessor('name', { header: 'Nama' }),
];

it('renders headers and rows', () => {
  render(<DataTable columns={columns} data={[{ code: '1-1000', name: 'Kas' }]} />);
  expect(screen.getByText('Kode')).toBeInTheDocument();
  expect(screen.getByText('1-1000')).toBeInTheDocument();
  expect(screen.getByText('Kas')).toBeInTheDocument();
});

it('shows an empty state when there are no rows', () => {
  render(<DataTable columns={columns} data={[]} />);
  expect(screen.getByText(/tidak ada data/i)).toBeInTheDocument();
});

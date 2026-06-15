import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TableCell, TableRow } from '@/components/ui/table';
import { ReportTable, MoneyCell, type ReportColumn } from './ReportTable';

interface Row { code: string; debit: string; }
const columns: ReportColumn<Row>[] = [
  { header: 'Kode', cell: (r) => r.code },
  { header: 'Debit', align: 'right', cell: (r) => <MoneyCell value={r.debit} /> },
];

it('renders headers, a row per item, and footer; zero money is blank', () => {
  render(
    <ReportTable<Row>
      columns={columns}
      rows={[{ code: '1-1000', debit: '500000.0000' }, { code: '1-2000', debit: '0.0000' }]}
      footer={<TableRow><TableCell colSpan={2}>Total</TableCell></TableRow>}
    />,
  );
  expect(screen.getByText('Kode')).toBeInTheDocument();
  expect(screen.getByText('1-1000')).toBeInTheDocument();
  expect(screen.getByText('Total')).toBeInTheDocument();
  expect(screen.getByText(/Rp\s?500\.000/)).toBeInTheDocument();
  expect(screen.queryByText(/Rp\s?0/)).not.toBeInTheDocument(); // zero debit suppressed
});

it('fires onRowClick with the clicked row', () => {
  const onRowClick = vi.fn();
  render(<ReportTable<Row> columns={columns} rows={[{ code: '1-1000', debit: '500000.0000' }]} onRowClick={onRowClick} />);
  fireEvent.click(screen.getByText('1-1000'));
  expect(onRowClick).toHaveBeenCalledWith({ code: '1-1000', debit: '500000.0000' });
});

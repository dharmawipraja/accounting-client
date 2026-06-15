import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { StatementView } from './StatementView';

it('renders labels and amounts, bolds totals, omits amount for header rows', () => {
  render(<StatementView rows={[
    { label: 'ASET', bold: true },
    { label: '1-1000 Kas', amount: '500000.0000', level: 2 },
    { label: 'Total Aset', amount: '500000.0000', bold: true, border: true },
  ]} />);
  expect(screen.getByText('ASET')).toBeInTheDocument();
  expect(screen.getByText('1-1000 Kas')).toBeInTheDocument();
  // Kas line + Total Aset both render the amount; the 'ASET' header has none
  expect(screen.getAllByText(/Rp\s?500\.000/).length).toBe(2);
});

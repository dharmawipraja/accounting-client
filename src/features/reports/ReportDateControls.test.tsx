import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ReportDateControls } from './ReportDateControls';

it('asOf mode fires onAsOf', () => {
  const onAsOf = vi.fn();
  render(<ReportDateControls mode="asOf" asOf="2026-06-30" onAsOf={onAsOf} />);
  fireEvent.change(screen.getByLabelText(/per tanggal/i), { target: { value: '2026-05-31' } });
  expect(onAsOf).toHaveBeenCalledWith('2026-05-31');
});

it('range mode fires onRange and shows the invalid hint when from > to', () => {
  const onRange = vi.fn();
  render(<ReportDateControls mode="range" from="2026-07-01" to="2026-06-30" onRange={onRange} />);
  expect(screen.getByText(/harus sebelum/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Dari'), { target: { value: '2026-01-01' } });
  expect(onRange).toHaveBeenCalledWith('2026-01-01', '2026-06-30');
});

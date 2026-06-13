import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { SummaryCard } from './SummaryCard';

it('renders title and value', () => {
  render(<SummaryCard title="Total Aset" value="Rp 1.500.000" />);
  expect(screen.getByText('Total Aset')).toBeInTheDocument();
  expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
});

it('shows a skeleton while loading and hides the value', () => {
  render(<SummaryCard title="Total Aset" value="Rp 1.500.000" loading />);
  expect(screen.queryByText('Rp 1.500.000')).not.toBeInTheDocument();
});

it('shows an error with a retry that fires onRetry', async () => {
  const user = userEvent.setup();
  const onRetry = vi.fn();
  render(<SummaryCard title="Kas Akhir" value="" error onRetry={onRetry} />);
  expect(screen.getByText(/gagal memuat/i)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /coba lagi/i }));
  expect(onRetry).toHaveBeenCalledOnce();
});

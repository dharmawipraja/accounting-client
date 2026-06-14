import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

it('shows the range and disables Prev on the first page', () => {
  render(<Pagination offset={0} limit={20} total={25} onChange={vi.fn()} />);
  expect(screen.getByText(/Menampilkan 1–20 dari 25/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sebelumnya/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /berikutnya/i })).toBeEnabled();
});

it('Next advances the offset by the limit', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Pagination offset={0} limit={20} total={25} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: /berikutnya/i }));
  expect(onChange).toHaveBeenCalledWith(20);
});

it('disables Next on the last page', () => {
  render(<Pagination offset={20} limit={20} total={25} onChange={vi.fn()} />);
  expect(screen.getByRole('button', { name: /berikutnya/i })).toBeDisabled();
});

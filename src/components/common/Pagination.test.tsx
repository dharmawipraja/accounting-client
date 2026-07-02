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

it('count mode: shows no range label and disables Next on a short page', () => {
  render(<Pagination offset={0} limit={20} count={12} onChange={vi.fn()} />);
  expect(screen.queryByText(/Menampilkan/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sebelumnya/i })).toBeDisabled(); // offset 0
  expect(screen.getByRole('button', { name: /berikutnya/i })).toBeDisabled(); // 12 < 20 → last page
});

it('count mode: Next is enabled on a full page and advances by the limit', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Pagination offset={0} limit={20} count={20} onChange={onChange} />);
  const next = screen.getByRole('button', { name: /berikutnya/i });
  expect(next).toBeEnabled(); // full page → there may be more
  await user.click(next);
  expect(onChange).toHaveBeenCalledWith(20);
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { id as messages } from '@/lib/i18n/messages.id';
import type { ApiError } from '@/lib/api/errors';
import { EntitySelect, EntityMultiSelect, type EntitySelectAdapter } from './EntitySelect';

type Item = { id: string; code: string; name: string; active: boolean };
const items: Item[] = [
  { id: '2', code: 'B-2', name: 'Beta', active: true },
  { id: '1', code: 'A-1', name: 'Alpha', active: true },
  { id: '3', code: 'C-3', name: 'Gamma', active: false },
];

function fakeQuery(over: Partial<UseQueryResult<Item[], ApiError>>): UseQueryResult<Item[], ApiError> {
  return { data: undefined, isLoading: false, isError: false, error: null, ...over } as unknown as UseQueryResult<Item[], ApiError>;
}

const adapter = (q: UseQueryResult<Item[], ApiError>): EntitySelectAdapter<Item> => ({
  useList: () => q,
  getValue: (i) => i.id,
  getLabel: (i) => `${i.code} — ${i.name}`,
  getSearchText: (i) => `${i.code} ${i.name}`,
  filter: (i) => i.active,
});

it('single: lists filtered + code-sorted options and selects by id, closing the popover', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  const onChange = vi.fn();
  render(<EntitySelect adapter={adapter(fakeQuery({ data: items }))} onChange={onChange} aria-label="Pilih" placeholder="Pilih" />);
  await user.click(screen.getByRole('combobox', { name: 'Pilih' }));
  const opts = await screen.findAllByRole('option');
  expect(opts.map((o) => o.textContent)).toEqual([
    expect.stringMatching(/A-1 — Alpha/),
    expect.stringMatching(/B-2 — Beta/),
  ]); // active only (Gamma excluded), sorted by code
  expect(screen.queryByRole('option', { name: /Gamma/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole('option', { name: /A-1 — Alpha/ }));
  expect(onChange).toHaveBeenCalledWith('1');
});

it('single: shows the selected label in the trigger', () => {
  render(<EntitySelect adapter={adapter(fakeQuery({ data: items }))} value="2" onChange={vi.fn()} aria-label="Pilih" />);
  expect(screen.getByRole('combobox', { name: 'Pilih' })).toHaveTextContent('B-2 — Beta');
});

it('distinguishes loading and error from no-data in the empty state', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  const { rerender } = render(<EntitySelect adapter={adapter(fakeQuery({ isLoading: true }))} onChange={vi.fn()} aria-label="Pilih" />);
  await user.click(screen.getByRole('combobox'));
  expect(await screen.findByText(messages.common.loading)).toBeInTheDocument();
  rerender(<EntitySelect adapter={adapter(fakeQuery({ isError: true }))} onChange={vi.fn()} aria-label="Pilih" />);
  expect(screen.getByText(messages.common.error)).toBeInTheDocument();
  rerender(<EntitySelect adapter={adapter(fakeQuery({ data: [] }))} onChange={vi.fn()} aria-label="Pilih" />);
  expect(screen.getByText(messages.common.noData)).toBeInTheDocument();
});

it('multi: toggles ids without replacing, and shows a chip per selection', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  const onChange = vi.fn();
  render(
    <EntityMultiSelect
      adapter={adapter(fakeQuery({ data: items }))}
      value={['2']}
      onChange={onChange}
      getChipLabel={(i) => i.code}
      aria-label="Pajak"
    />,
  );
  expect(screen.getByText('B-2')).toBeInTheDocument(); // chip = code only
  await user.click(screen.getByRole('combobox', { name: 'Pajak' }));
  await user.click(await screen.findByRole('option', { name: /A-1 — Alpha/ }));
  expect(onChange).toHaveBeenCalledWith(['2', '1']); // added, not replaced
});

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { DashboardFilters } from './DashboardFilters';
import { computePeriod } from './period';

const today = new Date(2026, 5, 13);

it('calls onSelectPreset when a preset button is clicked', async () => {
  const user = userEvent.setup();
  const onSelectPreset = vi.fn();
  render(<DashboardFilters period={computePeriod('year', today)} onSelectPreset={onSelectPreset} onCustomChange={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: 'Bulan Ini' }));
  expect(onSelectPreset).toHaveBeenCalledWith('month');
});

it('shows custom date inputs and reports changes to from', () => {
  const onCustomChange = vi.fn();
  render(
    <DashboardFilters
      period={{ preset: 'custom', from: '2026-01-01', to: '2026-06-13' }}
      onSelectPreset={vi.fn()}
      onCustomChange={onCustomChange}
    />,
  );
  fireEvent.change(screen.getByLabelText('Dari'), { target: { value: '2026-03-01' } });
  expect(onCustomChange).toHaveBeenCalledWith('2026-03-01', '2026-06-13');
});

it('shows the invalid-range hint when from > to', () => {
  render(
    <DashboardFilters
      period={{ preset: 'custom', from: '2026-07-01', to: '2026-06-13' }}
      onSelectPreset={vi.fn()}
      onCustomChange={vi.fn()}
    />,
  );
  expect(screen.getByText(/harus sebelum/i)).toBeInTheDocument();
});

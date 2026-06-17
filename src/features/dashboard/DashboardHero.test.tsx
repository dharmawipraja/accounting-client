import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { DashboardHero } from './DashboardHero';

it('renders the financial-position label and the three figures', () => {
  render(<DashboardHero assets="1500000.0000" liabilities="600000.0000" equity="900000.0000" asOf="per 13 Jun 2026" />);
  expect(screen.getByText(id.dashboard.financialPosition)).toBeInTheDocument();
  expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
  expect(screen.getByText('Rp 600.000')).toBeInTheDocument();
  expect(screen.getByText('Rp 900.000')).toBeInTheDocument();
});

it('shows skeletons (no figures) while loading', () => {
  render(<DashboardHero loading />);
  expect(screen.getByText(id.dashboard.financialPosition)).toBeInTheDocument();
  expect(screen.queryByText('Rp 1.500.000')).not.toBeInTheDocument();
});

it('shows a retry button on error and calls onRetry', async () => {
  const onRetry = vi.fn();
  render(<DashboardHero error onRetry={onRetry} />);
  await userEvent.click(screen.getByRole('button', { name: id.dashboard.retry }));
  expect(onRetry).toHaveBeenCalledOnce();
});

import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { DocStatusChip, JournalStatusChip, PeriodStatusChip, DirectionChip } from './statusChips';
import { StatusBadge } from './StatusBadge';

const variantOf = (c: HTMLElement) => c.querySelector('[data-slot="badge"]')?.getAttribute('data-variant');

it('DocStatusChip: POSTED=success, VOID=destructive, DRAFT=secondary', () => {
  expect(variantOf(render(<DocStatusChip status="POSTED" label="P" />).container)).toBe('success');
  expect(variantOf(render(<DocStatusChip status="VOID" label="V" />).container)).toBe('destructive');
  expect(variantOf(render(<DocStatusChip status="DRAFT" label="D" />).container)).toBe('secondary');
});

it('JournalStatusChip: REVERSED is neutral with its own label', () => {
  const { container } = render(<JournalStatusChip status="REVERSED" t={id} />);
  expect(screen.getByText(id.journals.statusReversed)).toBeInTheDocument();
  expect(variantOf(container)).toBe('secondary');
});

it('PeriodStatusChip: open=success, closed=secondary', () => {
  expect(variantOf(render(<PeriodStatusChip closed={false} t={id} />).container)).toBe('success');
  expect(screen.getByText(id.periods.open)).toBeInTheDocument();
  expect(variantOf(render(<PeriodStatusChip closed t={id} />).container)).toBe('secondary');
});

it('DirectionChip: both directions are info', () => {
  expect(variantOf(render(<DirectionChip direction="RECEIPT" t={id} />).container)).toBe('info');
  expect(variantOf(render(<DirectionChip direction="DISBURSEMENT" t={id} />).container)).toBe('info');
});

it('StatusBadge: active=success, inactive=secondary', () => {
  expect(variantOf(render(<StatusBadge active />).container)).toBe('success');
  expect(variantOf(render(<StatusBadge active={false} />).container)).toBe('secondary');
});

import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SkeletonTable } from './SkeletonTable';
import { SkeletonForm } from './SkeletonForm';
import { SkeletonCards } from './SkeletonCards';

const count = (c: HTMLElement) => c.querySelectorAll('[data-slot="skeleton"]').length;

it('SkeletonTable renders header + rows × cols skeletons', () => {
  const { container } = render(<SkeletonTable rows={3} cols={4} />);
  // header row (4) + 3 body rows × 4 = 16
  expect(count(container)).toBe(16);
});

it('SkeletonForm renders a label+input per field plus a submit bar', () => {
  const { container } = render(<SkeletonForm fields={5} />);
  // 5 × 2 + 1 = 11
  expect(count(container)).toBe(11);
});

it('SkeletonCards renders the requested number of cards', () => {
  const { container } = render(<SkeletonCards count={4} />);
  expect(container.querySelectorAll('[data-testid="skeleton-card"]').length).toBe(4);
});

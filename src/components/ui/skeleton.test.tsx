import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Skeleton } from './skeleton';

it('uses the shimmer animation by default', () => {
  const { container } = render(<Skeleton className="h-4 w-10" />);
  const el = container.querySelector('[data-slot="skeleton"]')!;
  expect(el).toHaveClass('animate-shimmer');
  expect(el).toHaveClass('h-4');
});

it('uses pulse when variant="pulse"', () => {
  const { container } = render(<Skeleton variant="pulse" />);
  const el = container.querySelector('[data-slot="skeleton"]')!;
  expect(el).toHaveClass('animate-pulse');
  expect(el).not.toHaveClass('animate-shimmer');
});

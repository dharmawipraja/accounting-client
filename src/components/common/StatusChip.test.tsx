import { render, screen } from '@testing-library/react';
import { CheckCircle2 } from 'lucide-react';
import { expect, it } from 'vitest';
import { StatusChip } from './StatusChip';

it('renders the label text and an icon', () => {
  const { container } = render(<StatusChip tone="success" icon={CheckCircle2} label="Lunas" />);
  expect(screen.getByText('Lunas')).toBeInTheDocument();
  expect(container.querySelector('svg')).toBeInTheDocument();
});

it('maps tone to the matching badge variant', () => {
  const cases = [
    ['success', 'success'], ['warning', 'warning'], ['error', 'destructive'],
    ['neutral', 'secondary'], ['info', 'info'],
  ] as const;
  for (const [tone, variant] of cases) {
    const { container, unmount } = render(<StatusChip tone={tone} icon={CheckCircle2} label="x" />);
    expect(container.querySelector('[data-slot="badge"]')).toHaveAttribute('data-variant', variant);
    unmount();
  }
});

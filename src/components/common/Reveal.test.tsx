import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Reveal } from './Reveal';

it('renders its children', () => {
  render(<Reveal><p>revealed</p></Reveal>);
  expect(screen.getByText('revealed')).toBeInTheDocument();
});

it('passes className through to the wrapper', () => {
  const { container } = render(<Reveal className="grid"><span>x</span></Reveal>);
  expect(container.firstChild).toHaveClass('grid');
});

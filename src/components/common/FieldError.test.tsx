import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { FieldError } from './FieldError';

it('renders an alert with the message', () => {
  render(<FieldError message="Wajib diisi" />);
  const el = screen.getByRole('alert');
  expect(el).toHaveTextContent('Wajib diisi');
  expect(el).toHaveClass('text-destructive');
});

it('renders nothing when the message is empty, null, or undefined', () => {
  const { container: a } = render(<FieldError message={undefined} />);
  const { container: b } = render(<FieldError message={null} />);
  const { container: c } = render(<FieldError message="" />);
  expect(a).toBeEmptyDOMElement();
  expect(b).toBeEmptyDOMElement();
  expect(c).toBeEmptyDOMElement();
});

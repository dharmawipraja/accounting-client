import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ReadOnlyBanner } from './ReadOnlyBanner';

it('renders nothing when show is false', () => {
  const { container } = render(
    <ReadOnlyBanner show={false} status="POSTED" docRef="INV-1" postedLabel="Terkunci diposting" voidLabel="Dibatalkan" />,
  );
  expect(container).toBeEmptyDOMElement();
});

it('shows the posted label and the doc-ref suffix', () => {
  render(<ReadOnlyBanner show status="POSTED" docRef="INV-1" postedLabel="Terkunci diposting" voidLabel="Dibatalkan" />);
  expect(screen.getByText(/Terkunci diposting/)).toBeInTheDocument();
  expect(screen.getByText(/\(INV-1\)/)).toBeInTheDocument();
});

it('shows the void label and omits the suffix when there is no ref', () => {
  render(<ReadOnlyBanner show status="VOID" docRef={null} postedLabel="Terkunci diposting" voidLabel="Dibatalkan" />);
  expect(screen.getByText('Dibatalkan')).toBeInTheDocument();
  expect(screen.queryByText(/\(/)).not.toBeInTheDocument();
});

import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

it('renders the title heading', () => {
  render(<PageHeader title="Judul" />);
  expect(screen.getByRole('heading', { name: 'Judul' })).toBeInTheDocument();
});

it('renders the back slot when provided', () => {
  render(<PageHeader title="Judul" back={<a href="/x">Kembali</a>} />);
  expect(screen.getByRole('link', { name: 'Kembali' })).toBeInTheDocument();
});

it('renders no link when back is omitted', () => {
  render(<PageHeader title="Judul" />);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

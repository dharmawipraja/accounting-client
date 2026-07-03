import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { PageHeader } from './PageHeader';

it('renders the title heading', () => {
  render(<PageHeader title="Judul" />);
  expect(screen.getByRole('heading', { name: 'Judul' })).toBeInTheDocument();
});

it('renders a breadcrumb trail to the parent when provided', async () => {
  renderWithRouter(<PageHeader title="Judul" parent={{ to: '/reports', label: 'Laporan' }} />);
  const link = await screen.findByRole('link', { name: 'Laporan' });
  expect(link).toHaveAttribute('href', '/reports');
});

it('renders no breadcrumb link when parent is omitted', () => {
  render(<PageHeader title="Judul" />);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

import { screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { BackLink } from './BackLink';

it('renders the label and an icon, linking to the parent route', async () => {
  renderWithRouter(<BackLink to="/sales-invoices" label="Faktur Penjualan" />);
  const link = await screen.findByRole('link', { name: 'Faktur Penjualan' });
  expect(link).toHaveAttribute('href', '/sales-invoices');
  expect(link.querySelector('svg')).toBeInTheDocument();
});

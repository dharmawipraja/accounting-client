import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { NotFound } from './NotFound';

it('renders the default 404 page copy', () => {
  render(<NotFound action={<a href="/dashboard">back</a>} />);
  expect(screen.getByText('404')).toBeInTheDocument();
  expect(screen.getByText(id.notFound.pageTitle)).toBeInTheDocument();
  expect(screen.getByText(id.notFound.pageMessage)).toBeInTheDocument();
});

it('renders overridden record-not-found copy', () => {
  render(
    <NotFound
      title={id.notFound.recordTitle}
      message={id.notFound.recordMessage}
      action={<a href="/x">back</a>}
    />,
  );
  expect(screen.getByText(id.notFound.recordTitle)).toBeInTheDocument();
});

import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { id } from '@/lib/i18n/messages.id';
import { AppErrorBoundary } from './AppErrorBoundary';

function Boom(): never {
  throw new Error('render crash');
}

it('renders FatalError when a child throws', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <AppErrorBoundary>
      <Boom />
    </AppErrorBoundary>,
  );
  expect(screen.getByText(id.errors.fatalTitle)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: id.errors.reload })).toBeInTheDocument();
  spy.mockRestore();
});

it('renders children when nothing throws', () => {
  render(
    <AppErrorBoundary>
      <p>safe content</p>
    </AppErrorBoundary>,
  );
  expect(screen.getByText('safe content')).toBeInTheDocument();
});

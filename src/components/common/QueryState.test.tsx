import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import { id } from '@/lib/i18n/messages.id';
import { QueryState } from './QueryState';

// Minimal stand-in for a query result; cast through unknown.
const q = (over: Record<string, unknown>) =>
  ({ isPending: false, isError: false, data: undefined, error: null, refetch: vi.fn(), ...over }) as unknown as UseQueryResult<{ name: string }, ApiError>;

it('renders the loading node while pending', () => {
  render(
    <QueryState query={q({ isPending: true })} loading={<p>loading…</p>}>
      {(d) => <p>{d.name}</p>}
    </QueryState>,
  );
  expect(screen.getByText('loading…')).toBeInTheDocument();
});

it('renders children with data when resolved', () => {
  render(
    <QueryState query={q({ data: { name: 'Budi' } })} loading={<p>loading…</p>}>
      {(d) => <p>{d.name}</p>}
    </QueryState>,
  );
  expect(screen.getByText('Budi')).toBeInTheDocument();
});

it('renders ErrorState on error', () => {
  const error = new ApiError({ status: 500, code: 'X', message: 'no' });
  render(
    <QueryState query={q({ isError: true, error })} loading={<p>loading…</p>}>
      {() => <p>data</p>}
    </QueryState>,
  );
  expect(screen.getByText(id.errors.server.title)).toBeInTheDocument();
});

it('renders the notFound node when error is an ApiError 404 and notFound is given', () => {
  const error = new ApiError({ status: 404, code: 'NOT_FOUND', message: 'no' });
  render(
    <QueryState query={q({ isError: true, error })} loading={<p>l</p>} notFound={<p>missing</p>}>
      {() => <p>data</p>}
    </QueryState>,
  );
  expect(screen.getByText('missing')).toBeInTheDocument();
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { id } from '@/lib/i18n/messages.id';
import { ErrorState } from './ErrorState';

it('shows friendly per-type copy + traceId, and a working retry for retryable errors', async () => {
  const onRetry = vi.fn();
  const err = new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Boom', traceId: 'trace-7' });
  render(<ErrorState error={err} onRetry={onRetry} />);
  expect(screen.getByText(id.errors.server.title)).toBeInTheDocument();
  expect(screen.getByText(/trace-7/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: id.errors.retry }));
  expect(onRetry).toHaveBeenCalledOnce();
});

it('hides retry for non-retryable errors (403)', () => {
  const err = new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' });
  render(<ErrorState error={err} onRetry={vi.fn()} />);
  expect(screen.getByText(id.errors.forbidden.title)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: id.errors.retry })).not.toBeInTheDocument();
});

it('hides retry when no onRetry is provided', () => {
  const err = new ApiError({ status: 500, code: 'X', message: 'no' });
  render(<ErrorState error={err} />);
  expect(screen.queryByRole('button', { name: id.errors.retry })).not.toBeInTheDocument();
});

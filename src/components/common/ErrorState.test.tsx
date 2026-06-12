import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { ErrorState } from './ErrorState';

it('shows the message and the traceId reference', () => {
  const err = new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Boom', traceId: 'trace-7' });
  render(<ErrorState error={err} />);
  expect(screen.getByText('Boom')).toBeInTheDocument();
  expect(screen.getByText(/trace-7/)).toBeInTheDocument();
});

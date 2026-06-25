import { expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { id } from '@/lib/i18n/messages.id';
import { describeError } from './describeError';

const apiErr = (status: number, traceId?: string) =>
  new ApiError({ status, code: 'X', message: 'raw backend message', traceId });

it('maps 500 to the server copy with retry and passes traceId', () => {
  const d = describeError(apiErr(503, 'trace-9'), id);
  expect(d.kind).toBe('server');
  expect(d.title).toBe(id.errors.server.title);
  expect(d.showRetry).toBe(true);
  expect(d.traceId).toBe('trace-9');
});

it('maps 403 to forbidden with no retry', () => {
  const d = describeError(apiErr(403), id);
  expect(d.kind).toBe('forbidden');
  expect(d.showRetry).toBe(false);
});

it('maps 404 to notFound with no retry', () => {
  expect(describeError(apiErr(404), id).kind).toBe('notFound');
  expect(describeError(apiErr(404), id).showRetry).toBe(false);
});

it('maps 422 to validation with no retry', () => {
  expect(describeError(apiErr(422), id).kind).toBe('validation');
});

it('falls back to generic (with retry) for a non-ApiError', () => {
  const d = describeError(new Error('boom'), id);
  expect(d.kind).toBe('generic');
  expect(d.title).toBe(id.errors.generic.title);
  expect(d.showRetry).toBe(true);
});

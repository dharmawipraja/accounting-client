import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { shouldRetryQuery } from './client';

// Deterministic 4xx failures (403 SoD, 404, 422) fail identically on retry —
// retrying them only delays the error state by ~1s. Only transient classes
// (network/timeout status 0, 5xx, 429) earn the single retry.
describe('shouldRetryQuery', () => {
  const err = (status: number) => new ApiError({ status, code: 'X', message: 'x' });

  it('does not retry deterministic 4xx', () => {
    expect(shouldRetryQuery(0, err(401))).toBe(false);
    expect(shouldRetryQuery(0, err(403))).toBe(false);
    expect(shouldRetryQuery(0, err(404))).toBe(false);
    expect(shouldRetryQuery(0, err(422))).toBe(false);
  });

  it('retries transient failures once', () => {
    expect(shouldRetryQuery(0, err(500))).toBe(true);
    expect(shouldRetryQuery(0, err(0))).toBe(true); // network / TIMEOUT
    expect(shouldRetryQuery(0, err(429))).toBe(true);
    expect(shouldRetryQuery(0, new TypeError('fetch failed'))).toBe(true);
    expect(shouldRetryQuery(1, err(500))).toBe(false); // only once
  });
});

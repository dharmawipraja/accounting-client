import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { classifyApiError } from './classifyApiError';

const err = (status: number, code = 'X') => new ApiError({ status, code, message: 'm' });

describe('classifyApiError', () => {
  it('classifies an ApiError by status/code', () => {
    expect(classifyApiError(err(0)).kind).toBe('offline');
    expect(classifyApiError(err(401)).kind).toBe('unauthorized');
    expect(classifyApiError(err(403, 'SEGREGATION_OF_DUTIES')).kind).toBe('segregationOfDuties');
    expect(classifyApiError(err(403, 'FORBIDDEN')).kind).toBe('forbidden');
    expect(classifyApiError(err(404)).kind).toBe('notFound');
    expect(classifyApiError(err(409, 'CLOSED_PERIOD')).kind).toBe('closedPeriod');
    expect(classifyApiError(err(409, 'CLOSED_YEAR')).kind).toBe('closedYear');
    expect(classifyApiError(err(409, 'CONFLICT')).kind).toBe('conflict');
    expect(classifyApiError(err(422)).kind).toBe('validation');
    expect(classifyApiError(err(503)).kind).toBe('server');
    expect(classifyApiError(err(418)).kind).toBe('unknown');
  });

  it('carries the ApiError for an ApiError, omits it otherwise', () => {
    const e = err(409, 'CONFLICT');
    expect(classifyApiError(e).error).toBe(e);
    expect(classifyApiError(new Error('boom')).error).toBeUndefined();
  });

  it('classifies a non-ApiError as unknown when online', () => {
    expect(classifyApiError(new Error('boom')).kind).toBe('unknown');
  });

  describe('when navigator is offline', () => {
    let original: PropertyDescriptor | undefined;
    afterEach(() => {
      if (original) Object.defineProperty(navigator, 'onLine', original);
    });
    it('classifies a non-ApiError as offline', () => {
      original = Object.getOwnPropertyDescriptor(navigator, 'onLine');
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      expect(classifyApiError(new Error('boom')).kind).toBe('offline');
    });
  });
});

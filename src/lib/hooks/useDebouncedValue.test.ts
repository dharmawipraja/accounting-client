import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('returns the latest value only after the delay', () => {
  const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 400), { initialProps: { v: 'a' } });
  expect(result.current).toBe('a');
  rerender({ v: 'b' });
  expect(result.current).toBe('a'); // not yet
  act(() => { vi.advanceTimersByTime(400); });
  expect(result.current).toBe('b');
});

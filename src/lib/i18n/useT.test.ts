import { renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useT } from './useT';

it('returns the Bahasa Indonesia catalog', () => {
  const { result } = renderHook(() => useT());
  expect(result.current.common.save).toBe('Simpan');
  expect(result.current.auth.signIn).toBe('Masuk');
});

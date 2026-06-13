import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useTheme } from './theme';

afterEach(() => { localStorage.clear(); document.documentElement.classList.remove('dark'); });

it('toggles the dark class on the html element', () => {
  const { result } = renderHook(() => useTheme());
  act(() => result.current.setTheme('dark'));
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  act(() => result.current.setTheme('light'));
  expect(document.documentElement.classList.contains('dark')).toBe(false);
});

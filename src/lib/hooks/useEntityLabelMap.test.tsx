import { renderHook } from '@testing-library/react';
import type { UseQueryResult } from '@tanstack/react-query';
import { expect, it } from 'vitest';
import { useEntityLabelMap } from './useEntityLabelMap';

type Row = { id: string; code: string; name: string };
const q = (data?: Row[]) => ({ data } as unknown as UseQueryResult<Row[]>);

it('maps id to label and falls back to the raw id for unknown ids', () => {
  const rows: Row[] = [{ id: 'a1', code: '1-1000', name: 'Kas' }];
  const { result } = renderHook(() => useEntityLabelMap(() => q(rows), (r) => `${r.code} — ${r.name}`));
  expect(result.current('a1')).toBe('1-1000 — Kas');
  expect(result.current('missing')).toBe('missing');
});

it('falls back to the id while the list is still loading (no data)', () => {
  const { result } = renderHook(() => useEntityLabelMap<Row>(() => q(undefined), (r) => r.name));
  expect(result.current('x')).toBe('x');
});

it('uses a provided fallback string for unknown ids', () => {
  const { result } = renderHook(() => useEntityLabelMap<Row>(() => q([]), (r) => r.name, '—'));
  expect(result.current('x')).toBe('—');
});

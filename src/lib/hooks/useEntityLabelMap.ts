import { useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

/** Builds an id→label lookup over a resource list and returns a stable
 *  `(id) => label` that falls back to the raw id for unknown / not-yet-loaded
 *  ids. Concentrates the `useList` + Map-build + `?? id` fallback that the list
 *  and editor pages otherwise hand-roll; each caller supplies its own `toLabel`
 *  so the display format stays per-site. */
export function useEntityLabelMap<T extends { id: string }>(
  useList: () => UseQueryResult<T[]>,
  toLabel: (item: T) => string,
  /** Shown for unknown / not-yet-loaded ids. Defaults to the raw id. */
  fallback?: string,
): (id: string) => string {
  const list = useList();
  return useMemo(() => {
    const map = new Map((list.data ?? []).map((x) => [x.id, toLabel(x)]));
    return (id: string) => map.get(id) ?? fallback ?? id;
    // toLabel is a fixed per-site format; rebuild only when the data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.data, fallback]);
}

import { afterEach, expect, it } from 'vitest';
import { computePeriod } from '@/features/dashboard/period';
import { usePreferences } from './preferences';

// The store is a module singleton; reset it (and its persisted copy) per test.
afterEach(() => {
  usePreferences.setState({ dashboardPeriod: computePeriod('year', new Date()) });
  localStorage.clear();
});

it('defaults dashboardPeriod to a year preset', () => {
  expect(usePreferences.getState().dashboardPeriod.preset).toBe('year');
});

it('persists a set dashboardPeriod to localStorage', () => {
  usePreferences.getState().setDashboardPeriod({ preset: 'custom', from: '2026-02-01', to: '2026-02-28' });
  expect(usePreferences.getState().dashboardPeriod).toEqual({ preset: 'custom', from: '2026-02-01', to: '2026-02-28' });
  expect(localStorage.getItem('buku.prefs')).toContain('"preset":"custom"');
});

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computePeriod, type Period } from '@/features/dashboard/period';

/** Persisted client UI preferences. Ships with the dashboard period; new
 *  preferences (page size, locale, …) get fields here as features need them. */
export interface PreferencesState {
  dashboardPeriod: Period;
  setDashboardPeriod(p: Period): void;
}

// NOTE: sidebar collapse state deliberately lives in shadcn's SidebarProvider
// (cookie-based), not here — an earlier sidebarCollapsed field was dead code.
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      dashboardPeriod: computePeriod('year', new Date()),
      setDashboardPeriod: (dashboardPeriod) => set({ dashboardPeriod }),
    }),
    { name: 'buku.prefs' },
  ),
);

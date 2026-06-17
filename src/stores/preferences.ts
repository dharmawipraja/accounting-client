import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computePeriod, type Period } from '@/features/dashboard/period';

/** Persisted client UI preferences. Ships with the dashboard period; new
 *  preferences (page size, locale, …) get fields here as features need them. */
export interface PreferencesState {
  dashboardPeriod: Period;
  setDashboardPeriod(p: Period): void;
  sidebarCollapsed: boolean;
  toggleSidebar(): void;
  setSidebarCollapsed(collapsed: boolean): void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      dashboardPeriod: computePeriod('year', new Date()),
      setDashboardPeriod: (dashboardPeriod) => set({ dashboardPeriod }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    { name: 'buku.prefs' },
  ),
);

import type { ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  BookText,
  CalendarCheck,
  FileChartColumn,
  LayoutDashboard,
  NotebookText,
  Users,
  Receipt,
  ReceiptText,
  Percent,
  Wallet,
  LogOut,
  ScrollText,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHydrateSession } from '@/features/auth/useHydrateSession';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/utils';
import { useSession } from '@/stores/session';
import { usePreferences } from '@/stores/preferences';
import { ThemeToggle } from './ThemeToggle';

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const clear = useSession((s) => s.clear);
  const collapsed = usePreferences((s) => s.sidebarCollapsed);
  const toggleSidebar = usePreferences((s) => s.toggleSidebar);

  // Hydrate user from /auth/me on mount/reload if token exists but no user yet.
  useHydrateSession();

  const nav = [
    { to: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/accounts', label: t.nav.accounts, icon: BookText },
    { to: '/journals', label: t.nav.journals, icon: NotebookText },
    { to: '/reports', label: t.nav.reports, icon: FileChartColumn },
    { to: '/periods', label: t.nav.periods, icon: CalendarCheck },
    { to: '/partners', label: t.nav.partners, icon: Users },
    { to: '/tax-codes', label: t.nav.taxCodes, icon: Percent },
    { to: '/sales-invoices', label: t.nav.salesInvoices, icon: Receipt },
    { to: '/purchase-bills', label: t.nav.purchaseBills, icon: ReceiptText },
    { to: '/payments', label: t.nav.payments, icon: Wallet },
    { to: '/settings', label: t.nav.settings, icon: Settings },
  ] as const;

  const navLinkClass =
    'flex items-center gap-2 overflow-hidden rounded-md px-3 py-2.5 text-sm whitespace-nowrap text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring';
  const activeLinkClass =
    'bg-sidebar-accent font-medium text-sidebar-foreground shadow-[inset_3px_0_0_var(--sidebar-ring)]';
  const labelClass = cn(
    'transition-opacity duration-200 motion-reduce:transition-none',
    collapsed && 'opacity-0',
  );

  return (
    <div className="flex min-h-svh">
      <aside
        id="app-sidebar"
        className={cn(
          'flex shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out motion-reduce:transition-none',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className="flex items-center gap-2 px-3 py-4">
          {!collapsed && (
            <>
              <BookText className="size-5 shrink-0 text-sidebar-foreground" />
              <span className="whitespace-nowrap text-lg font-semibold">{t.app.name}</span>
            </>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            aria-label={collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
            className={cn(
              'flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              collapsed ? 'mx-auto' : 'ml-auto',
            )}
          >
            <ChevronLeft
              className={cn(
                'size-4 transition-transform duration-200 motion-reduce:transition-none',
                collapsed && 'rotate-180',
              )}
            />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={navLinkClass}
              activeProps={{ className: activeLinkClass }}
            >
              <item.icon className="size-4 shrink-0" />
              <span className={labelClass}>{item.label}</span>
            </Link>
          ))}
          {user?.role === 'ADMIN' && (
            <Link
              to="/audit"
              title={collapsed ? t.nav.audit : undefined}
              className={navLinkClass}
              activeProps={{ className: activeLinkClass }}
            >
              <ScrollText className="size-4 shrink-0" />
              <span className={labelClass}>{t.nav.audit}</span>
            </Link>
          )}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b px-6">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.auth.signOut}
            onClick={() => {
              clear();
              void navigate({ to: '/login' });
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

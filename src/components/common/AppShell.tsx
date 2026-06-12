import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  BookText,
  LayoutDashboard,
  Users,
  Receipt,
  Percent,
  Wallet,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHydrateSession } from '@/features/auth/useHydrateSession';
import { useT } from '@/lib/i18n/useT';
import { useSession } from '@/stores/session';
import { ThemeToggle } from './ThemeToggle';

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const user = useSession((s) => s.user);
  const clear = useSession((s) => s.clear);

  // Hydrate user from /auth/me on mount/reload if token exists but no user yet.
  useHydrateSession();

  const nav = [
    { to: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/accounts', label: t.nav.accounts, icon: BookText },
    { to: '/partners', label: t.nav.partners, icon: Users },
    { to: '/tax-codes', label: t.nav.taxCodes, icon: Percent },
    { to: '/sales-invoices', label: t.nav.salesInvoices, icon: Receipt },
    { to: '/payments', label: t.nav.payments, icon: Wallet },
  ] as const;

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-60 flex-col border-r bg-muted/30">
        <div className="flex items-center gap-2 px-5 py-4">
          <BookText className="size-5 text-primary" />
          <span className="text-lg font-semibold">{t.app.name}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: 'bg-primary/10 font-medium text-primary' }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b px-6">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label={t.auth.signOut} onClick={clear}>
            <LogOut className="size-4" />
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

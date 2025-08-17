import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LEDGER_TYPE_LABELS, ROUTES } from '@/constants'
import { useAuth } from '@/hooks/useAuth'
import {
  canAccessUserManagement,
  canManageAccounts,
  canManageLedgers,
} from '@/utils/rolePermissions'
import { Link } from '@tanstack/react-router'
import { ChevronDown, Plus } from 'lucide-react'

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth()

  if (!isAuthenticated) {
    return null
  }

  const canViewUsers = user?.role ? canAccessUserManagement(user.role) : false
  const canViewAccounts = user?.role ? canManageAccounts(user.role) : false
  const canViewLedgers = user?.role ? canManageLedgers(user.role) : false

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <nav className="flex items-center space-x-6">
          <div className="font-bold text-lg">
            <Link to="/" className="hover:text-primary">
              PRSM Accounting
            </Link>
          </div>

          <div className="flex items-center space-x-4 text-sm">
            <Link
              to="/dashboard"
              className="hover:text-primary transition-colors"
              activeProps={{ className: 'text-primary font-medium' }}
            >
              Dashboard
            </Link>
            {canViewUsers && (
              <Link
                to="/users"
                className="hover:text-primary transition-colors"
                activeProps={{ className: 'text-primary font-medium' }}
              >
                Users
              </Link>
            )}
            {canViewAccounts && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center hover:text-primary transition-colors">
                    Accounts
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link
                      to="/accounts/general"
                      className="w-full hover:text-primary transition-colors"
                    >
                      General Accounts
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/accounts/detail"
                      className="w-full hover:text-primary transition-colors"
                    >
                      Detail Accounts
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      to={ROUTES.ACCOUNTS_GENERAL_CREATE}
                      className="w-full hover:text-primary transition-colors"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Account General
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to={ROUTES.ACCOUNTS_DETAIL_CREATE}
                      className="w-full hover:text-primary transition-colors"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Account Detail
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canViewLedgers && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center hover:text-primary transition-colors">
                    Ledgers
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link
                      to="/ledgers"
                      className="w-full hover:text-primary transition-colors"
                    >
                      View All Ledgers
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      to={ROUTES.LEDGERS_KAS_MASUK}
                      className="w-full hover:text-primary transition-colors"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create {LEDGER_TYPE_LABELS.KAS_MASUK}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to={ROUTES.LEDGERS_KAS_KELUAR}
                      className="w-full hover:text-primary transition-colors"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create {LEDGER_TYPE_LABELS.KAS_KELUAR}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </nav>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            Welcome, {user?.name}
          </span>
          <button
            onClick={logout}
            className="text-sm hover:text-primary transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

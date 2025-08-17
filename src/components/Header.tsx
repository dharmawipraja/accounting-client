import { useAuth } from '@/hooks/useAuth'
import {
  canAccessUserManagement,
  canManageAccounts,
  canManageLedgers,
} from '@/utils/rolePermissions'
import { Link } from '@tanstack/react-router'

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
              <>
                <Link
                  to="/accounts/general"
                  className="hover:text-primary transition-colors"
                  activeProps={{ className: 'text-primary font-medium' }}
                >
                  General Accounts
                </Link>
                <Link
                  to="/accounts/detail"
                  className="hover:text-primary transition-colors"
                  activeProps={{ className: 'text-primary font-medium' }}
                >
                  Detail Accounts
                </Link>
              </>
            )}
            {canViewLedgers && (
              <Link
                to="/ledgers"
                className="hover:text-primary transition-colors"
                activeProps={{ className: 'text-primary font-medium' }}
              >
                Ledgers
              </Link>
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

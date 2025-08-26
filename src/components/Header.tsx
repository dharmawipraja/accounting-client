import { Button } from '@/components/ui/button'
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
import {
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle,
  ChevronDown,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (!isAuthenticated) {
    return null
  }

  const canViewUsers = user?.role ? canAccessUserManagement(user.role) : false
  const canViewAccounts = user?.role ? canManageAccounts(user.role) : false
  const canViewLedgers = user?.role ? canManageLedgers(user.role) : false

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass supports-[backdrop-filter]:bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="flex items-center space-x-2 font-bold text-xl text-primary hover:text-primary/80 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="hidden sm:inline-block">PRSM Accounting</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          <Link
            to="/dashboard"
            className="nav-link flex items-center space-x-2"
            activeProps={{ className: 'nav-link active' }}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          {canViewUsers && (
            <Link
              to="/users"
              className="nav-link flex items-center space-x-2"
              activeProps={{ className: 'nav-link active' }}
            >
              <Users className="h-4 w-4" />
              <span>Users</span>
            </Link>
          )}

          {canViewAccounts && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="nav-link flex items-center space-x-2 data-[state=open]:bg-primary/10"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>Accounts</span>
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 animate-fade-in-scale"
              >
                <DropdownMenuItem asChild>
                  <Link
                    to="/accounts/general"
                    className="w-full flex items-center space-x-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>General Accounts</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/accounts/detail"
                    className="w-full flex items-center space-x-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>Detail Accounts</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to={ROUTES.ACCOUNTS_GENERAL_CREATE}
                    className="w-full flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create General Account</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to={ROUTES.ACCOUNTS_DETAIL_CREATE}
                    className="w-full flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Detail Account</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {canViewLedgers && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="nav-link flex items-center space-x-2 data-[state=open]:bg-primary/10"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Ledgers</span>
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 animate-fade-in-scale"
              >
                <DropdownMenuItem asChild>
                  <Link
                    to="/ledgers"
                    className="w-full flex items-center space-x-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>View All Ledgers</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to={ROUTES.LEDGERS_KAS_MASUK}
                    className="w-full flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create {LEDGER_TYPE_LABELS.KAS_MASUK}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to={ROUTES.LEDGERS_KAS_KELUAR}
                    className="w-full flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create {LEDGER_TYPE_LABELS.KAS_KELUAR}</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {canViewLedgers && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="nav-link flex items-center space-x-2 data-[state=open]:bg-primary/10"
                >
                  <Calculator className="h-4 w-4" />
                  <span>Posting</span>
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-64 animate-fade-in-scale"
              >
                <DropdownMenuItem asChild>
                  <Link
                    to="/posting"
                    className="w-full flex items-center space-x-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Posting Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to="/posting/buku-besar"
                    className="w-full flex items-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Buku Besar Posting</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/posting/neraca-detail"
                    className="w-full flex items-center space-x-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Neraca Detail Posting</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/posting/neraca-balance"
                    className="w-full flex items-center space-x-2"
                  >
                    <Calculator className="h-4 w-4" />
                    <span>Neraca Balance Posting</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/posting/neraca-akhir"
                    className="w-full flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Neraca Akhir Posting</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Desktop User Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs text-muted-foreground">
                Welcome back
              </span>
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-medium text-sm">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 glass animate-slide-in-up">
          <nav className="container mx-auto py-4 px-4 space-y-2">
            <Link
              to="/dashboard"
              className="nav-link flex items-center space-x-3 w-full p-3"
              activeProps={{ className: 'nav-link active w-full p-3' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>

            {canViewUsers && (
              <Link
                to="/users"
                className="nav-link flex items-center space-x-3 w-full p-3"
                activeProps={{ className: 'nav-link active w-full p-3' }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Users className="h-5 w-5" />
                <span>Users</span>
              </Link>
            )}

            {canViewAccounts && (
              <div className="space-y-1">
                <div className="nav-link flex items-center space-x-3 w-full p-3 text-muted-foreground">
                  <FolderOpen className="h-5 w-5" />
                  <span>Accounts</span>
                </div>
                <div className="pl-8 space-y-1">
                  <Link
                    to="/accounts/general"
                    className="nav-link flex items-center space-x-3 w-full p-2 text-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>General Accounts</span>
                  </Link>
                  <Link
                    to="/accounts/detail"
                    className="nav-link flex items-center space-x-3 w-full p-2 text-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Detail Accounts</span>
                  </Link>
                </div>
              </div>
            )}

            {canViewLedgers && (
              <div className="space-y-1">
                <div className="nav-link flex items-center space-x-3 w-full p-3 text-muted-foreground">
                  <BookOpen className="h-5 w-5" />
                  <span>Ledgers</span>
                </div>
                <div className="pl-8 space-y-1">
                  <Link
                    to="/ledgers"
                    className="nav-link flex items-center space-x-3 w-full p-2 text-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>View All Ledgers</span>
                  </Link>
                </div>
              </div>
            )}

            {canViewLedgers && (
              <div className="space-y-1">
                <div className="nav-link flex items-center space-x-3 w-full p-3 text-muted-foreground">
                  <Calculator className="h-5 w-5" />
                  <span>Posting</span>
                </div>
                <div className="pl-8 space-y-1">
                  <Link
                    to="/posting"
                    className="nav-link flex items-center space-x-3 w-full p-2 text-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Posting Dashboard</span>
                  </Link>
                  <Link
                    to="/posting/buku-besar"
                    className="nav-link flex items-center space-x-3 w-full p-2 text-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Buku Besar Posting</span>
                  </Link>
                  <Link
                    to="/posting/neraca-detail"
                    className="nav-link flex items-center space-x-3 w-full p-2 text-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Neraca Detail Posting</span>
                  </Link>
                  <Link
                    to="/posting/neraca-balance"
                    className="nav-link flex items-center space-x-3 w-full p-2 text-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Neraca Balance Posting</span>
                  </Link>
                  <Link
                    to="/posting/neraca-akhir"
                    className="nav-link flex items-center space-x-3 w-full p-2 text-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Neraca Akhir Posting</span>
                  </Link>
                </div>
              </div>
            )}

            <div className="border-t border-border/40 pt-4 mt-4">
              <div className="flex items-center space-x-3 p-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-medium">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.name}</span>
                  <span className="text-sm text-muted-foreground">
                    Welcome back
                  </span>
                </div>
              </div>
              <Button
                onClick={() => {
                  logout()
                  setIsMobileMenuOpen(false)
                }}
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 p-3"
              >
                <LogOut className="h-5 w-5 mr-3" />
                <span>Logout</span>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

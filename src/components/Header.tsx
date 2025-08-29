import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROUTES } from '@/constants'
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
      <div className="container flex items-center justify-between h-16 px-4 mx-auto max-w-screen-2xl sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="flex items-center space-x-2 text-xl font-bold transition-colors text-primary hover:text-primary/80"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline-block">PRSM Accounting</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="items-center hidden space-x-1 md:flex">
          <Link
            to="/dashboard"
            className="flex items-center space-x-2 nav-link"
            activeProps={{ className: 'nav-link active' }}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          {canViewUsers && (
            <Link
              to="/users"
              className="flex items-center space-x-2 nav-link"
              activeProps={{ className: 'nav-link active' }}
            >
              <Users className="w-4 h-4" />
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
                  <FolderOpen className="w-4 h-4" />
                  <span>Accounts</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 animate-fade-in-scale"
              >
                <DropdownMenuItem asChild>
                  <Link
                    to="/accounts/general"
                    className="flex items-center w-full space-x-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>General Accounts</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/accounts/detail"
                    className="flex items-center w-full space-x-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Detail Accounts</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to={ROUTES.ACCOUNTS_GENERAL_CREATE}
                    className="flex items-center w-full space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create General Account</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to={ROUTES.ACCOUNTS_DETAIL_CREATE}
                    className="flex items-center w-full space-x-2"
                  >
                    <Plus className="w-4 h-4" />
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
                  <BookOpen className="w-4 h-4" />
                  <span>Ledgers</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 animate-fade-in-scale"
              >
                <DropdownMenuItem asChild>
                  <Link
                    to="/ledgers"
                    className="flex items-center w-full space-x-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>View All Ledgers</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to={ROUTES.LEDGERS_KAS}
                    className="flex items-center w-full space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Kas</span>
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
                  <Calculator className="w-4 h-4" />
                  <span>Posting</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-64 animate-fade-in-scale"
              >
                <DropdownMenuItem asChild>
                  <Link
                    to="/posting"
                    className="flex items-center w-full space-x-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Posting Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to="/posting/buku-besar"
                    className="flex items-center w-full space-x-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Buku Besar Posting</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/posting/neraca-detail"
                    className="flex items-center w-full space-x-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Neraca Detail Posting</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/posting/neraca-balance"
                    className="flex items-center w-full space-x-2"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Neraca Balance Posting</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/posting/neraca-akhir"
                    className="flex items-center w-full space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Neraca Akhir Posting</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Desktop User Actions */}
        <div className="items-center hidden space-x-4 md:flex">
          <div className="flex items-center space-x-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs text-muted-foreground">
                Welcome back
              </span>
            </div>
            <div className="flex items-center justify-center w-8 h-8 text-sm font-medium rounded-full bg-gradient-primary text-primary-foreground">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
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
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="border-t md:hidden border-border/40 glass animate-slide-in-up">
          <nav className="container px-4 py-4 mx-auto space-y-2">
            <Link
              to="/dashboard"
              className="flex items-center w-full p-3 space-x-3 nav-link"
              activeProps={{ className: 'nav-link active w-full p-3' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>

            {canViewUsers && (
              <Link
                to="/users"
                className="flex items-center w-full p-3 space-x-3 nav-link"
                activeProps={{ className: 'nav-link active w-full p-3' }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Users className="w-5 h-5" />
                <span>Users</span>
              </Link>
            )}

            {canViewAccounts && (
              <div className="space-y-1">
                <div className="flex items-center w-full p-3 space-x-3 nav-link text-muted-foreground">
                  <FolderOpen className="w-5 h-5" />
                  <span>Accounts</span>
                </div>
                <div className="pl-8 space-y-1">
                  <Link
                    to="/accounts/general"
                    className="flex items-center w-full p-2 space-x-3 text-sm nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>General Accounts</span>
                  </Link>
                  <Link
                    to="/accounts/detail"
                    className="flex items-center w-full p-2 space-x-3 text-sm nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Detail Accounts</span>
                  </Link>
                </div>
              </div>
            )}

            {canViewLedgers && (
              <div className="space-y-1">
                <div className="flex items-center w-full p-3 space-x-3 nav-link text-muted-foreground">
                  <BookOpen className="w-5 h-5" />
                  <span>Ledgers</span>
                </div>
                <div className="pl-8 space-y-1">
                  <Link
                    to="/ledgers"
                    className="flex items-center w-full p-2 space-x-3 text-sm nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>View All Ledgers</span>
                  </Link>
                </div>
              </div>
            )}

            {canViewLedgers && (
              <div className="space-y-1">
                <div className="flex items-center w-full p-3 space-x-3 nav-link text-muted-foreground">
                  <Calculator className="w-5 h-5" />
                  <span>Posting</span>
                </div>
                <div className="pl-8 space-y-1">
                  <Link
                    to="/posting"
                    className="flex items-center w-full p-2 space-x-3 text-sm nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Posting Dashboard</span>
                  </Link>
                  <Link
                    to="/posting/buku-besar"
                    className="flex items-center w-full p-2 space-x-3 text-sm nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Buku Besar Posting</span>
                  </Link>
                  <Link
                    to="/posting/neraca-detail"
                    className="flex items-center w-full p-2 space-x-3 text-sm nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Neraca Detail Posting</span>
                  </Link>
                  <Link
                    to="/posting/neraca-balance"
                    className="flex items-center w-full p-2 space-x-3 text-sm nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Neraca Balance Posting</span>
                  </Link>
                  <Link
                    to="/posting/neraca-akhir"
                    className="flex items-center w-full p-2 space-x-3 text-sm nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Neraca Akhir Posting</span>
                  </Link>
                </div>
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-border/40">
              <div className="flex items-center p-3 mb-2 space-x-3">
                <div className="flex items-center justify-center w-10 h-10 font-medium rounded-full bg-gradient-primary text-primary-foreground">
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
                className="justify-start w-full p-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span>Logout</span>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

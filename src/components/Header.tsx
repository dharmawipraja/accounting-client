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
import { useTranslation } from '@/hooks/useTranslation'
import {
  canAccessReports,
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
  Settings,
  User,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const { t } = useTranslation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (!isAuthenticated) {
    return null
  }

  const canViewUsers = user?.role ? canAccessUserManagement(user.role) : false
  const canViewAccounts = user?.role ? canManageAccounts(user.role) : false
  const canViewLedgers = user?.role ? canManageLedgers(user.role) : false
  const canViewReports = user?.role ? canAccessReports(user.role) : false

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/95 shadow-sm">
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
            <span className="hidden sm:inline-block">{t('app.name')}</span>
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
            <span>{t('navigation.dashboard')}</span>
          </Link>

          {canViewUsers && (
            <Link
              to="/users"
              className="flex items-center space-x-2 nav-link"
              activeProps={{ className: 'nav-link active' }}
            >
              <Users className="w-4 h-4" />
              <span>{t('navigation.users')}</span>
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
                  <span>{t('navigation.accounts')}</span>
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
                    <span>{t('navigation.generalAccounts')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/accounts/detail"
                    className="flex items-center w-full space-x-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>{t('navigation.detailAccounts')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to={ROUTES.ACCOUNTS_GENERAL_CREATE}
                    className="flex items-center w-full space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('navigation.createGeneralAccount')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to={ROUTES.ACCOUNTS_DETAIL_CREATE}
                    className="flex items-center w-full space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('navigation.createDetailAccount')}</span>
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
                  <span>{t('navigation.ledgers')}</span>
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
                    <span>{t('navigation.viewAllLedgers')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/buku-besar"
                    className="flex items-center w-full space-x-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{t('navigation.viewBukuBesar')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to={ROUTES.LEDGERS_KAS}
                    className="flex items-center w-full space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('navigation.createKas')}</span>
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
                  <span>{t('navigation.posting')}</span>
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

          {canViewReports && (
            <Link
              to={ROUTES.REPORTS}
              className="flex items-center space-x-2 nav-link"
              activeProps={{ className: 'nav-link active' }}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </Link>
          )}
        </nav>

        {/* Desktop User Actions */}
        <div className="items-center hidden md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-3 px-3 py-2 h-auto hover:bg-muted/50 data-[state=open]:bg-muted/50 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end text-right">
                    <span className="text-sm font-medium leading-none">
                      {user?.name}
                    </span>
                    <span className="text-xs text-muted-foreground leading-none mt-1">
                      {user?.role || 'User'}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="flex items-center justify-center w-10 h-10 text-sm font-semibold rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md ring-2 ring-background">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 p-2 animate-fade-in-scale"
              sideOffset={8}
            >
              {/* User Info Header */}
              <div className="flex items-center gap-3 p-3 mb-2 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-12 h-12 text-base font-semibold rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{user?.name}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {user?.role?.toLowerCase() || 'User'}
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Profile Action */}
              <DropdownMenuItem asChild>
                <div
                  className="flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toast.info('Profile settings coming soon!')}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Profile Settings</div>
                    <div className="text-xs text-muted-foreground">
                      Manage your account
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>

              {/* Settings Action */}
              <DropdownMenuItem asChild>
                <div
                  className="flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toast.info('App preferences coming soon!')}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-600">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Preferences</div>
                    <div className="text-xs text-muted-foreground">
                      App settings & preferences
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Logout Action */}
              <DropdownMenuItem asChild>
                <button
                  onClick={logout}
                  className="flex items-center gap-3 p-3 w-full rounded-md cursor-pointer hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Sign Out</div>
                    <div className="text-xs text-muted-foreground">
                      Sign out of your account
                    </div>
                  </div>
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        <div className="border-t md:hidden border-border/40 bg-background/95 backdrop-blur-md animate-slide-in-up shadow-lg">
          <nav className="container px-4 py-6 mx-auto space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
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
                  <Link
                    to="/buku-besar"
                    className="flex items-center w-full p-2 space-x-3 text-sm nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>View Buku Besar</span>
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

            {canViewReports && (
              <Link
                to={ROUTES.REPORTS}
                className="flex items-center w-full p-3 space-x-3 nav-link"
                activeProps={{ className: 'nav-link active w-full p-3' }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <BarChart3 className="w-5 h-5" />
                <span>Reports</span>
              </Link>
            )}

            <div className="pt-6 mt-6 border-t border-border/40">
              {/* Mobile User Profile Header */}
              <div className="flex items-center p-4 mb-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50">
                <div className="relative mr-4">
                  <div className="flex items-center justify-center w-14 h-14 text-lg font-semibold rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg ring-2 ring-background">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-lg truncate">
                    {user?.name}
                  </div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {user?.role?.toLowerCase() || 'User'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Welcome back to PRSM
                  </div>
                </div>
              </div>

              {/* Mobile User Actions */}
              <div className="space-y-2">
                {/* Profile Link */}
                <div
                  className="flex items-center w-full p-3 space-x-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    toast.info('Profile settings coming soon!')
                    setIsMobileMenuOpen(false)
                  }}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Profile Settings</div>
                    <div className="text-xs text-muted-foreground">
                      Manage your account
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div
                  className="flex items-center w-full p-3 space-x-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    toast.info('App preferences coming soon!')
                    setIsMobileMenuOpen(false)
                  }}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 text-gray-600">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Preferences</div>
                    <div className="text-xs text-muted-foreground">
                      App settings & preferences
                    </div>
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={() => {
                    logout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center w-full p-3 space-x-3 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 text-red-600">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Sign Out</div>
                    <div className="text-xs text-muted-foreground">
                      Sign out of your account
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

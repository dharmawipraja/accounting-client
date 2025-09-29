import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { APP_CONFIG } from '@/constants'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { getRoleDisplayName } from '@/utils/auth'
import { formatDate } from '@/utils/formatters'
import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  FolderOpen,
  Globe,
  Shield,
  TrendingUp,
  User,
  Users,
} from 'lucide-react'
import React from 'react'

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const { t } = useTranslation()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-surface">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-primary animate-pulse"></div>
          <div className="w-4 h-4 bg-primary rounded-full animate-pulse [animation-delay:0.2s]"></div>
          <div className="w-4 h-4 bg-primary rounded-full animate-pulse [animation-delay:0.4s]"></div>
        </div>
      </div>
    )
  }

  const quickActions = [
    {
      title: t('navigation.users'),
      description: t('dashboard.manageUserAccounts'),
      icon: Users,
      href: '/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('navigation.accounts'),
      description: t('dashboard.manageChartOfAccounts'),
      icon: FolderOpen,
      href: '/accounts/general',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: t('navigation.ledgers'),
      description: t('dashboard.viewTransactionLedgers'),
      icon: BookOpen,
      href: '/ledgers',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: t('navigation.reports'),
      description: t('dashboard.generateFinancialReports'),
      icon: BarChart3,
      href: '/reports',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-surface">
      <main className="container px-3 py-4 mx-auto space-y-6 sm:px-6 sm:py-8 sm:space-y-8 lg:px-8">
        {/* Welcome Section */}
        <div className="space-y-3 text-center animate-fade-in-scale sm:space-y-4">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
            {t('dashboard.welcome', { name: user.name })}
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            {t('app.tagline')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4 animate-slide-in-up">
          <Card className="dashboard-card group">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('dashboard.totalUsers')}
                  </p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <div className="p-3 transition-colors bg-blue-50 rounded-xl group-hover:bg-blue-100">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                <span className="text-green-500">+12%</span>
                <span className="ml-1 text-muted-foreground">
                  {t('dashboard.fromLastMonth')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card group">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('dashboard.activeAccounts')}
                  </p>
                  <p className="text-2xl font-bold">156</p>
                </div>
                <div className="p-3 transition-colors bg-green-50 rounded-xl group-hover:bg-green-100">
                  <FolderOpen className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                <span className="text-green-500">+5%</span>
                <span className="ml-1 text-muted-foreground">
                  {t('dashboard.fromLastMonth')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card group">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('dashboard.monthlyTransactions')}
                  </p>
                  <p className="text-2xl font-bold">1,247</p>
                </div>
                <div className="p-3 transition-colors bg-purple-50 rounded-xl group-hover:bg-purple-100">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                <span className="text-green-500">+18%</span>
                <span className="ml-1 text-muted-foreground">
                  {t('dashboard.fromLastMonth')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card group">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('dashboard.systemHealth')}
                  </p>
                  <p className="text-2xl font-bold">99.9%</p>
                </div>
                <div className="p-3 transition-colors bg-orange-50 rounded-xl group-hover:bg-orange-100">
                  <Activity className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <div className="w-2 h-2 mr-2 bg-green-500 rounded-full"></div>
                <span className="text-muted-foreground">
                  {t('dashboard.allSystemsOperational')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* User Profile Card */}
          <Card className="dashboard-card animate-slide-in-up [animation-delay:0.1s]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-primary" />
                <span>{t('dashboard.profileInformation')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-16 h-16 text-xl font-bold rounded-full bg-gradient-primary text-primary-foreground">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  <p className="text-muted-foreground">@{user.username}</p>
                </div>
              </div>

              <div className="pt-4 space-y-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('dashboard.role')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {getRoleDisplayName(user.role)}
                    </span>
                  </div>
                </div>
                {user.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('dashboard.status')}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                      {user.status}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="dashboard-card animate-slide-in-up [animation-delay:0.2s]">
            <CardHeader className="pb-4">
              <CardTitle>{t('dashboard.quickActions')}</CardTitle>
              <CardDescription>
                {t('dashboard.accessFrequentlyUsed')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Button
                    key={action.title}
                    variant="outline"
                    className="flex flex-col items-center h-auto p-4 space-y-2 transition-all hover:shadow-elegant group"
                    asChild
                  >
                    <a href={action.href}>
                      <div
                        className={`p-2 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform`}
                      >
                        <action.icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">
                          {action.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </a>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="dashboard-card animate-slide-in-up [animation-delay:0.3s]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-primary" />
                <span>{t('dashboard.systemInformation')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('dashboard.environment')}
                  </span>
                  <span className="font-medium">{APP_CONFIG.ENVIRONMENT}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('dashboard.version')}
                  </span>
                  <span className="font-medium">{APP_CONFIG.VERSION}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('common.status')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-green-600">
                      {t('dashboard.online')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('dashboard.lastUpdated')}
                  </span>
                  <div className="flex items-center space-x-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="text-sm">
                      {t('dashboard.timeAgo.hoursAgo', { count: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {t('dashboard.lastLogin', { date: formatDate(new Date()) })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="dashboard-card animate-slide-in-up [animation-delay:0.4s]">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-primary" />
              <span>{t('labels.recentActivity')}</span>
            </CardTitle>
            <CardDescription>
              Overview of your recent actions in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  action: 'Created new user account',
                  time: '2 hours ago',
                  type: 'user',
                },
                {
                  action: 'Updated general account settings',
                  time: '4 hours ago',
                  type: 'account',
                },
                {
                  action: 'Generated monthly report',
                  time: '1 day ago',
                  type: 'report',
                },
                {
                  action: 'Added new ledger entry',
                  time: '2 days ago',
                  type: 'ledger',
                },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center p-3 space-x-4 transition-colors rounded-lg hover:bg-muted/50"
                >
                  <div
                    className={`p-2 rounded-full ${
                      activity.type === 'user'
                        ? 'bg-blue-100 text-blue-600'
                        : activity.type === 'account'
                          ? 'bg-green-100 text-green-600'
                          : activity.type === 'report'
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    {activity.type === 'user' && <Users className="w-4 h-4" />}
                    {activity.type === 'account' && (
                      <FolderOpen className="w-4 h-4" />
                    )}
                    {activity.type === 'report' && (
                      <BarChart3 className="w-4 h-4" />
                    )}
                    {activity.type === 'ledger' && (
                      <BookOpen className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

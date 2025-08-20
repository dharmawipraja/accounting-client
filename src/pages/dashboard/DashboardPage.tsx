import Header from '@/components/Header'
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
import { getRoleDisplayName } from '@/utils/auth'
import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  FolderOpen,
  Globe,
  Settings,
  Shield,
  TrendingUp,
  User,
  Users,
} from 'lucide-react'
import React from 'react'

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
          <div className="w-4 h-4 bg-primary rounded-full animate-pulse [animation-delay:0.2s]"></div>
          <div className="w-4 h-4 bg-primary rounded-full animate-pulse [animation-delay:0.4s]"></div>
        </div>
      </div>
    )
  }

  const quickActions = [
    {
      title: 'Users',
      description: 'Manage user accounts',
      icon: Users,
      href: '/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Accounts',
      description: 'Manage chart of accounts',
      icon: FolderOpen,
      href: '/accounts/general',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Ledgers',
      description: 'View transaction ledgers',
      icon: BookOpen,
      href: '/ledgers',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Reports',
      description: 'Generate financial reports',
      icon: BarChart3,
      href: '/reports',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Header />
      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4 animate-fade-in-scale">
          <h1 className="text-4xl font-bold text-foreground">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your accounting operations with ease
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-in-up">
          <Card className="dashboard-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500">+12%</span>
                <span className="text-muted-foreground ml-1">
                  from last month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Accounts
                  </p>
                  <p className="text-2xl font-bold">156</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
                  <FolderOpen className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500">+5%</span>
                <span className="text-muted-foreground ml-1">
                  from last month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Monthly Transactions
                  </p>
                  <p className="text-2xl font-bold">1,247</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500">+18%</span>
                <span className="text-muted-foreground ml-1">
                  from last month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    System Health
                  </p>
                  <p className="text-2xl font-bold">99.9%</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-muted-foreground">
                  All systems operational
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Profile Card */}
          <Card className="dashboard-card animate-slide-in-up [animation-delay:0.1s]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{user.name}</h3>
                  <p className="text-muted-foreground">@{user.username}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {getRoleDisplayName(user.role)}
                    </span>
                  </div>
                </div>
                {user.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {user.status}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <User className="mr-2 h-4 w-4" />
                  View Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="dashboard-card animate-slide-in-up [animation-delay:0.2s]">
            <CardHeader className="pb-4">
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Access frequently used features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Button
                    key={action.title}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2 hover:shadow-elegant transition-all group"
                    asChild
                  >
                    <a href={action.href}>
                      <div
                        className={`p-2 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform`}
                      >
                        <action.icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-sm">
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
                <Globe className="h-5 w-5 text-primary" />
                <span>System Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Environment
                  </span>
                  <span className="font-medium">{APP_CONFIG.ENVIRONMENT}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <span className="font-medium">{APP_CONFIG.VERSION}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-600 font-medium">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Last Updated
                  </span>
                  <div className="flex items-center space-x-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="text-sm">2 hours ago</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Last login: {new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="dashboard-card animate-slide-in-up [animation-delay:0.4s]">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <span>Recent Activity</span>
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
                  className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
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
                    {activity.type === 'user' && <Users className="h-4 w-4" />}
                    {activity.type === 'account' && (
                      <FolderOpen className="h-4 w-4" />
                    )}
                    {activity.type === 'report' && (
                      <BarChart3 className="h-4 w-4" />
                    )}
                    {activity.type === 'ledger' && (
                      <BookOpen className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.action}</p>
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

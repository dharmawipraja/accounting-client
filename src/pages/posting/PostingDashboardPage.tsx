import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { canManageLedgers } from '@/utils/rolePermissions'
import { useRouter } from '@tanstack/react-router'
import {
  AlertCircle,
  BarChart3,
  Calculator,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react'

export function PostingDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useTranslation()

  // Check if user can access posting functionality
  const canAccessPosting = user ? canManageLedgers(user.role) : false

  if (!canAccessPosting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle>{t('posting.accessDenied')}</CardTitle>
            <CardDescription>{t('posting.noPermission')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const postingOperations = [
    {
      id: 'buku-besar',
      title: t('posting.operations.bukuBesar.title'),
      description: t('posting.operations.bukuBesar.description'),
      icon: FileText,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
      route: '/posting/buku-besar',
    },
    {
      id: 'neraca-detail',
      title: t('posting.operations.neracaDetail.title'),
      description: t('posting.operations.neracaDetail.description'),
      icon: BarChart3,
      color: 'bg-green-50 text-green-600 border-green-200',
      route: '/posting/neraca-detail',
    },
    {
      id: 'neraca-balance',
      title: t('posting.operations.neracaBalance.title'),
      description: t('posting.operations.neracaBalance.description'),
      icon: Calculator,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
      route: '/posting/neraca-balance',
    },
    {
      id: 'neraca-akhir',
      title: t('posting.operations.neracaAkhir.title'),
      description: t('posting.operations.neracaAkhir.description'),
      icon: CheckCircle,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      route: '/posting/neraca-akhir',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('posting.title')}
        </h1>
        <p className="text-gray-600 mt-2">{t('posting.subtitle')}</p>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('posting.pendingPosts')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              {t('posting.operationsAwaiting')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('posting.lastPosted')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              {t('posting.mostRecentDate')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('posting.periodStatus')}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t('posting.open')}</div>
            <p className="text-xs text-muted-foreground">
              {t('posting.currentPeriod')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Posting Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {postingOperations.map((operation) => {
          const Icon = operation.icon
          return (
            <Card
              key={operation.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.navigate({ to: operation.route })}
            >
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg border ${operation.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{operation.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {operation.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.navigate({ to: operation.route })
                  }}
                >
                  {t('posting.accessOperation')}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

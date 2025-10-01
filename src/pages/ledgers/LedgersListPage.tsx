import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/ui/loading-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LEDGER_TYPE_LABELS, ROUTES } from '@/constants'
import { useAuth } from '@/hooks/useAuth'
import {
  useDeleteLedgerMutation,
  useLedgersQuery,
} from '@/hooks/useLedgersQuery'
import { useTranslation } from '@/hooks/useTranslation'
import type { LedgerQueryParams } from '@/types/ledgers'
import {
  formatDate,
  formatDateForAPI,
  getDateRange,
  getDateRangeForInput,
} from '@/utils/date'
import { formatCurrency } from '@/utils/formatters'
import { canManageLedgers } from '@/utils/rolePermissions'
import { useRouter } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  Edit,
  Eye,
  FileSpreadsheet,
  Filter,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import React, { useMemo, useState } from 'react'
// import { toast } from 'sonner'

export const LedgersListPage: React.FC = () => {
  const router = useRouter()
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')

  // Get current month date range for display
  const currentMonthRangeForInput = getDateRangeForInput('month')
  const currentMonthRangeForAPI = getDateRange('month')

  const [filters, setFilters] = useState<Partial<LedgerQueryParams>>({
    page: 1,
    limit: 10,
    dateFrom: currentMonthRangeForAPI.start,
    dateTo: currentMonthRangeForAPI.end,
  })

  // State for date inputs (HTML format)
  const [dateInputs, setDateInputs] = useState({
    dateFrom: currentMonthRangeForInput.start,
    dateTo: currentMonthRangeForInput.end,
  })

  const canManage = user?.role ? canManageLedgers(user.role) : false

  // Build query parameters
  const queryParams = useMemo(() => {
    const params: LedgerQueryParams = {
      ...filters,
      ...(searchTerm && { search: searchTerm }),
      includeAccounts: true,
    }
    return params
  }, [filters, searchTerm])

  const {
    data: ledgersResponse,
    isLoading,
    error,
    refetch,
  } = useLedgersQuery(queryParams)

  const deleteMutation = useDeleteLedgerMutation()

  if (!canManage) {
    return (
      <ErrorState
        type="generic"
        title={t('posting.accessDenied')}
        message={t('posting.noPermission')}
      />
    )
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setFilters((prev) => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (key: keyof LedgerQueryParams, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === '' || value === 'all' ? undefined : value,
      page: 1, // Reset to first page when filtering
    }))
  }

  const handleDateChange = (key: 'dateFrom' | 'dateTo', value: string) => {
    // Update the display state
    setDateInputs((prev) => ({
      ...prev,
      [key]: value,
    }))

    // Convert to API format and update filters
    const apiValue = value ? formatDateForAPI(value) : undefined
    setFilters((prev) => ({
      ...prev,
      [key]: apiValue,
      page: 1, // Reset to first page when filtering
    }))
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const handleEdit = (id: string) => {
    router.navigate({ to: `/ledgers/${id}/edit` })
  }

  const handleView = (id: string) => {
    router.navigate({ to: `/ledgers/${id}` })
  }

  const handleDelete = async (id: string, description: string) => {
    if (window.confirm(t('ledgersList.deleteConfirm', { description }))) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch {
        // Error handling is done in the mutation
      }
    }
  }

  // const getLedgerTypeBadge = (type: string) => {
  //   const variants = {
  //     KAS: 'default',
  //     KAS_MASUK: 'secondary',
  //     KAS_KELUAR: 'secondary',
  //   } as const

  //   const labels = {
  //     KAS: t('ledgersList.cash'),
  //     KAS_MASUK: t('ledgersList.cashIn'),
  //     KAS_KELUAR: t('ledgersList.cashOut'),
  //   }

  //   return (
  //     <Badge variant={variants[type as keyof typeof variants] || 'outline'}>
  //       {labels[type as keyof typeof labels] || type}
  //     </Badge>
  //   )
  // }

  console.log('ledgersResponse', ledgersResponse)

  const getPostingStatusBadge = (status: string) => {
    const variants = {
      PENDING: 'outline',
      POSTED: 'default',
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    )
  }

  const getTransactionTypeBadge = (type: string) => {
    const variants = {
      DEBIT: 'outline',
      KREDIT: 'outline',
    } as const

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'outline'}>
        {type}
      </Badge>
    )
  }

  if (error) {
    return (
      <ErrorState
        type="server"
        title={t('ledgersList.failedToLoad')}
        message={t('ledgersList.errorLoading')}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('ledgersList.title')}
          </h1>
          <p className="text-muted-foreground">{t('ledgersList.subtitle')}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              {t('ledgersList.createLedgerEntry')}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => router.navigate({ to: ROUTES.LEDGERS_KAS })}
            >
              <Plus className="w-4 h-4 mr-2" />
              {LEDGER_TYPE_LABELS.KAS}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {t('ledgersList.searchAndFilter')}
          </CardTitle>
          <CardDescription>
            {t('ledgersList.searchDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('ledgersList.search')}
              </label>
              <div className="relative">
                <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('ledgersList.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('ledgersList.fromDate')}
              </label>
              <Input
                type="date"
                value={dateInputs.dateFrom}
                onChange={(e) => handleDateChange('dateFrom', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('ledgersList.toDate')}
              </label>
              <Input
                type="date"
                value={dateInputs.dateTo}
                onChange={(e) => handleDateChange('dateTo', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('ledgersList.postingStatus')}
              </label>
              <Select
                value={filters.postingStatus || 'all'}
                onValueChange={(value) =>
                  handleFilterChange('postingStatus', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('ledgersList.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('ledgersList.allStatuses')}
                  </SelectItem>
                  <SelectItem value="PENDING">
                    {t('ledgersList.pending')}
                  </SelectItem>
                  <SelectItem value="POSTED">
                    {t('ledgersList.posted')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('ledgersList.itemsPerPage')}
              </label>
              <Select
                value={String(filters.limit || 10)}
                onValueChange={(value) =>
                  handleFilterChange('limit', parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ledger List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {t('ledgersList.ledgerEntries')}
            {ledgersResponse?.pagination && (
              <span className="text-sm font-normal text-muted-foreground">
                ({ledgersResponse.pagination.total} {t('ledgersList.total')})
              </span>
            )}
          </CardTitle>
          <CardDescription>{t('ledgersList.viewAndManage')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState variant="card" />
          ) : !ledgersResponse?.data || ledgersResponse.data.length === 0 ? (
            <EmptyState
              type={
                searchTerm || Object.keys(filters).length > 2
                  ? 'search'
                  : 'data'
              }
              title={
                searchTerm || Object.keys(filters).length > 2
                  ? t('ledgersList.noEntriesFound')
                  : t('ledgersList.noEntriesYet')
              }
              description={
                searchTerm || Object.keys(filters).length > 2
                  ? t('ledgersList.adjustCriteria')
                  : t('ledgersList.createFirstEntry')
              }
              action={{
                label: t('ledgersList.createLedgerEntry'),
                onClick: () => router.navigate({ to: '/ledgers/kas' }),
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('ledgersList.reference')}</TableHead>
                      <TableHead>{t('ledgersList.description')}</TableHead>
                      <TableHead>{t('ledgersList.amount')}</TableHead>
                      {/* <TableHead>{t('ledgersList.type')}</TableHead> */}
                      <TableHead>{t('ledgersList.transaction')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('ledgersList.date')}</TableHead>
                      <TableHead>{t('ledgersList.account')}</TableHead>
                      <TableHead className="text-right">
                        {t('users.actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgersResponse.data.map((ledger) => (
                      <TableRow key={ledger.id}>
                        <TableCell className="font-medium">
                          {ledger.referenceNumber}
                        </TableCell>
                        <TableCell className="max-w-48">
                          <div className="truncate" title={ledger.description}>
                            {ledger.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {formatCurrency(ledger.amount)}
                          </div>
                        </TableCell>
                        {/* <TableCell>
                          {getLedgerTypeBadge(ledger.ledgerType)}
                        </TableCell> */}
                        <TableCell>
                          {getTransactionTypeBadge(ledger.transactionType)}
                        </TableCell>
                        <TableCell>
                          {getPostingStatusBadge(ledger.postingStatus)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(ledger.ledgerDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {ledger.accountDetail?.accountName || 'N/A'}
                            <div className="text-xs text-muted-foreground">
                              {ledger.accountDetail?.accountNumber}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {ledger.accountDetail?.transactionType}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(ledger.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(ledger.id)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDelete(ledger.id, ledger.description)
                              }
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {ledgersResponse?.pagination && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {t('ledgersList.showing')}{' '}
                    {((filters.page || 1) - 1) * (filters.limit || 10) + 1}{' '}
                    {t('ledgersList.to')}{' '}
                    {Math.min(
                      (filters.page || 1) * (filters.limit || 10),
                      ledgersResponse.pagination.total,
                    )}{' '}
                    {t('ledgersList.of')} {ledgersResponse.pagination.total}{' '}
                    {t('ledgersList.entries')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange((filters.page || 1) - 1)}
                      disabled={
                        !filters.page ||
                        filters.page <= 1 ||
                        !ledgersResponse.pagination?.hasPrev
                      }
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      {t('ledgersList.previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange((filters.page || 1) + 1)}
                      disabled={
                        !ledgersResponse.pagination?.hasNext ||
                        (filters.page || 1) >= ledgersResponse.pagination.pages
                      }
                    >
                      {t('ledgersList.next')}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

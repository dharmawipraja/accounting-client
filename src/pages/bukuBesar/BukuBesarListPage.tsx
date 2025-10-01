import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { useAuth } from '@/hooks/useAuth'
import { useJournalLedgersQuery } from '@/hooks/useJournalLedgersQuery'
import { useTranslation } from '@/hooks/useTranslation'
import type { JournalLedgerQueryParams } from '@/types/journalLedgers'
import {
  formatDateForAPI,
  getDateRange,
  getDateRangeForInput,
} from '@/utils/date'
import { canManageLedgers } from '@/utils/rolePermissions'
import { ArrowLeft, ArrowRight, FileSpreadsheet, Search } from 'lucide-react'
import React, { useMemo, useState } from 'react'

export const BukuBesarListPage: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')

  // Get current month date range for display
  const currentMonthRangeForInput = getDateRangeForInput('month')
  const currentMonthRangeForAPI = getDateRange('month')

  const [filters, setFilters] = useState<Partial<JournalLedgerQueryParams>>({
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
    const params: JournalLedgerQueryParams = {
      ...filters,
      ...(searchTerm && { search: searchTerm }),
      includeAccounts: true,
    }
    return params
  }, [filters, searchTerm])

  const {
    data: journalLedgersResponse,
    isLoading,
    error,
  } = useJournalLedgersQuery(queryParams)

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

  const handleFilterChange = (
    key: keyof JournalLedgerQueryParams,
    value: any,
  ) => {
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

  const getPostingStatusBadge = (status: string) => {
    const variants = {
      PENDING: 'secondary',
      POSTED: 'default',
    } as const

    const labels = {
      PENDING: t('bukuBesarList.pending'),
      POSTED: t('bukuBesarList.posted'),
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (error) {
    return (
      <ErrorState
        type="server"
        title={t('bukuBesarList.failedToLoad')}
        message={t('bukuBesarList.errorLoading')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-6 mx-auto sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {t('bukuBesarList.title')}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {t('bukuBesarList.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              {t('bukuBesarList.searchAndFilter')}
            </CardTitle>
            <CardDescription>
              {t('bukuBesarList.searchDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('bukuBesarList.search')}
                </label>
                <Input
                  placeholder={t('bukuBesarList.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('bukuBesarList.fromDate')}
                </label>
                <Input
                  type="date"
                  value={dateInputs.dateFrom}
                  onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('bukuBesarList.toDate')}
                </label>
                <Input
                  type="date"
                  value={dateInputs.dateTo}
                  onChange={(e) => handleDateChange('dateTo', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('bukuBesarList.postingStatus')}
                </label>
                <Select
                  value={filters.postingStatus || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('postingStatus', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('bukuBesarList.allStatuses')}
                    </SelectItem>
                    <SelectItem value="PENDING">
                      {t('bukuBesarList.pending')}
                    </SelectItem>
                    <SelectItem value="POSTED">
                      {t('bukuBesarList.posted')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('bukuBesarList.itemsPerPage')}
                </label>
                <Select
                  value={filters.limit?.toString() || '10'}
                  onValueChange={(value) =>
                    handleFilterChange('limit', parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Journal Ledger List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              {t('bukuBesarList.journalLedgerEntries')}
              {journalLedgersResponse?.pagination && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({journalLedgersResponse.pagination.total}{' '}
                  {t('bukuBesarList.total')})
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {t('bukuBesarList.viewAndManage')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState variant="card" />
            ) : !journalLedgersResponse?.data ||
              journalLedgersResponse.data.journalLedgers.length === 0 ? (
              <EmptyState
                type={
                  searchTerm || Object.keys(filters).length > 2
                    ? 'search'
                    : 'data'
                }
                title={
                  searchTerm || Object.keys(filters).length > 2
                    ? t('bukuBesarList.noEntriesFound')
                    : t('bukuBesarList.noEntriesYet')
                }
                description={
                  searchTerm || Object.keys(filters).length > 2
                    ? t('bukuBesarList.adjustCriteria')
                    : t('bukuBesarList.createFirstEntry')
                }
              />
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden border rounded-md">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[100px] font-semibold">
                            No. Akun
                          </TableHead>
                          <TableHead className="min-w-[200px] font-semibold">
                            Nama Akun
                          </TableHead>
                          <TableHead className="w-[120px] text-right font-semibold">
                            Debit
                          </TableHead>
                          <TableHead className="w-[120px] text-right font-semibold">
                            Kredit
                          </TableHead>
                          <TableHead className="w-[100px] font-semibold">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {journalLedgersResponse.data.journalLedgers.map(
                          (entry) => (
                            <TableRow
                              key={entry.id}
                              className="hover:bg-muted/50"
                            >
                              <TableCell className="font-medium">
                                {entry.accountDetail?.accountNumber ||
                                  entry.accountDetailAccountNumber}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {entry.accountDetail?.accountName || 'N/A'}
                              </TableCell>
                              <TableCell className="font-mono text-right">
                                {formatCurrency(entry.amountDebit || 0)}
                              </TableCell>
                              <TableCell className="font-mono text-right">
                                {formatCurrency(entry.amountCredit || 0)}
                              </TableCell>
                              <TableCell>
                                {getPostingStatusBadge(entry.postingStatus)}
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Summary Totals */}
                  {journalLedgersResponse.data.journalLedgers.length > 0 && (
                    <div className="border-t bg-muted/30">
                      <div className="flex justify-end p-4">
                        <div className="flex space-x-8 text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">
                              Total Debit:
                            </span>
                            <span className="font-mono font-semibold text-green-700">
                              {formatCurrency(
                                journalLedgersResponse.data.totalDebit,
                              )}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">
                              Total Kredit:
                            </span>
                            <span className="font-mono font-semibold text-red-700">
                              {formatCurrency(
                                journalLedgersResponse.data.totalCredit,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {journalLedgersResponse?.pagination && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {t('bukuBesarList.showing')}{' '}
                      {((filters.page || 1) - 1) * (filters.limit || 10) + 1}{' '}
                      {t('bukuBesarList.to')}{' '}
                      {Math.min(
                        (filters.page || 1) * (filters.limit || 10),
                        journalLedgersResponse.pagination.total,
                      )}{' '}
                      {t('bukuBesarList.of')}{' '}
                      {journalLedgersResponse.pagination.total}{' '}
                      {t('bukuBesarList.entries')}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handlePageChange((filters.page || 1) - 1)
                        }
                        disabled={
                          !filters.page ||
                          filters.page <= 1 ||
                          !journalLedgersResponse.pagination?.hasPrev
                        }
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        {t('bukuBesarList.previous')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handlePageChange((filters.page || 1) + 1)
                        }
                        disabled={
                          !journalLedgersResponse.pagination?.hasNext ||
                          (filters.page || 1) >=
                            journalLedgersResponse.pagination.pages
                        }
                      >
                        {t('bukuBesarList.next')}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

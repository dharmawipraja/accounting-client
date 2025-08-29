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
import type { LedgerQueryParams } from '@/types/ledgers'
import { formatCurrency } from '@/utils'
import { formatDate } from '@/utils/date'
import { canManageLedgers } from '@/utils/rolePermissions'
import { useRouter } from '@tanstack/react-router'
import {
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
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Partial<LedgerQueryParams>>({
    page: 1,
    limit: 10,
  })

  const canManage = user?.role ? canManageLedgers(user.role) : false

  // Build query parameters
  const queryParams = useMemo(() => {
    const params: LedgerQueryParams = {
      ...filters,
      ...(searchTerm && { search: searchTerm }),
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
        title="Access Denied"
        message="You don't have permission to access ledger management."
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
    if (
      window.confirm(
        `Are you sure you want to delete the ledger entry "${description}"? This action cannot be undone.`,
      )
    ) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch {
        // Error handling is done in the mutation
      }
    }
  }

  const getLedgerTypeBadge = (type: string) => {
    const variants = {
      KAS_MASUK: 'default',
      KAS_KELUAR: 'secondary',
    } as const

    const labels = {
      KAS_MASUK: 'Cash In',
      KAS_KELUAR: 'Cash Out',
    }

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'outline'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    )
  }

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
      DEBIT: 'destructive',
      CREDIT: 'default',
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
        title="Failed to Load Ledgers"
        message="There was an error loading the ledger entries. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ledgers</h1>
          <p className="text-muted-foreground">
            Manage your ledger entries and transactions
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Ledger Entry
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
            Search & Filter
          </CardTitle>
          <CardDescription>Search and filter ledger entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search description, reference..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ledger Type</label>
              <Select
                value={filters.ledgerType || 'all'}
                onValueChange={(value) =>
                  handleFilterChange('ledgerType', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="KAS_MASUK">Cash In</SelectItem>
                  <SelectItem value="KAS_KELUAR">Cash Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Posting Status</label>
              <Select
                value={filters.postingStatus || 'all'}
                onValueChange={(value) =>
                  handleFilterChange('postingStatus', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="POSTED">Posted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Items per page</label>
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
            Ledger Entries
            {ledgersResponse?.pagination && (
              <span className="text-sm font-normal text-muted-foreground">
                ({ledgersResponse.pagination.total} total)
              </span>
            )}
          </CardTitle>
          <CardDescription>View and manage all ledger entries</CardDescription>
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
                  ? 'No ledger entries found'
                  : 'No ledger entries yet'
              }
              description={
                searchTerm || Object.keys(filters).length > 2
                  ? 'Try adjusting your search criteria or filters.'
                  : 'Create your first ledger entry to get started.'
              }
              action={{
                label: 'Create Ledger Entry',
                onClick: () => router.navigate({ to: '/ledgers/new' }),
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                        <TableCell>
                          {getLedgerTypeBadge(ledger.ledgerType)}
                        </TableCell>
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
              {ledgersResponse.pagination &&
                ledgersResponse.pagination.pages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing{' '}
                      {(ledgersResponse.pagination.page - 1) *
                        ledgersResponse.pagination.limit +
                        1}{' '}
                      to{' '}
                      {Math.min(
                        ledgersResponse.pagination.page *
                          ledgersResponse.pagination.limit,
                        ledgersResponse.pagination.total,
                      )}{' '}
                      of {ledgersResponse.pagination.total} entries
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handlePageChange(ledgersResponse.pagination.page - 1)
                        }
                        disabled={ledgersResponse.pagination.page <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {ledgersResponse.pagination.page} of{' '}
                        {ledgersResponse.pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handlePageChange(ledgersResponse.pagination.page + 1)
                        }
                        disabled={
                          ledgersResponse.pagination.page >=
                          ledgersResponse.pagination.pages
                        }
                      >
                        Next
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

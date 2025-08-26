import { Link, useNavigate } from '@tanstack/react-router'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  Building2,
  ChevronDown,
  DollarSign,
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { SubmitOverlay } from '@/components/ui/submit-overlay'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  useAccountsGeneralQuery,
  useDeleteAccountGeneralMutation,
} from '@/hooks/useAccountsQuery'
import type { AccountGeneral } from '@/types/accounts'

const columnHelper = createColumnHelper<AccountGeneral>()

export default function AccountsGeneralListPage() {
  const navigate = useNavigate()

  // Table state
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
  })

  // Queries and mutations
  const {
    data: accountsData,
    isLoading,
    isError,
    refetch,
  } = useAccountsGeneralQuery(pagination)

  const deleteAccountMutation = useDeleteAccountGeneralMutation()

  // Table columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('accountNumber', {
        header: 'Account Code',
        cell: ({ getValue }) => (
          <div className="font-mono text-sm font-medium text-foreground">
            {getValue()}
          </div>
        ),
      }),
      columnHelper.accessor('accountName', {
        header: 'Account Name',
        cell: ({ row }) => {
          const account = row.original
          return (
            <div className="space-y-1">
              <div className="font-medium text-foreground">
                {account.accountName}
              </div>
              <div className="max-w-xs text-sm truncate text-muted-foreground">
                {account.accountCategory}
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor('accountCategory', {
        header: 'Category',
        cell: ({ getValue }) => {
          const category = getValue()
          const categoryColors = {
            ASSET: 'bg-blue-100 text-blue-700 border-blue-200',
            HUTANG: 'bg-red-100 text-red-700 border-red-200',
            MODAL: 'bg-green-100 text-green-700 border-green-200',
            PENDAPATAN: 'bg-purple-100 text-purple-700 border-purple-200',
            BIAYA: 'bg-orange-100 text-orange-700 border-orange-200',
          }
          return (
            <Badge
              variant="outline"
              className={`${categoryColors[category] || 'bg-gray-100 text-gray-700'} capitalize`}
            >
              {category.toLowerCase()}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('reportType', {
        header: 'Report Type',
        cell: ({ getValue }) => {
          const reportType = getValue()
          return (
            <Badge
              variant={reportType === 'NERACA' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {reportType.toLowerCase().replace('_', ' ')}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created',
        cell: ({ getValue }) => {
          const value = getValue()
          return (
            <div className="text-sm text-muted-foreground">
              {value ? format(new Date(value), 'MMM dd, yyyy') : 'N/A'}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const account = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-8 h-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link
                    to="/accounts/general"
                    search={{ view: account.accountNumber }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/accounts/general/$id/edit"
                    params={{ id: account.accountNumber }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() =>
                    deleteAccountMutation.mutate(account.accountNumber)
                  }
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      }),
    ],
    [deleteAccountMutation],
  )

  // Table instance
  const table = useReactTable({
    data: accountsData?.data || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  })

  const paginationInfo = accountsData?.pagination || {
    page: 1,
    pages: 1,
    total: 0,
    limit: 10,
  }

  // Stats data
  const stats = useMemo(() => {
    const accounts = accountsData?.data || []
    return [
      {
        title: 'Total Accounts',
        value: paginationInfo.total,
        icon: Building2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      },
      {
        title: 'Asset Accounts',
        value: accounts.filter(
          (a: AccountGeneral) => a.accountCategory === 'ASSET',
        ).length,
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950/20',
      },
      {
        title: 'Income Accounts',
        value: accounts.filter(
          (a: AccountGeneral) => a.accountCategory === 'PENDAPATAN',
        ).length,
        icon: DollarSign,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      },
      {
        title: 'This Month',
        value: accounts.filter((a: AccountGeneral) => {
          if (!a.createdAt) return false
          const accountDate = new Date(a.createdAt)
          const now = new Date()
          return (
            accountDate.getMonth() === now.getMonth() &&
            accountDate.getFullYear() === now.getFullYear()
          )
        }).length,
        icon: Users,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      },
    ]
  }, [accountsData?.data, paginationInfo.total])

  return (
    <div className="container px-4 py-8 mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            General Accounts
          </h1>
          <p className="text-muted-foreground">
            Manage your chart of accounts and financial structure
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link to="/accounts/general/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.title}
              className="relative overflow-hidden border-0 shadow-lg"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b border-border/50 bg-muted/30">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <CardTitle className="text-xl font-semibold">
              Chart of Accounts ({paginationInfo.total})
            </CardTitle>

            {/* Search and Filters */}
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={globalFilter ?? ''}
                  onChange={(event) =>
                    setGlobalFilter(String(event.target.value))
                  }
                  className="w-full pl-9 sm:w-64 bg-background/50"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-between min-w-[140px]"
                  >
                    Columns
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuItem
                          key={column.id}
                          className="capitalize"
                          onSelect={() =>
                            column.toggleVisibility(!column.getIsVisible())
                          }
                        >
                          <input
                            type="checkbox"
                            checked={column.getIsVisible()}
                            onChange={() =>
                              column.toggleVisibility(!column.getIsVisible())
                            }
                            className="mr-2"
                          />
                          {column.id}
                        </DropdownMenuItem>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {deleteAccountMutation.isPending && (
            <SubmitOverlay isVisible={true} />
          )}

          {isError ? (
            <div className="p-6">
              <ErrorState type="server" title="Failed to load accounts" />
              <div className="mt-4">
                <Button onClick={() => refetch()} variant="outline">
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden border rounded-lg border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      className="hover:bg-transparent border-border/50"
                    >
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="font-semibold">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        {columns.map((_, colIndex) => (
                          <TableCell key={colIndex}>
                            <div className="flex items-center space-x-3">
                              <div className="w-16 h-4 rounded bg-muted animate-pulse"></div>
                              <div className="space-y-2">
                                <div className="w-32 h-4 rounded bg-muted animate-pulse"></div>
                                <div className="w-24 h-3 rounded bg-muted animate-pulse"></div>
                              </div>
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : table.getRowModel().rows?.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className="transition-colors hover:bg-muted/30"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-4">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="p-0">
                        <EmptyState
                          type={globalFilter ? 'search' : 'create'}
                          title={
                            globalFilter
                              ? 'No accounts found'
                              : 'No accounts yet'
                          }
                          description={
                            globalFilter
                              ? `No accounts match "${globalFilter}". Try adjusting your search terms.`
                              : 'Get started by creating your first chart of accounts.'
                          }
                          action={{
                            label: globalFilter
                              ? 'Clear search'
                              : 'Add Account',
                            onClick: globalFilter
                              ? () => setGlobalFilter('')
                              : () => navigate({ to: '/accounts/general/new' }),
                            icon: globalFilter ? (
                              <Search className="w-4 h-4" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            ),
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoading && table.getRowModel().rows?.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 p-6 border-t sm:flex-row border-border/50">
              <div className="text-sm text-muted-foreground">
                Showing {table.getRowModel().rows.length} of{' '}
                {paginationInfo.total} accounts
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  disabled={pagination.page === 1}
                  className="hidden sm:flex"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({
                    length: Math.min(5, paginationInfo.pages),
                  }).map((_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={
                          pagination.page === page ? 'default' : 'outline'
                        }
                        size="sm"
                        onClick={() =>
                          setPagination((prev) => ({ ...prev, page }))
                        }
                        className="w-8 h-8"
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(paginationInfo.pages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === paginationInfo.pages}
                  className="hidden sm:flex"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import Header from '@/components/Header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { TableSkeleton } from '@/components/ui/loading-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  ACCOUNT_CATEGORIES,
  ACCOUNT_CATEGORY_LABELS,
  PAGINATION_CONFIG,
} from '@/constants'
import {
  useAccountsDetailQuery,
  useDeleteAccountDetailMutation,
} from '@/hooks/useAccountsQuery'
import { useAuth } from '@/hooks/useAuth'
import type { AccountDetail, AccountQueryParams } from '@/types/accounts'
import { canManageAccounts } from '@/utils/rolePermissions'
import { useNavigate } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  ArrowUpDown,
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

export function AccountsDetailListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState<number>(
    PAGINATION_CONFIG.DEFAULT_PAGE,
  )
  const [pageSize] = useState(PAGINATION_CONFIG.DEFAULT_LIMIT)

  // Build query parameters
  const queryParams: AccountQueryParams = useMemo(() => {
    const params: AccountQueryParams = {
      page: currentPage,
      limit: pageSize,
    }

    if (globalFilter) {
      params.search = globalFilter
    }

    if (categoryFilter && categoryFilter !== 'all') {
      params.accountCategory = categoryFilter as any
    }

    return params
  }, [currentPage, pageSize, globalFilter, categoryFilter])

  const {
    data: accountsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useAccountsDetailQuery(queryParams)

  const deleteAccountMutation = useDeleteAccountDetailMutation()

  const handleDelete = async (id: string) => {
    try {
      await deleteAccountMutation.mutateAsync(id)
    } catch {
      toast.error('Failed to delete account')
    }
  }

  const getBadgeVariant = (category: string) => {
    switch (category) {
      case 'ASSET':
        return 'default'
      case 'HUTANG':
        return 'destructive'
      case 'MODAL':
        return 'secondary'
      case 'PENDAPATAN':
        return 'outline'
      case 'BIAYA':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const columns: ColumnDef<AccountDetail>[] = [
    {
      accessorKey: 'accountNumber',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Account Number
          <ArrowUpDown className="w-4 h-4 ml-2" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('accountNumber')}</div>
      ),
    },
    {
      accessorKey: 'accountName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Account Name
          <ArrowUpDown className="w-4 h-4 ml-2" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('accountName')}</div>
      ),
    },
    {
      accessorKey: 'accountCategory',
      header: 'Category',
      cell: ({ row }) => {
        const category = row.getValue('accountCategory') as string
        return (
          <Badge variant={getBadgeVariant(category)}>
            {
              ACCOUNT_CATEGORY_LABELS[
                category as keyof typeof ACCOUNT_CATEGORY_LABELS
              ]
            }
          </Badge>
        )
      },
    },
    {
      accessorKey: 'accountGeneral',
      header: 'General Account',
      cell: ({ row }) => {
        const accountGeneral = row.original.accountGeneral
        if (!accountGeneral)
          return <div className="text-muted-foreground">-</div>
        return (
          <div className="text-sm">
            <div className="font-medium">{accountGeneral.accountName}</div>
            <div className="text-muted-foreground">
              {accountGeneral.accountNumber}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Amount
          <ArrowUpDown className="w-4 h-4 ml-2" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('amount'))
        return (
          <div className="font-medium text-right">
            Rp {amount.toLocaleString('id-ID')}
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Created At
          <ArrowUpDown className="w-4 h-4 ml-2" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'))
        return <div>{format(date, 'dd/MM/yyyy HH:mm')}</div>
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const account = row.original
        const canManage = canManageAccounts(user?.role)

        if (!canManage) return null

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-8 h-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  navigate({
                    to: '/accounts/detail/$id/edit',
                    params: { id: account.id },
                  })
                }
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will delete the detail account "
                      {account.accountName}". This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(account.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: accountsData?.data || [],
    columns,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
  })

  const canManage = canManageAccounts(user?.role)

  if (isLoading) {
    return (
      <div className="container px-4 py-8 mx-auto space-y-6">
        <Header />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detail Accounts</h1>
          <p className="text-muted-foreground">
            Manage your detail accounts linked to general accounts
          </p>
        </div>
        <TableSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container px-4 py-8 mx-auto space-y-6">
        <Header />
        <ErrorState
          type="server"
          title="Error Loading Accounts"
          message={error?.message || 'Failed to load detail accounts.'}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const accounts = accountsData?.data || []
  const pagination = accountsData?.pagination

  return (
    <div className="container px-4 py-8 mx-auto space-y-6">
      <Header />

      {deleteAccountMutation.isPending && (
        <SubmitOverlay isVisible={true} message="Deleting account..." />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detail Accounts</h1>
          <p className="text-muted-foreground">
            Manage your detail accounts linked to general accounts
          </p>
        </div>
        {canManage && (
          <Button onClick={() => navigate({ to: '/accounts/detail/new' })}>
            <Plus className="w-4 h-4 mr-2" />
            Add Detail Account
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail Accounts</CardTitle>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.values(ACCOUNT_CATEGORIES).map((category) => (
                  <SelectItem key={category} value={category}>
                    {
                      ACCOUNT_CATEGORY_LABELS[
                        category as keyof typeof ACCOUNT_CATEGORY_LABELS
                      ]
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <EmptyState
              type="data"
              title="No Detail Accounts Found"
              description="There are no detail accounts to display."
              action={{
                label: 'Add First Detail Account',
                onClick: () => navigate({ to: '/accounts/detail/new' }),
                icon: <Plus className="w-4 h-4" />,
              }}
            />
          ) : (
            <>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
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
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
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
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          No results found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {pagination && (
                <div className="flex items-center justify-between py-4 space-x-2">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total,
                    )}{' '}
                    of {pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {pagination.page} of {pagination.pages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      disabled={currentPage >= pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

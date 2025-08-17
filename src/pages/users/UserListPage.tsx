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
import { SubmitOverlay } from '@/components/ui/submit-overlay'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { useDeleteUserMutation, useUsersQuery } from '@/hooks/useUsersQuery'
import type { User } from '@/types/api'
import type { UserQueryParams } from '@/types/query'
import {
  canDeleteUser,
  canManageSpecificUser,
  getRoleBadgeVariant,
  getRoleLabel,
} from '@/utils/rolePermissions'
import { useNavigate } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import {
  ArrowUpDown,
  ChevronDown,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

export function UserListPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
  })

  // React Query hooks
  const queryParams: UserQueryParams = {
    page: pagination.page,
    limit: pagination.limit,
    search: globalFilter || undefined,
  }

  const {
    data: usersResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useUsersQuery(queryParams)

  const deleteUserMutation = useDeleteUserMutation()

  const users = usersResponse?.data || []
  const paginationInfo = usersResponse?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteUserMutation.mutateAsync(id)
    } catch {
      toast.error('Failed to delete user')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default'
      case 'INACTIVE':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 lg:px-3"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.getValue('name')}</div>
            <div className="text-sm text-muted-foreground">
              {row.original.username}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 lg:px-3"
          >
            Role
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant={getRoleBadgeVariant(row.getValue('role'))}>
            {getRoleLabel(row.getValue('role'))}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 lg:px-3"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant={getStatusBadgeVariant(row.getValue('status'))}>
            {row.getValue('status') === 'ACTIVE' ? 'Active' : 'Inactive'}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 lg:px-3"
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-sm">
            {new Date(row.getValue('createdAt')).toLocaleDateString()}
          </div>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
          const user = row.original

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canManageSpecificUser(
                  currentUser?.role || 'NASABAH',
                  currentUser?.id || '',
                  user.id,
                  user.role,
                ) && (
                  <DropdownMenuItem
                    onClick={() => navigate({ to: `/users/${user.id}/edit` })}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => navigate({ to: `/users/${user.id}` })}
                >
                  View Details
                </DropdownMenuItem>
                {canDeleteUser(
                  currentUser?.role || 'NASABAH',
                  currentUser?.id || '',
                  user.id,
                  user.role,
                ) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete the user account for {user.name}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(user.id)}
                          disabled={deleteUserMutation.isPending}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteUserMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [currentUser, navigate, deleteUserMutation.isPending],
  )

  const table = useReactTable({
    data: users,
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
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  })
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Users</h1>
              <p className="text-muted-foreground">
                Manage user accounts and permissions
              </p>
            </div>
            <Button
              onClick={() => navigate({ to: '/users/new' })}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Filter users..."
                    value={globalFilter ?? ''}
                    onChange={(event) =>
                      setGlobalFilter(String(event.target.value))
                    }
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="ml-auto"
                      disabled={isLoading}
                    >
                      Columns <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table
                      .getAllColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => {
                        return (
                          <DropdownMenuItem
                            key={column.id}
                            className="capitalize"
                            onClick={() =>
                              column.toggleVisibility(!column.getIsVisible())
                            }
                          >
                            <input
                              type="checkbox"
                              checked={column.getIsVisible()}
                              onChange={(e) =>
                                column.toggleVisibility(!!e.target.checked)
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
            </CardHeader>
            <CardContent>
              {isError ? (
                <ErrorState
                  type="server"
                  title="Failed to load users"
                  message={
                    error?.message ||
                    'Unable to fetch user data. Please try again.'
                  }
                  onRetry={() => refetch()}
                  isRetrying={isLoading}
                />
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                              return (
                                <TableHead key={header.id}>
                                  {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                      )}
                                </TableHead>
                              )
                            })}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableSkeleton
                            rows={pagination.limit}
                            columns={columns.length}
                          />
                        ) : table.getRowModel().rows?.length ? (
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
                            <TableCell colSpan={columns.length} className="p-0">
                              <EmptyState
                                type={globalFilter ? 'search' : 'create'}
                                title={
                                  globalFilter
                                    ? 'No users found'
                                    : 'No users yet'
                                }
                                description={
                                  globalFilter
                                    ? `No users match "${globalFilter}". Try adjusting your search terms.`
                                    : 'Get started by creating your first user account.'
                                }
                                action={{
                                  label: globalFilter
                                    ? 'Clear search'
                                    : 'Add User',
                                  onClick: globalFilter
                                    ? () => setGlobalFilter('')
                                    : () => navigate({ to: '/users/new' }),
                                  icon: globalFilter ? (
                                    <Search className="h-4 w-4" />
                                  ) : (
                                    <UserPlus className="h-4 w-4" />
                                  ),
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination - only show if there's data */}
                  {!isLoading && table.getRowModel().rows?.length > 0 && (
                    <div className="flex items-center justify-between space-x-2 py-4">
                      <div className="flex-1 text-sm text-muted-foreground">
                        {table.getFilteredSelectedRowModel().rows.length >
                          0 && (
                          <span>
                            {table.getFilteredSelectedRowModel().rows.length} of{' '}
                            {table.getFilteredRowModel().rows.length} row(s)
                            selected.
                          </span>
                        )}
                        <div className="mt-1">
                          Showing {table.getRowModel().rows.length} of{' '}
                          {paginationInfo.total} users
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 lg:space-x-8">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium">Rows per page</p>
                          <select
                            value={`${pagination.limit}`}
                            onChange={(e) => {
                              const newLimit = Number(e.target.value)
                              table.setPageSize(newLimit)
                              setPagination((prev) => ({
                                ...prev,
                                limit: newLimit,
                                page: 1,
                              }))
                            }}
                            disabled={isLoading}
                            className="h-8 w-[70px] rounded border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                              <option key={pageSize} value={pageSize}>
                                {pageSize}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                          Page {paginationInfo.page} of {paginationInfo.pages}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() =>
                              setPagination((prev) => ({ ...prev, page: 1 }))
                            }
                            disabled={paginationInfo.page <= 1 || isLoading}
                          >
                            <span className="sr-only">Go to first page</span>
                            <div className="h-4 w-4">{'<<'}</div>
                          </Button>
                          <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              setPagination((prev) => ({
                                ...prev,
                                page: prev.page - 1,
                              }))
                            }
                            disabled={paginationInfo.page <= 1 || isLoading}
                          >
                            <span className="sr-only">Go to previous page</span>
                            <div className="h-4 w-4">{'<'}</div>
                          </Button>
                          <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              setPagination((prev) => ({
                                ...prev,
                                page: prev.page + 1,
                              }))
                            }
                            disabled={
                              paginationInfo.page >= paginationInfo.pages ||
                              isLoading
                            }
                          >
                            <span className="sr-only">Go to next page</span>
                            <div className="h-4 w-4">{'>'}</div>
                          </Button>
                          <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() =>
                              setPagination((prev) => ({
                                ...prev,
                                page: paginationInfo.pages,
                              }))
                            }
                            disabled={
                              paginationInfo.page >= paginationInfo.pages ||
                              isLoading
                            }
                          >
                            <span className="sr-only">Go to last page</span>
                            <div className="h-4 w-4">{'>>'}</div>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Submit overlay for delete operations */}
          <SubmitOverlay
            isVisible={deleteUserMutation.isPending}
            message="Deleting user..."
          />
        </div>
      </main>
    </div>
  )
}

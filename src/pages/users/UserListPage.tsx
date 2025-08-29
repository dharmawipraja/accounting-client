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
  Activity,
  ChevronDown,
  Edit,
  Eye,
  MoreHorizontal,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  UserPlus,
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

import { useAuth } from '@/hooks/useAuth'
import { useDeleteUserMutation, useUsersQuery } from '@/hooks/useUsersQuery'
import type { User } from '@/types'

const columnHelper = createColumnHelper<User>()

export default function UserListPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

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
    data: usersData,
    isLoading,
    isError,
    refetch,
  } = useUsersQuery(pagination)

  const deleteUserMutation = useDeleteUserMutation()

  // Table columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'User',
        cell: ({ row }) => {
          const user = row.original
          return (
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 text-sm font-semibold text-white rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-foreground">{user.name}</div>
                <div className="text-sm text-muted-foreground">
                  {user.username}
                </div>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor('role', {
        header: 'Role',
        cell: ({ getValue }) => {
          const role = getValue()
          return (
            <Badge
              variant={role === 'ADMIN' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {role}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue()
          return (
            <Badge
              variant={status === 'ACTIVE' ? 'default' : 'secondary'}
              className={`capitalize ${status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' : ''}`}
            >
              {status?.toLowerCase() || 'inactive'}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created',
        cell: ({ getValue }) => (
          <div className="text-sm text-muted-foreground">
            {format(new Date(getValue()), 'MMM dd, yyyy')}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const user = row.original
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
                  <Link to="/users/$id" params={{ id: user.id }}>
                    <Eye className="w-4 h-4 mr-2" />
                    View details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/users/$id/edit" params={{ id: user.id }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit user
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deleteUserMutation.mutate(user.id)}
                  disabled={user.id === currentUser?.id}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete user
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      }),
    ],
    [currentUser?.id, deleteUserMutation],
  )

  // Table instance
  const table = useReactTable({
    data: usersData?.data || [],
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

  const paginationInfo = usersData?.pagination || {
    page: 1,
    pages: 1,
    total: 0,
    limit: 10,
  }

  // Stats data
  const stats = useMemo(() => {
    const users = usersData?.data || []
    return [
      {
        title: 'Total Users',
        value: paginationInfo.total,
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      },
      {
        title: 'Active Users',
        value: users.filter((u) => u.status === 'ACTIVE').length,
        icon: Activity,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950/20',
      },
      {
        title: 'Administrators',
        value: users.filter((u) => u.role === 'ADMIN').length,
        icon: Shield,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      },
      {
        title: 'This Month',
        value: users.filter((u) => {
          const userDate = new Date(u.createdAt)
          const now = new Date()
          return (
            userDate.getMonth() === now.getMonth() &&
            userDate.getFullYear() === now.getFullYear()
          )
        }).length,
        icon: TrendingUp,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      },
    ]
  }, [usersData?.data, paginationInfo.total])

  return (
    <div className="container px-3 py-4 mx-auto space-y-6 sm:px-6 sm:py-8 sm:space-y-8 lg:px-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link to="/users/new">
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.title}
              className="relative overflow-hidden border-0 shadow-lg"
            >
              <CardContent className="p-4 sm:p-6">
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
              Users ({paginationInfo.total})
            </CardTitle>

            {/* Search and Filters */}
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
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
          {/* Loading overlay for delete operations */}
          {deleteUserMutation.isPending && <SubmitOverlay isVisible={true} />}

          {isError ? (
            <div className="p-6">
              <ErrorState
                type="server"
                title="Failed to load users"
                onRetry={() => refetch()}
              />
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
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        {columns.map((_, colIndex) => (
                          <TableCell key={colIndex}>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
                              <div className="space-y-2">
                                <div className="w-24 h-4 rounded bg-muted animate-pulse"></div>
                                <div className="w-16 h-3 rounded bg-muted animate-pulse"></div>
                              </div>
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : table.getRowModel().rows?.length > 0 ? (
                    // Data rows
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
                    // Empty state
                    <TableRow>
                      <TableCell colSpan={columns.length} className="p-0">
                        <EmptyState
                          type={globalFilter ? 'search' : 'create'}
                          title={
                            globalFilter ? 'No users found' : 'No users yet'
                          }
                          description={
                            globalFilter
                              ? `No users match "${globalFilter}". Try adjusting your search terms.`
                              : 'Get started by creating your first user account.'
                          }
                          action={{
                            label: globalFilter ? 'Clear search' : 'Add User',
                            onClick: globalFilter
                              ? () => setGlobalFilter('')
                              : () => navigate({ to: '/users/new' }),
                            icon: globalFilter ? (
                              <Search className="w-4 h-4" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
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

          {/* Pagination */}
          {!isLoading && table.getRowModel().rows?.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 p-6 border-t sm:flex-row border-border/50">
              <div className="text-sm text-muted-foreground">
                Showing {table.getRowModel().rows.length} of{' '}
                {paginationInfo.total} users
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

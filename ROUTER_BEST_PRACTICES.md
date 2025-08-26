# TanStack Router Best Practices

This document outlines the improved TanStack Router implementation and best practices for our application.

## 🎯 Key Improvements Made

### 1. **Route-Level Authentication**

- **Before**: Authentication was handled in components using `<ProtectedRoute>`
- **After**: Authentication is handled at the route level using `beforeLoad`
- **Benefits**: No flash of unauthorized content, better performance, cleaner separation of concerns

### 2. **Centralized Auth Context**

- **Location**: `src/utils/routeAuth.ts`
- **Purpose**: Provides reusable auth guards and context
- **Usage**: Import `requireAuth()`, `requireRoles()`, or `redirectIfAuthenticated()`

### 3. **Type-Safe Router Context**

- **Setup**: Router context is properly typed in `__root.tsx`
- **Benefits**: Full TypeScript support for auth context throughout the app

### 4. **Error Boundaries**

- **Location**: `src/components/ErrorBoundary.tsx`
- **Features**: Development-friendly error display, user-friendly production errors
- **Integration**: Automatically applied at root level

## 📚 Usage Examples

### Basic Route with Authentication

```tsx
export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireAuth(),
  component: DashboardComponent,
})
```

### Route with Role-Based Access

```tsx
export const Route = createFileRoute('/admin')({
  beforeLoad: requireRoles(['ADMIN']),
  component: AdminComponent,
})
```

### Route with Own Access Permission

```tsx
export const Route = createFileRoute('/users/$id/')({
  beforeLoad: ({ params }) =>
    requireRoles(['ADMIN', 'MANAGER'], true, params.id)(),
  component: UserDetailComponent,
})
```

### Route with Search Params Validation

```tsx
const searchSchema = z.object({
  page: z.number().int().positive().catch(1),
  search: z.string().optional(),
})

export const Route = createFileRoute('/users/')({
  beforeLoad: requireRoles(['ADMIN']),
  validateSearch: searchSchema,
  component: UsersListComponent,
})
```

### Route with Data Loader

```tsx
export const Route = createFileRoute('/users/$id/')({
  beforeLoad: requireAuth(),
  loader: async ({ params }) => {
    const user = await userService.getUserById(params.id)
    return { user }
  },
  pendingComponent: LoadingComponent,
  component: UserDetailComponent,
})
```

### Accessing Loader Data

```tsx
function UserDetailComponent() {
  const { user } = Route.useLoaderData()
  return <div>{user.name}</div>
}
```

### Accessing Search Params

```tsx
function UsersListComponent() {
  const { page, search } = Route.useSearch()
  return (
    <div>
      Page: {page}, Search: {search}
    </div>
  )
}
```

## 🚀 Migration Guide

### Updating Existing Routes

1. **Remove ProtectedRoute wrapper from component**
2. **Add beforeLoad to route definition**
3. **Update imports to use AppLayout directly**

**Before:**

```tsx
export const Route = createFileRoute('/users/')({
  component: () => (
    <ProtectedRoute requiredRoles={['ADMIN']}>
      <UserListPage />
    </ProtectedRoute>
  ),
})
```

**After:**

```tsx
export const Route = createFileRoute('/users/')({
  beforeLoad: requireRoles(['ADMIN']),
  component: () => (
    <AppLayout>
      <UserListPage />
    </AppLayout>
  ),
})
```

### Benefits of This Approach

1. **Performance**: No unnecessary re-renders due to auth checks in components
2. **User Experience**: No flash of unauthorized content
3. **Developer Experience**: Better error handling and debugging
4. **Type Safety**: Full TypeScript support throughout
5. **Consistency**: Standardized auth patterns across all routes
6. **Maintainability**: Centralized auth logic, easier to update

## 🔧 Available Auth Guards

- `requireAuth()` - Basic authentication check
- `requireRoles(roles)` - Role-based access control
- `requireRoles(roles, allowOwnAccess, targetUserId)` - Role-based with own access
- `redirectIfAuthenticated()` - Redirect authenticated users (for login page)

## 📖 Additional Resources

- [TanStack Router Documentation](https://tanstack.com/router/latest)
- [Route Authentication Guide](https://tanstack.com/router/latest/docs/framework/react/guide/authentication)
- [Search Params Validation](https://tanstack.com/router/latest/docs/framework/react/guide/search-params)
- [Data Loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)

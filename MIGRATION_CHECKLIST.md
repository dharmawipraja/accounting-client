# Migration Checklist: TanStack Router Improvements

## ✅ Completed

- [x] Created centralized auth utilities (`src/utils/routeAuth.ts`)
- [x] Updated root route with auth context and error boundaries
- [x] Updated router configuration with proper context typing
- [x] Created error boundary components
- [x] Updated key routes with `beforeLoad` authentication
- [x] Created documentation and examples
- [x] Fixed TypeScript and ESLint issues

## 🔄 Routes Still Using Old Pattern

The following routes still use the `<ProtectedRoute>` wrapper and should be updated:

### Account Routes

- [ ] `/src/routes/accounts/general/index.tsx`
- [ ] `/src/routes/accounts/general/new.tsx`
- [ ] `/src/routes/accounts/general/$id/edit.tsx`
- [ ] `/src/routes/accounts/detail/index.tsx`
- [ ] `/src/routes/accounts/detail/new.tsx`
- [ ] `/src/routes/accounts/detail/$id/edit.tsx`

### Ledger Routes

- [ ] `/src/routes/ledgers/kas-masuk.tsx`
- [ ] `/src/routes/ledgers/kas-keluar.tsx`
- [ ] `/src/routes/ledgers/new.tsx`
- [ ] `/src/routes/ledgers/$id/index.tsx`
- [ ] `/src/routes/ledgers/$id/edit.tsx`

### User Routes

- [ ] `/src/routes/users/new.tsx`
- [ ] `/src/routes/users/$id/edit.tsx`

## 🔄 Migration Steps for Each Route

For each route, follow these steps:

1. **Import new auth utilities:**

   ```tsx
   import { requireAuth, requireRoles } from '@/utils/routeAuth'
   import { AppLayout } from '@/components/AppLayout'
   ```

2. **Remove ProtectedRoute import and wrapper**

3. **Add beforeLoad to route definition:**

   ```tsx
   export const Route = createFileRoute('/path')({
     beforeLoad: requireRoles(['ADMIN', 'MANAGER']),
     component: YourComponent,
   })
   ```

4. **Update component to use AppLayout directly:**
   ```tsx
   component: () => (
     <AppLayout>
       <YourPageComponent />
     </AppLayout>
   ),
   ```

## 🎯 Benefits After Full Migration

1. **Performance**: No flash of unauthorized content
2. **User Experience**: Instant redirects for auth failures
3. **Developer Experience**: Better error handling and debugging
4. **Type Safety**: Full TypeScript support throughout
5. **Maintainability**: Centralized auth logic

## 🚀 Optional Enhancements

After completing the basic migration, consider these enhancements:

- [ ] Add search params validation to list routes
- [ ] Implement data loaders for routes that need pre-loaded data
- [ ] Add route-level pending states for better UX
- [ ] Consider implementing route-level caching strategies

## 📝 Example Commands

To update a route quickly, you can use these patterns:

**Before:**

```tsx
export const Route = createFileRoute('/users/new')({
  component: () => (
    <ProtectedRoute requiredRoles={['ADMIN']}>
      <CreateUserPage />
    </ProtectedRoute>
  ),
})
```

**After:**

```tsx
export const Route = createFileRoute('/users/new')({
  beforeLoad: requireRoles(['ADMIN']),
  component: () => (
    <AppLayout>
      <CreateUserPage />
    </AppLayout>
  ),
})
```

import type { UserRole } from '@/types';

/**
 * Role hierarchy and permissions
 */

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 6,
  MANAJER: 5,
  AKUNTAN: 4,
  KASIR: 3,
  KOLEKTOR: 2,
  NASABAH: 1,
};

/**
 * Check if user can access user management routes
 */
export const canAccessUserManagement = (userRole: UserRole): boolean => {
  return userRole === 'ADMIN' || userRole === 'MANAJER';
};

/**
 * Check if user can create/edit users
 */
export const canManageUsers = (userRole: UserRole): boolean => {
  return userRole === 'ADMIN' || userRole === 'MANAJER';
};

/**
 * Get allowed roles that a user can assign to others
 */
export const getAllowedRolesToAssign = (userRole: UserRole): UserRole[] => {
  switch (userRole) {
    case 'ADMIN':
      return ['ADMIN', 'MANAJER', 'AKUNTAN', 'KASIR', 'KOLEKTOR', 'NASABAH'];
    case 'MANAJER':
      return ['AKUNTAN', 'KASIR', 'KOLEKTOR', 'NASABAH'];
    default:
      return [];
  }
};

/**
 * Check if user can assign a specific role
 */
export const canAssignRole = (userRole: UserRole, targetRole: UserRole): boolean => {
  const allowedRoles = getAllowedRolesToAssign(userRole);
  return allowedRoles.includes(targetRole);
};

/**
 * Check if user can view/edit a specific user
 */
export const canManageSpecificUser = (
  currentUserRole: UserRole,
  currentUserId: string,
  targetUserId: string,
  targetUserRole: UserRole
): boolean => {
  // Users can always manage their own profile
  if (currentUserId === targetUserId) {
    return true;
  }

  // Admin can manage everyone
  if (currentUserRole === 'ADMIN') {
    return true;
  }

  // Manager can manage users with lower roles
  if (currentUserRole === 'MANAJER') {
    const allowedRoles = getAllowedRolesToAssign(currentUserRole);
    return allowedRoles.includes(targetUserRole);
  }

  // Other roles cannot manage other users
  return false;
};

/**
 * Check if user can delete a specific user
 */
export const canDeleteUser = (
  currentUserRole: UserRole,
  currentUserId: string,
  targetUserId: string,
  targetUserRole: UserRole
): boolean => {
  // Users cannot delete themselves
  if (currentUserId === targetUserId) {
    return false;
  }

  // Admin can delete everyone except other admins
  if (currentUserRole === 'ADMIN') {
    return targetUserRole !== 'ADMIN';
  }

  // Manager can delete users with lower roles
  if (currentUserRole === 'MANAJER') {
    const allowedRoles = getAllowedRolesToAssign(currentUserRole);
    return allowedRoles.includes(targetUserRole);
  }

  // Other roles cannot delete users
  return false;
};

/**
 * Get role display label
 */
export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    ADMIN: 'Administrator',
    MANAJER: 'Manager',
    AKUNTAN: 'Accountant',
    KASIR: 'Cashier',
    KOLEKTOR: 'Collector',
    NASABAH: 'Customer',
  };
  return labels[role];
};

/**
 * Get role badge variant for UI
 */
export const getRoleBadgeVariant = (role: UserRole): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (role) {
    case 'ADMIN':
      return 'destructive';
    case 'MANAJER':
      return 'default';
    case 'AKUNTAN':
      return 'secondary';
    default:
      return 'outline';
  }
};

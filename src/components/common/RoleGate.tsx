import type { ReactNode } from 'react';
import { useSession, type Role } from '@/stores/session';

/** Render children only when the current user's role is in `allow`. */
export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const role = useSession((s) => s.user?.role);
  if (!role || !allow.includes(role)) return null;
  return <>{children}</>;
}

export function useRole(): Role | undefined {
  return useSession((s) => s.user?.role);
}

export function hasRole(role: Role | undefined, allow: Role[]): boolean {
  return !!role && allow.includes(role);
}

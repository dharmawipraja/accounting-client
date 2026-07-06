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

/** False while a token exists but /auth/me hasn't hydrated the user yet.
 *  In that window the role is UNKNOWN — role-gated pages must render their
 *  loading state, never a premature "forbidden". */
export function useRoleReady(): boolean {
  return useSession((s) => !s.accessToken || !!s.user);
}

export function hasRole(role: Role | undefined, allow: Role[]): boolean {
  return !!role && allow.includes(role);
}

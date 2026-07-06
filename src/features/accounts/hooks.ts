import { useQuery } from '@tanstack/react-query';
import { createMasterDataHooks } from '@/lib/crud/createResourceHooks';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import { accountSchema, accountBalanceSchema, type Account, type AccountBalance, type AccountCreatePayload, type AccountUpdatePayload } from './schema';

export const accountsApi = createMasterDataHooks<Account, AccountCreatePayload, AccountUpdatePayload>({
  keys: queryKeys.accounts,
  basePath: '/ledger/accounts',
  itemSchema: accountSchema,
  paginated: true,
});

/** A single account's detail (GET /ledger/accounts/{id}) — for the drill-down header. */
export function useAccount(id: string) {
  return useQuery<Account, ApiError>({
    queryKey: queryKeys.account(id),
    queryFn: () => apiFetch(`/ledger/accounts/${id}`, { schema: accountSchema }),
    enabled: !!id,
  });
}

/** Point-in-time balance (GET /ledger/accounts/{id}/balance?asOf=). */
export function useAccountBalance(id: string, asOf: string) {
  return useQuery<AccountBalance, ApiError>({
    queryKey: queryKeys.accountBalance(id, asOf),
    queryFn: () => apiFetch(`/ledger/accounts/${id}/balance`, { query: { asOf }, schema: accountBalanceSchema }),
    enabled: !!id && !!asOf,
  });
}

import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { queryKeys } from '@/lib/query/keys';
import { accountSchema, type Account, type AccountCreatePayload, type AccountUpdatePayload } from './schema';

export const accountsApi = createResourceHooks<Account, AccountCreatePayload, AccountUpdatePayload>({
  keys: queryKeys.accounts,
  basePath: '/ledger/accounts',
  itemSchema: accountSchema,
  paginated: true,
});

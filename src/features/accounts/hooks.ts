import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { accountSchema, type Account, type AccountCreatePayload, type AccountUpdatePayload } from './schema';

export const accountsApi = createResourceHooks<Account, AccountCreatePayload, AccountUpdatePayload>({
  key: 'accounts',
  basePath: '/ledger/accounts',
  itemSchema: accountSchema,
});

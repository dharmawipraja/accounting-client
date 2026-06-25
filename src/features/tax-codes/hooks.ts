import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { queryKeys } from '@/lib/query/keys';
import { taxCodeSchema, type TaxCode, type TaxCodeCreatePayload, type TaxCodeUpdatePayload } from './schema';

export const taxCodesApi = createResourceHooks<TaxCode, TaxCodeCreatePayload, TaxCodeUpdatePayload>({
  keys: queryKeys.taxCodes,
  basePath: '/tax/codes',
  itemSchema: taxCodeSchema,
  paginated: true,
});

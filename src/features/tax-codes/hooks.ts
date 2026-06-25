import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { taxCodeSchema, type TaxCode, type TaxCodeCreatePayload, type TaxCodeUpdatePayload } from './schema';

export const taxCodesApi = createResourceHooks<TaxCode, TaxCodeCreatePayload, TaxCodeUpdatePayload>({
  key: 'taxCodes',
  basePath: '/tax/codes',
  itemSchema: taxCodeSchema,
  paginated: true,
});

import { createMasterDataHooks } from '@/lib/crud/createResourceHooks';
import { queryKeys } from '@/lib/query/keys';
import { partnerSchema, type Partner, type PartnerCreatePayload, type PartnerUpdatePayload } from './schema';

export const partnersApi = createMasterDataHooks<Partner, PartnerCreatePayload, PartnerUpdatePayload>({
  keys: queryKeys.partners,
  basePath: '/partners',
  itemSchema: partnerSchema,
  paginated: true,
});

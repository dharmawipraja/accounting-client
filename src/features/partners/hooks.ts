import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { partnerSchema, type Partner, type PartnerCreatePayload, type PartnerUpdatePayload } from './schema';

export const partnersApi = createResourceHooks<Partner, PartnerCreatePayload, PartnerUpdatePayload>({
  key: 'partners',
  basePath: '/partners',
  itemSchema: partnerSchema,
  paginated: true,
});

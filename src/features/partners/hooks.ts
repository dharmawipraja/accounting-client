import { useQuery } from '@tanstack/react-query';
import { createMasterDataHooks } from '@/lib/crud/createResourceHooks';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import { partnerSchema, type Partner, type PartnerCreatePayload, type PartnerUpdatePayload } from './schema';

export const partnersApi = createMasterDataHooks<Partner, PartnerCreatePayload, PartnerUpdatePayload>({
  keys: queryKeys.partners,
  basePath: '/partners',
  itemSchema: partnerSchema,
  paginated: true,
});

/** A single partner's detail (GET /partners/{id}) — for the statement header. */
export function usePartner(id: string) {
  return useQuery<Partner, ApiError>({
    queryKey: queryKeys.partner(id),
    queryFn: () => apiFetch(`/partners/${id}`, { schema: partnerSchema }),
    enabled: !!id,
  });
}

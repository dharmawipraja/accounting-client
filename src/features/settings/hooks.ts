import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import { companySettingsSchema, type CompanySettings, type CompanySettingsForm } from './schema';

export function useCompanySettings() {
  return useQuery<CompanySettings, ApiError>({
    queryKey: queryKeys.companySettings,
    queryFn: () => apiFetch('/company/settings', { schema: companySettingsSchema }),
  });
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient();
  return useMutation<CompanySettings, ApiError, CompanySettingsForm>({
    mutationFn: (body) => apiFetch('/company/settings', { method: 'PATCH', body, schema: companySettingsSchema }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.companySettings }),
  });
}

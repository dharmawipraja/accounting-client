import { z } from 'zod';

export const companySettingsSchema = z.object({
  id: z.string().nullish(),
  singleton: z.boolean().nullish(),
  legalName: z.string().nullish(),
  npwp: z.string().nullish(),
  address: z.string().nullish(),
  fiscalYearStartMonth: z.number(),
  baseCurrency: z.string().nullish(),
  segregationOfDutiesEnabled: z.boolean(),
  isPkp: z.boolean(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});
export type CompanySettings = z.infer<typeof companySettingsSchema>;

export const companySettingsFormSchema = z.object({
  legalName: z.string().min(1),
  npwp: z.string(),
  address: z.string(),
  fiscalYearStartMonth: z.number().min(1).max(12),
  segregationOfDutiesEnabled: z.boolean(),
  isPkp: z.boolean(),
});
export type CompanySettingsForm = z.infer<typeof companySettingsFormSchema>;

export function toFormValues(s: CompanySettings): CompanySettingsForm {
  return {
    legalName: s.legalName ?? '',
    npwp: s.npwp ?? '',
    address: s.address ?? '',
    fiscalYearStartMonth: s.fiscalYearStartMonth,
    segregationOfDutiesEnabled: s.segregationOfDutiesEnabled,
    isPkp: s.isPkp,
  };
}

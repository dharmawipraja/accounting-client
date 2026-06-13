import { z } from 'zod';

export const partnerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  npwp: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  isCustomer: z.boolean(),
  isVendor: z.boolean(),
  isActive: z.boolean(),
});
export type Partner = z.infer<typeof partnerSchema>;

const emailOk = (v: string | undefined) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const npwpOk = (v: string | undefined) => {
  if (!v) return true;
  const digits = v.replace(/[.\-\s]/g, '');
  return /^\d+$/.test(digits) && digits.length >= 15 && digits.length <= 16;
};

const baseFields = {
  name: z.string().min(1),
  npwp: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isCustomer: z.boolean(),
  isVendor: z.boolean(),
};

export const partnerCreateSchema = z
  .object({ code: z.string().min(1), ...baseFields })
  .refine((v) => v.isCustomer || v.isVendor, { message: 'atLeastOneType', path: ['isCustomer'] })
  .refine((v) => emailOk(v.email), { message: 'invalidEmail', path: ['email'] })
  .refine((v) => npwpOk(v.npwp), { message: 'invalidNpwp', path: ['npwp'] });
export type PartnerCreateValues = z.infer<typeof partnerCreateSchema>;

export const partnerEditSchema = z
  .object({ ...baseFields, isActive: z.boolean() })
  .refine((v) => v.isCustomer || v.isVendor, { message: 'atLeastOneType', path: ['isCustomer'] })
  .refine((v) => emailOk(v.email), { message: 'invalidEmail', path: ['email'] })
  .refine((v) => npwpOk(v.npwp), { message: 'invalidNpwp', path: ['npwp'] });
export type PartnerEditValues = z.infer<typeof partnerEditSchema>;

export type PartnerCreatePayload = PartnerCreateValues;
export type PartnerUpdatePayload = PartnerEditValues;

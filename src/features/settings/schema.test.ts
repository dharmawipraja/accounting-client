import { describe, expect, it } from 'vitest';
import { companySettingsSchema, toFormValues } from './schema';

describe('company settings schema', () => {
  it('parses settings with null npwp/address', () => {
    const s = companySettingsSchema.parse({
      id: 'c1', singleton: true, legalName: 'My Company', npwp: null, address: null,
      fiscalYearStartMonth: 1, baseCurrency: 'IDR', segregationOfDutiesEnabled: true, isPkp: true,
      createdAt: 'x', updatedAt: 'y',
    });
    expect(s.legalName).toBe('My Company');
    expect(s.segregationOfDutiesEnabled).toBe(true);
  });
  it('toFormValues maps null text to empty strings', () => {
    const f = toFormValues(companySettingsSchema.parse({
      legalName: 'X', npwp: null, address: null, fiscalYearStartMonth: 3,
      segregationOfDutiesEnabled: false, isPkp: false,
    }));
    expect(f).toEqual({ legalName: 'X', npwp: '', address: '', fiscalYearStartMonth: 3, segregationOfDutiesEnabled: false, isPkp: false });
  });
});

import { z } from 'zod';

/** A monetary value as the API's 4-decimal string. */
export const moneyString = z
  .string()
  .regex(/^-?\d+(\.\d{1,4})?$/, 'expected a decimal money string');

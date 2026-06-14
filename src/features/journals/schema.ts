import { z } from 'zod';
import { moneyString } from '@/lib/schemas/common';

export const journalLineSchema = z.object({
  id: z.string(),
  journalEntryId: z.string().nullish(),
  lineNo: z.number(),
  accountId: z.string(),
  debit: moneyString,
  credit: moneyString,
  description: z.string().nullish(),
});
export type JournalLine = z.infer<typeof journalLineSchema>;

export const journalEntrySchema = z.object({
  id: z.string(),
  entryNumber: z.number().nullish(),
  entryRef: z.string().nullish(),
  fiscalYear: z.number().nullish(),
  date: z.string(),
  periodId: z.string().nullish(),
  description: z.string(),
  sourceType: z.string(),
  sourceId: z.string().nullish(),
  status: z.string(),
  reversalOfId: z.string().nullish(),
  reversedById: z.string().nullish(),
  postedBy: z.string().nullish(),
  postedAt: z.string().nullish(),
  lines: z.array(journalLineSchema).default([]),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export const journalEntryListItemSchema = z.object({
  id: z.string(),
  entryRef: z.string().nullish(),
  entryNumber: z.number().nullish(),
  fiscalYear: z.number().nullish(),
  date: z.string(),
  description: z.string(),
  status: z.string(),
  sourceType: z.string(),
  sourceId: z.string().nullish(),
  totalDebit: moneyString,
  lineCount: z.number(),
});
export type JournalEntryListItem = z.infer<typeof journalEntryListItemSchema>;

export const journalEntriesPageSchema = z.object({
  data: z.array(journalEntryListItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});
export type JournalEntriesPage = z.infer<typeof journalEntriesPageSchema>;

export type JournalEntryCreatePayload = {
  date: string;
  description: string;
  lines: { accountId: string; debit?: string; credit?: string; description?: string }[];
};

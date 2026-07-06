import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import { useReport } from '@/features/reports/useReport';
import {
  balanceSheetReportSchema,
  cashFlowReportSchema,
  incomeStatementReportSchema,
  agingReportSchema,
  type BalanceSheetReport,
  type CashFlowReport,
  type IncomeStatementReport,
  type AgingReport,
} from '@/features/reports/schema';
import { draftCountSchema, type DraftCount } from './schema';

// The three financial statements reuse the reports feature's schema + query key
// (`useReport` → queryKeys.report(path, params)), so the dashboard card and the
// report page share one schema and one cache entry. The dashboard reads only the
// summary fields; zod keeps the full hierarchical shape it ignores.
export function useBalanceSheet(asOf: string): UseQueryResult<BalanceSheetReport, ApiError> {
  return useReport('/reports/balance-sheet', { asOf }, balanceSheetReportSchema, !!asOf);
}

export function useIncomeStatement(from: string, to: string, enabled: boolean): UseQueryResult<IncomeStatementReport, ApiError> {
  return useReport('/reports/income-statement', { from, to }, incomeStatementReportSchema, enabled);
}

export function useCashFlow(from: string, to: string, enabled: boolean): UseQueryResult<CashFlowReport, ApiError> {
  return useReport('/reports/cash-flow', { from, to }, cashFlowReportSchema, enabled);
}

export function useDraftCount(): UseQueryResult<DraftCount, ApiError> {
  return useQuery<DraftCount, ApiError>({
    queryKey: queryKeys.draftCount(),
    queryFn: () => apiFetch('/ledger/journal-entries', { query: { status: 'DRAFT', limit: 1 }, schema: draftCountSchema }),
  });
}

/** AR aging as of a date — drives the dashboard's overdue-receivables tile. */
export function useArAging(asOf: string): UseQueryResult<AgingReport, ApiError> {
  return useReport('/reports/ar-aging', { asOf }, agingReportSchema, !!asOf);
}

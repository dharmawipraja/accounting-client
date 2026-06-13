import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';
import {
  balanceSheetSchema,
  cashFlowSchema,
  draftCountSchema,
  incomeStatementSchema,
  type BalanceSheet,
  type CashFlow,
  type DraftCount,
  type IncomeStatement,
} from './schema';

export function useBalanceSheet(asOf: string): UseQueryResult<BalanceSheet, ApiError> {
  return useQuery<BalanceSheet, ApiError>({
    queryKey: queryKeys.reports.balanceSheet(asOf),
    queryFn: () => apiFetch('/reports/balance-sheet', { query: { asOf }, schema: balanceSheetSchema }),
    enabled: !!asOf,
  });
}

export function useIncomeStatement(from: string, to: string, enabled: boolean): UseQueryResult<IncomeStatement, ApiError> {
  return useQuery<IncomeStatement, ApiError>({
    queryKey: queryKeys.reports.incomeStatement(from, to),
    queryFn: () => apiFetch('/reports/income-statement', { query: { from, to }, schema: incomeStatementSchema }),
    enabled,
  });
}

export function useCashFlow(from: string, to: string, enabled: boolean): UseQueryResult<CashFlow, ApiError> {
  return useQuery<CashFlow, ApiError>({
    queryKey: queryKeys.reports.cashFlow(from, to),
    queryFn: () => apiFetch('/reports/cash-flow', { query: { from, to }, schema: cashFlowSchema }),
    enabled,
  });
}

export function useDraftCount(): UseQueryResult<DraftCount, ApiError> {
  return useQuery<DraftCount, ApiError>({
    queryKey: queryKeys.reports.draftCount(),
    queryFn: () => apiFetch('/ledger/journal-entries', { query: { status: 'DRAFT', limit: 1 }, schema: draftCountSchema }),
  });
}

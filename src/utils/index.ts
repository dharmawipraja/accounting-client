import { type ClassValue, clsx } from 'clsx';
import {
    camelCase,
    cloneDeep,
    debounce as lodashDebounce,
    isEmpty as lodashIsEmpty,
    omitBy,
    snakeCase,
    startCase,
    uniqueId,
} from 'lodash';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency values
 */
export function formatCurrency(
  amount: number,
  currency = 'IDR',
  locale = 'id-ID'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format numbers with thousand separators
 */
export function formatNumber(
  num: number,
  locale = 'id-ID'
): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(str: string): string {
  return startCase(str.toLowerCase());
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return uniqueId();
}

/**
 * Debounce function
 */
export const debounce = lodashDebounce;

/**
 * Deep clone object
 */
export const deepClone = cloneDeep;

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Remove empty values from object
 */
export function removeEmptyValues(obj: Record<string, any>): Record<string, any> {
  return omitBy(obj, (value) => value === null || value === undefined || value === '');
}

/**
 * Convert snake_case to camelCase
 */
export const toCamelCase = camelCase;

/**
 * Convert camelCase to snake_case
 */
export const toSnakeCase = snakeCase;

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export const isEmpty = lodashIsEmpty;

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

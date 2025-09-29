/**
 * Indonesian formatting utilities for consistent localization
 */

/**
 * Format currency amount in Indonesian Rupiah
 */
export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/**
 * Format number with Indonesian locale (comma as thousand separator)
 */
export const formatNumber = (number: number): string => {
  return number.toLocaleString('id-ID')
}

/**
 * Format date in Indonesian format (DD/MM/YYYY)
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format date and time in Indonesian format
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Format date for display in short format (DD/MM)
 */
export const formatDateShort = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
  })
}

/**
 * Format date for reports with Indonesian month names
 */
export const formatDateLong = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Parse Indonesian formatted currency string to number
 */
export const parseCurrency = (currencyString: string): number => {
  // Remove 'Rp', spaces, and dots (thousand separators)
  const cleanString = currencyString
    .replace(/Rp\s?/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')

  return parseFloat(cleanString) || 0
}

/**
 * Format amount input for display (with Rp prefix)
 */
export const formatAmountInput = (amount: number): string => {
  if (!amount) return ''
  return `Rp ${formatNumber(amount)}`
}

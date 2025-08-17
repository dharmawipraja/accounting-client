import { DATE_FORMATS } from '@/constants'
import {
  endOfMonth,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
} from 'date-fns'

/**
 * Format date for display
 */
export function formatDate(
  date: string | Date,
  formatStr: string = DATE_FORMATS.DISPLAY,
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) {
      return 'Invalid Date'
    }
    return format(dateObj, formatStr)
  } catch {
    return 'Invalid Date'
  }
}

/**
 * Format date for API (ISO string)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format datetime for API (ISO string with time)
 */
export function formatDateTimeForAPI(date: Date): string {
  return date.toISOString()
}

/**
 * Parse date string safely
 */
export function parseDate(dateStr: string): Date | null {
  try {
    const date = parseISO(dateStr)
    return isValid(date) ? date : null
  } catch {
    return null
  }
}

/**
 * Get current date in API format
 */
export function getCurrentDateForAPI(): string {
  return formatDateForAPI(new Date())
}

/**
 * Get date range for common periods
 */
export function getDateRange(
  period: 'today' | 'week' | 'month' | 'year' | 'custom',
  customStart?: Date,
  customEnd?: Date,
) {
  const now = new Date()

  switch (period) {
    case 'today':
      return {
        start: formatDateForAPI(now),
        end: formatDateForAPI(now),
      }

    case 'week':
      return {
        start: formatDateForAPI(subDays(now, 7)),
        end: formatDateForAPI(now),
      }

    case 'month':
      return {
        start: formatDateForAPI(startOfMonth(now)),
        end: formatDateForAPI(endOfMonth(now)),
      }

    case 'year':
      return {
        start: formatDateForAPI(startOfYear(now)),
        end: formatDateForAPI(endOfYear(now)),
      }

    case 'custom':
      return {
        start: customStart
          ? formatDateForAPI(customStart)
          : formatDateForAPI(now),
        end: customEnd ? formatDateForAPI(customEnd) : formatDateForAPI(now),
      }

    default:
      return {
        start: formatDateForAPI(now),
        end: formatDateForAPI(now),
      }
  }
}

/**
 * Check if date is today
 */
export function isToday(date: string | Date): boolean {
  const today = new Date()
  const dateObj = typeof date === 'string' ? parseDate(date) : date

  if (!dateObj) return false

  return formatDateForAPI(today) === formatDateForAPI(dateObj)
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: string | Date): string {
  const now = new Date()
  const dateObj = typeof date === 'string' ? parseDate(date) : date

  if (!dateObj) return 'Invalid date'

  const diffInMs = now.getTime() - dateObj.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60)
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  if (diffInHours < 24)
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  if (diffInDays < 30)
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`

  return formatDate(dateObj)
}

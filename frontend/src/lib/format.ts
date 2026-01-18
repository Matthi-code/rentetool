/**
 * Formatting utilities for Rentetool
 */

/**
 * Format a number as Euro currency
 * Handles undefined, null, and NaN values gracefully
 */
export function formatBedrag(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '€ 0,00';
  }
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Format a date string as DD-MM-YYYY
 */
export function formatDatum(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format a datetime string as DD-MM-YYYY HH:mm
 */
export function formatDatumTijd(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a decimal as percentage
 */
export function formatPercentage(decimal: number): string {
  return `${(decimal * 100).toFixed(2)}%`;
}

/**
 * Parse a Dutch date string (DD-MM-YYYY) to ISO format (YYYY-MM-DD)
 */
export function parseNlDate(nlDate: string): string {
  const [day, month, year] = nlDate.split('-');
  return `${year}-${month}-${day}`;
}

/**
 * Convert ISO date to Dutch format input value
 */
export function toInputDate(isoDate: string): string {
  return isoDate; // HTML date inputs use ISO format
}

/**
 * Get today's date in ISO format
 */
export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

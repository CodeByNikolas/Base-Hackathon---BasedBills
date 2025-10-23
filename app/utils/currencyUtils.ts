import { formatUnits } from 'viem';

/**
 * Format a bigint amount to a currency string with 2 decimal places
 * @param amount - The amount in smallest unit (e.g., wei for ETH, smallest unit for USDC)
 * @param decimals - The number of decimals the token uses (default: 6 for USDC)
 * @returns Formatted currency string, hides .00 for whole numbers
 */
export function formatCurrency(amount: bigint, decimals: number = 6): string {
  const formatted = parseFloat(formatUnits(amount, decimals)).toFixed(2);
  // Hide .00 for whole numbers
  return formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
}

/**
 * Format a bigint amount to a currency string with custom decimal places
 * @param amount - The amount in smallest unit
 * @param decimals - The number of decimals the token uses
 * @param displayDecimals - Number of decimal places to display
 * @returns Formatted currency string, hides .00 for whole numbers when displayDecimals is 2
 */
export function formatCurrencyWithDecimals(amount: bigint, decimals: number = 6, displayDecimals: number = 2): string {
  const formatted = parseFloat(formatUnits(amount, decimals)).toFixed(displayDecimals);
  // Hide .00 for whole numbers only when using 2 decimal places
  return displayDecimals === 2 && formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
}

import { formatUnits } from 'viem';

/**
 * Format a bigint amount to a currency string with 2 decimal places
 * @param amount - The amount in smallest unit (e.g., wei for ETH, smallest unit for USDC)
 * @param decimals - The number of decimals the token uses (default: 6 for USDC)
 * @returns Formatted currency string with 2 decimal places
 */
export function formatCurrency(amount: bigint, decimals: number = 6): string {
  return parseFloat(formatUnits(amount, decimals)).toFixed(2);
}

/**
 * Format a bigint amount to a currency string with custom decimal places
 * @param amount - The amount in smallest unit
 * @param decimals - The number of decimals the token uses
 * @param displayDecimals - Number of decimal places to display
 * @returns Formatted currency string
 */
export function formatCurrencyWithDecimals(amount: bigint, decimals: number = 6, displayDecimals: number = 2): string {
  return parseFloat(formatUnits(amount, decimals)).toFixed(displayDecimals);
}

/**
 * Utility functions for currency formatting in Egyptian Pounds (EGP).
 */

export function formatEGP(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) {
    return '0.00 EGP';
  }

  const isNegative = numericAmount < 0;
  const absoluteFormatted = Math.abs(numericAmount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return isNegative ? `-${absoluteFormatted} EGP` : `${absoluteFormatted} EGP`;
}

export function parseEGPAmount(input: string): number {
  const sanitized = input.replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
}

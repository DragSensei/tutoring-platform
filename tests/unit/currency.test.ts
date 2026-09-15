import { describe, it, expect } from 'vitest';
import { formatEGP, parseEGPAmount } from '@/shared/utils/currency';

describe('EGP Currency Utility', () => {
  it('formats positive amounts with 2 decimal places and EGP suffix', () => {
    expect(formatEGP(500)).toBe('500.00 EGP');
    expect(formatEGP(375.5)).toBe('375.50 EGP');
    expect(formatEGP(1250000)).toBe('1,250,000.00 EGP');
  });

  it('formats negative amounts (overdrafts) with leading minus sign', () => {
    expect(formatEGP(-500)).toBe('-500.00 EGP');
    expect(formatEGP(-125.75)).toBe('-125.75 EGP');
  });

  it('handles zero and string amounts gracefully', () => {
    expect(formatEGP(0)).toBe('0.00 EGP');
    expect(formatEGP('375.00')).toBe('375.00 EGP');
    expect(formatEGP('not-a-number')).toBe('0.00 EGP');
  });

  it('parses formatted EGP strings back into clean numbers', () => {
    expect(parseEGPAmount('500.00 EGP')).toBe(500.0);
    expect(parseEGPAmount('-375.50 EGP')).toBe(-375.5);
  });
});

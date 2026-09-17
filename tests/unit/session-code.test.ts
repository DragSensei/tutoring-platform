import { describe, it, expect } from 'vitest';
import { formatSessionCode, formatSessionTime12 } from '@/shared/utils/session-code';

describe('Academy Session Code Formatter', () => {
  it('formats session code matching user specification ON-P3-6:00-8:00', () => {
    // 18:00 Cairo (UTC+3) is 15:00 UTC, 20:00 Cairo is 17:00 UTC
    const start = new Date('2026-09-17T15:00:00.000Z');
    const end = new Date('2026-09-17T17:00:00.000Z');

    const code = formatSessionCode({
      title: 'PictoBlox Track: Computational Game Design',
      startTime: start,
      endTime: end,
    });

    expect(code).toBe('ON-P3-6:00-8:00');
  });

  it('formats electronics track code with E1 prefix', () => {
    const start = new Date('2026-09-17T09:00:00.000Z'); // 12:00 Cairo
    const end = new Date('2026-09-17T11:00:00.000Z');   // 2:00 Cairo

    const code = formatSessionCode({
      title: 'Electronics Level 1: Arduino & Circuit Logic',
      startTime: start,
      endTime: end,
    });

    expect(code).toBe('ON-E1-12:00-2:00');
  });

  it('preserves existing explicit code if already embedded in title', () => {
    const code = formatSessionCode({
      title: 'ON-P3-6:00-8:00 Special Cohort',
      startTime: new Date(),
      endTime: new Date(),
    });

    expect(code).toBe('ON-P3-6:00-8:00');
  });
});

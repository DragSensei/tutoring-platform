import { describe, it, expect } from 'vitest';
import { computeSessionDeadline } from '@/shared/utils/deadline';

describe('Configurable Platform Policies Logic', () => {
  it('computes session deadline using default 4h window', () => {
    const start = new Date('2026-09-19T10:00:00Z');
    const deadline = computeSessionDeadline(start);
    expect(deadline.toISOString()).toBe('2026-09-19T14:00:00.000Z');
  });

  it('computes session deadline dynamically for custom window hours', () => {
    const start = new Date('2026-09-19T10:00:00Z');
    
    // 2-hour window policy
    const deadline2h = computeSessionDeadline(start, 2);
    expect(deadline2h.toISOString()).toBe('2026-09-19T12:00:00.000Z');

    // 6-hour window policy
    const deadline6h = computeSessionDeadline(start, 6);
    expect(deadline6h.toISOString()).toBe('2026-09-19T16:00:00.000Z');

    // 24-hour window policy
    const deadline24h = computeSessionDeadline(start, 24);
    expect(deadline24h.toISOString()).toBe('2026-09-20T10:00:00.000Z');
  });

  it('throws error on invalid start time', () => {
    expect(() => computeSessionDeadline('invalid-date')).toThrow(
      'Invalid start_time provided for deadline calculation'
    );
  });
});

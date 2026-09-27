import { describe, expect, it } from 'vitest';
import { formatRecoveryTimeRemaining, isRecoveryWindowActive } from '@/features/attendance/utils/recovery-time';

describe('durable recovery window timing', () => {
  const openedAt = '2026-10-01T13:00:00.000Z';
  const closesAt = '2026-10-01T15:00:00.000Z';

  it('uses the exact stored close boundary and expires immediately after it', () => {
    expect(isRecoveryWindowActive({ openedAt, closesAt }, Date.parse(closesAt))).toBe(true);
    expect(isRecoveryWindowActive({ openedAt, closesAt }, Date.parse(closesAt) + 1)).toBe(false);
  });

  it('shows remaining time directly instead of requiring the Tutor to calculate a duration', () => {
    expect(formatRecoveryTimeRemaining(closesAt, Date.parse('2026-10-01T14:17:00.000Z'))).toBe('43 min remaining');
    expect(formatRecoveryTimeRemaining(closesAt, Date.parse('2026-10-01T14:00:00.000Z'))).toBe('1 hr remaining');
    expect(formatRecoveryTimeRemaining(closesAt, Date.parse(closesAt))).toBe('0 min remaining');
  });
});

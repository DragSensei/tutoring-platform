import { describe, expect, it } from 'vitest';
import { classifyZeroRosterSession } from '@/shared/utils/zero-roster';

describe('zero-roster Session disposition', () => {
  it('requires no Tutor attendance and no Admin review when no roster or historical effects exist', () => {
    expect(classifyZeroRosterSession({
      participantCount: 0,
      attendanceRecordCount: 0,
      transactionCount: 0,
      commissionEntryCount: 0,
      hasTutorCompensation: false,
    })).toBe('NO_ACTION');
  });

  it.each([
    { attendanceRecordCount: 1 },
    { transactionCount: 1 },
    { commissionEntryCount: 1 },
    { hasTutorCompensation: true },
  ])('retains zero-roster history for Admin review without inferring attendance or finance', (history) => {
    expect(classifyZeroRosterSession({
      participantCount: 0,
      attendanceRecordCount: 0,
      transactionCount: 0,
      commissionEntryCount: 0,
      hasTutorCompensation: false,
      ...history,
    })).toBe('ADMIN_REVIEW');
  });

  it('keeps a Session with an assigned roster on the normal Tutor attendance path', () => {
    expect(classifyZeroRosterSession({
      participantCount: 1,
      attendanceRecordCount: 0,
      transactionCount: 0,
      commissionEntryCount: 0,
      hasTutorCompensation: false,
    })).toBe('HAS_ROSTER');
  });
});

import { describe, expect, it } from 'vitest';
import { executeStudentCheckIn } from '@/features/attendance/server/checkin-action';
import { isTableNotExistError } from '@/features/attendance/server/session-financials';

describe('removed Student attendance-link boundary', () => {
  it('rejects the legacy Student check-in mutation without touching storage', async () => {
    await expect(executeStudentCheckIn({ token: 'historical-token', studentId: 'student-1' })).resolves.toMatchObject({
      success: false,
      statusCode: 410,
    });
  });

  it('retains the historical financial error classifier for non-attendance callers', () => {
    expect(isTableNotExistError({ code: 'P2021' })).toBe(true);
    expect(isTableNotExistError({ code: 'OTHER' })).toBe(false);
  });
});

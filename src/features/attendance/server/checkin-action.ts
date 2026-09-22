import type { CheckInVerificationResult } from '@/shared/types';

/**
 * Legacy compatibility boundary. Student self check-in was removed from the
 * product; historical token data remains in storage but cannot mutate state.
 */
export interface CheckInParams {
  token: string;
  studentId: string;
  currentTime?: Date;
}

export async function executeStudentCheckIn(_params: CheckInParams): Promise<CheckInVerificationResult> {
  return {
    success: false,
    statusCode: 410,
    message: 'Student attendance check-in is no longer available. A Tutor records attendance.',
  };
}

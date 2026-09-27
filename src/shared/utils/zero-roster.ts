export type ZeroRosterDisposition = 'HAS_ROSTER' | 'NO_ACTION' | 'ADMIN_REVIEW';

export interface ZeroRosterHistory {
  participantCount: number;
  attendanceRecordCount: number;
  transactionCount: number;
  commissionEntryCount: number;
  hasTutorCompensation: boolean;
}

export function classifyZeroRosterSession(history: ZeroRosterHistory): ZeroRosterDisposition {
  if (history.participantCount > 0) return 'HAS_ROSTER';
  return history.attendanceRecordCount > 0
    || history.transactionCount > 0
    || history.commissionEntryCount > 0
    || history.hasTutorCompensation
    ? 'ADMIN_REVIEW'
    : 'NO_ACTION';
}

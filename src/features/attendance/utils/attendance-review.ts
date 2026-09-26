export const MIN_SESSION_NOTE_LENGTH = 12;

export type AttendanceOutcome = 'PRESENT' | 'ABSENT';
export type AttendanceDecision = AttendanceOutcome | null;

interface AttendanceStudent {
  id: string;
  attended?: boolean;
  outcome?: AttendanceDecision;
}

export interface AttendanceReviewState {
  outcomeByStudentId: Record<string, AttendanceDecision>;
}

export function createAttendanceReviewState(roster: AttendanceStudent[]): AttendanceReviewState {
  return {
    outcomeByStudentId: Object.fromEntries(roster.map((student) => [
      student.id,
      student.outcome ?? (student.attended ? 'PRESENT' : null),
    ])),
  };
}

export function setAttendanceOutcome(
  state: AttendanceReviewState,
  studentId: string,
  outcome: AttendanceDecision,
): AttendanceReviewState {
  return { outcomeByStudentId: { ...state.outcomeByStudentId, [studentId]: outcome } };
}

export function markAllAttendance(
  roster: AttendanceStudent[],
  outcome: AttendanceOutcome,
): AttendanceReviewState {
  return { outcomeByStudentId: Object.fromEntries(roster.map(({ id }) => [id, outcome])) };
}

export function attendanceOutcomes(state: AttendanceReviewState): Record<string, AttendanceDecision> {
  return state.outcomeByStudentId;
}

export function getPresentStudentIds(
  roster: AttendanceStudent[],
  state: AttendanceReviewState,
): string[] {
  return roster.filter(({ id }) => state.outcomeByStudentId[id] === 'PRESENT').map(({ id }) => id);
}

export function isAttendanceWorkflowComplete(
  roster: AttendanceStudent[],
  state: AttendanceReviewState,
  notes: string,
  hasEvidence: boolean,
): boolean {
  return roster.length > 0
    && roster.every(({ id }) => state.outcomeByStudentId[id] !== null && state.outcomeByStudentId[id] !== undefined)
    && notes.trim().length >= MIN_SESSION_NOTE_LENGTH
    && hasEvidence;
}

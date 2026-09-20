export const MIN_SESSION_NOTE_LENGTH = 12;

interface AttendanceStudent {
  id: string;
  attended?: boolean;
}

export interface AttendanceReviewState {
  presenceByStudentId: Record<string, boolean>;
  isReviewed: boolean;
}

export function createAttendanceReviewState(
  roster: AttendanceStudent[],
  isReviewed = false
): AttendanceReviewState {
  return {
    presenceByStudentId: Object.fromEntries(
      roster.map((student) => [student.id, Boolean(student.attended)])
    ),
    isReviewed,
  };
}

export function toggleStudentAttendance(
  state: AttendanceReviewState,
  studentId: string
): AttendanceReviewState {
  return {
    presenceByStudentId: {
      ...state.presenceByStudentId,
      [studentId]: !state.presenceByStudentId[studentId],
    },
    isReviewed: true,
  };
}

export function markAllAttendance(
  roster: AttendanceStudent[],
  isPresent: boolean
): AttendanceReviewState {
  return {
    presenceByStudentId: Object.fromEntries(roster.map((student) => [student.id, isPresent])),
    isReviewed: true,
  };
}

export function getPresentStudentIds(
  roster: AttendanceStudent[],
  state: AttendanceReviewState
): string[] {
  return roster
    .filter((student) => Boolean(state.presenceByStudentId[student.id]))
    .map((student) => student.id);
}

export function isAttendanceWorkflowComplete(
  state: AttendanceReviewState,
  notes: string,
  hasEvidence: boolean
): boolean {
  return state.isReviewed && notes.trim().length >= MIN_SESSION_NOTE_LENGTH && hasEvidence;
}

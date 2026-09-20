import { describe, it, expect } from 'vitest';
import type { GadwalSessionItem, SessionStudentAttendee } from '@/features/sessions/types';
import {
  createAttendanceReviewState,
  getPresentStudentIds,
  isAttendanceWorkflowComplete,
  markAllAttendance,
  toggleStudentAttendance,
} from '@/features/attendance/utils/attendance-review';

describe('Tutor Dashboard Attendance Recording & Cohort Capacity', () => {
  const mockStudents: SessionStudentAttendee[] = [
    {
      id: 'st-1',
      name: 'Karim Mostafa',
      email: 'karim@student.com',
      attended: false,
    },
    {
      id: 'st-2',
      name: 'Salma Hossam',
      email: 'salma@student.com',
      attended: false,
    },
    {
      id: 'st-3',
      name: 'Omar Fathy',
      email: 'omar@student.com',
      attended: false,
    },
  ];

  const groupSession: GadwalSessionItem = {
    id: 's-group',
    title: 'Electronics Level 1: Arduino & Circuit Logic',
    sessionCode: 'ON-E1-4:15-6:15',
    tutorId: 'tutor-1',
    tutorName: 'Eng. Omar Ashraf',
    sessionType: 'GROUP',
    startTime: '2026-09-17T14:15:00.000Z',
    endTime: '2026-09-17T16:15:00.000Z',
    deadline: '2026-09-17T18:15:00.000Z',
    token: 'token-uuid-group',
    status: 'SCHEDULED',
    attendeeCount: 0,
    price: 375,
    roster: mockStudents,
  };

  const privateSession: GadwalSessionItem = {
    ...groupSession,
    id: 's-priv',
    sessionType: 'PRIVATE',
    price: 500,
    roster: [mockStudents[0]],
  };

  it('enforces max capacity of 4 for group sessions and 1 for private', () => {
    const groupMaxCapacity = groupSession.sessionType === 'GROUP' ? 4 : 1;
    const privateMaxCapacity = privateSession.sessionType === 'GROUP' ? 4 : 1;

    expect(groupMaxCapacity).toBe(4);
    expect(privateMaxCapacity).toBe(1);

    const groupRemainingSeats = Math.max(0, groupMaxCapacity - (groupSession.roster?.length || 0));
    expect(groupRemainingSeats).toBe(1); // 3 enrolled, 1 available

    const privateRemainingSeats = Math.max(0, privateMaxCapacity - (privateSession.roster?.length || 0));
    expect(privateRemainingSeats).toBe(0); // 1 enrolled, 0 available
  });

  it('moves session status to COMPLETED and records attended student names', () => {
    const presentIds = ['st-1', 'st-2'];

    const updatedRoster = (groupSession.roster || []).map((st) => ({
      ...st,
      attended: presentIds.includes(st.id),
    }));

    const attendedNames = updatedRoster.filter((st) => st.attended).map((st) => st.name);

    const completedSession: GadwalSessionItem = {
      ...groupSession,
      status: 'COMPLETED',
      roster: updatedRoster,
      assignedStudents: attendedNames,
      attendeeCount: attendedNames.length,
    };

    expect(completedSession.status).toBe('COMPLETED');
    expect(completedSession.attendeeCount).toBe(2);
    expect(completedSession.assignedStudents).toEqual(['Karim Mostafa', 'Salma Hossam']);
    expect(completedSession.roster?.[0].attended).toBe(true);
    expect(completedSession.roster?.[2].attended).toBe(false);
  });

  it('treats an explicitly reviewed all-absent cohort as complete', () => {
    const reviewed = markAllAttendance(mockStudents, false);

    expect(getPresentStudentIds(mockStudents, reviewed)).toEqual([]);
    expect(isAttendanceWorkflowComplete(reviewed, 'All students were absent.', true)).toBe(true);
  });

  it('does not infer attendance review from a zero present count', () => {
    const untouched = createAttendanceReviewState(mockStudents);

    expect(getPresentStudentIds(mockStudents, untouched)).toEqual([]);
    expect(isAttendanceWorkflowComplete(untouched, 'All students were absent.', true)).toBe(false);
  });

  it('supports one student, four students, and larger mixed cohorts deterministically', () => {
    const oneStudent = markAllAttendance(mockStudents.slice(0, 1), true);
    const fourStudents = markAllAttendance(
      [...mockStudents, { id: 'st-4', name: 'Nour Adel', email: 'nour@student.com', attended: false }],
      true
    );
    const largeRoster = Array.from({ length: 18 }, (_, index) => ({
      id: `student-${index}`,
      name: `Student ${index}`,
      email: `student-${index}@example.com`,
      attended: false,
    }));
    let mixed = createAttendanceReviewState(largeRoster);
    mixed = toggleStudentAttendance(mixed, 'student-0');
    mixed = toggleStudentAttendance(mixed, 'student-17');

    expect(getPresentStudentIds(mockStudents.slice(0, 1), oneStudent)).toHaveLength(1);
    expect(getPresentStudentIds([...mockStudents, { id: 'st-4', name: 'Nour Adel', email: 'nour@student.com', attended: false }], fourStudents)).toHaveLength(4);
    expect(getPresentStudentIds(largeRoster, mixed)).toEqual(['student-0', 'student-17']);
  });
});

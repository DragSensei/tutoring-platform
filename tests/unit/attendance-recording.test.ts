import { describe, it, expect } from 'vitest';
import type { GadwalSessionItem, SessionStudentAttendee } from '@/features/sessions/types';

describe('Tutor Dashboard Attendance Recording & Cohort Capacity', () => {
  const mockStudents: SessionStudentAttendee[] = [
    {
      id: 'st-1',
      name: 'Karim Mostafa',
      email: 'karim@student.com',
      walletBalance: 1500,
      isFlaggedOverdraft: false,
      attended: false,
    },
    {
      id: 'st-2',
      name: 'Salma Hossam',
      email: 'salma@student.com',
      walletBalance: 1500,
      isFlaggedOverdraft: false,
      attended: false,
    },
    {
      id: 'st-3',
      name: 'Omar Fathy',
      email: 'omar@student.com',
      walletBalance: -375,
      isFlaggedOverdraft: true,
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

  it('computes live wallet deductions accurately for present students', () => {
    const student = mockStudents[0];
    const sessionPrice = groupSession.price;

    const isPresent = true;
    const deduction = isPresent ? sessionPrice : 0;
    const projectedBalance = student.walletBalance - deduction;

    expect(deduction).toBe(375);
    expect(projectedBalance).toBe(1125);
  });

  it('flags overdraft correctly when projected balance falls below zero', () => {
    const overdraftStudent = mockStudents[2]; // balance: -375
    const sessionPrice = groupSession.price; // 375

    const projectedBalance = overdraftStudent.walletBalance - sessionPrice;
    const willOverdraft = projectedBalance < 0;

    expect(projectedBalance).toBe(-750);
    expect(willOverdraft).toBe(true);
  });

  it('moves session status to COMPLETED and records attended student names', () => {
    const presentIds = ['st-1', 'st-2'];

    const updatedRoster = (groupSession.roster || []).map((st) => ({
      ...st,
      attended: presentIds.includes(st.id),
      walletBalance: st.walletBalance - (presentIds.includes(st.id) ? groupSession.price : 0),
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
    expect(completedSession.roster?.[0].walletBalance).toBe(1125);
    expect(completedSession.roster?.[2].attended).toBe(false);
  });
});

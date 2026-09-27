import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from '@/features/auth/server/session';
import { getAdminAttendanceAttention, getAdminAttendanceInterventionBoard, grantLateAttendanceRecovery, markAdminAttendanceHandled } from '@/features/attendance/server/admin-attendance';
import { grantAdminAttendanceRecovery } from '@/app/(portal)/admin/finances/sessions/[sessionId]/actions';
import { markSessionHandled } from '@/app/(portal)/admin/needs-attention/actions';
import { prisma } from '@/shared/lib/prisma';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  transaction: vi.fn(),
  sessionFind: vi.fn(),
  policyFind: vi.fn(),
  recoveryFind: vi.fn(),
  recoveryCreate: vi.fn(),
  grantHistoryFind: vi.fn(),
  linkedPairFind: vi.fn(),
}));
vi.mock('@/features/auth/server/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
    platformPolicy: { findUnique: mocks.policyFind },
    session: { findMany: mocks.sessionFind },
    attendanceRecoveryGrant: { findMany: mocks.grantHistoryFind },
    linkedStudentRelationship: { findMany: mocks.linkedPairFind },
  },
}));

const NOW = new Date('2026-10-01T14:00:00.000Z');

function setupRecoveryTransaction(session: {
  id: string; end_time: Date; status: string; historical_only: boolean; admin_attendance_handled_at?: Date | null;
  attendance_submitted_at: Date | null; attendance_finalized_at: Date | null; _count: { participants: number };
} = {
  id: 'session-1', end_time: new Date('2026-10-01T08:00:00.000Z'), status: 'SCHEDULED', historical_only: false,
  admin_attendance_handled_at: null, attendance_submitted_at: null, attendance_finalized_at: null, _count: { participants: 2 },
}) {
  const tx = {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'admin-1' }) },
    session: { findUnique: vi.fn().mockResolvedValue(session), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    platformPolicy: { findUnique: vi.fn().mockResolvedValue({ check_in_window_hours: 4, late_attendance_recovery_window_hours: 1 }) },
    attendanceRecoveryGrant: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockImplementation(({ data }) => ({ id: 'grant-1', opened_at: data.opened_at, closes_at: data.closes_at, policy_duration_hours: data.policy_duration_hours })) },
  };
  mocks.transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
  return tx;
}

describe('Admin attendance recovery and attention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ userId: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' });
    mocks.policyFind.mockResolvedValue({ check_in_window_hours: 4, default_tutor_hourly_rate: new Prisma.Decimal(0) });
    mocks.linkedPairFind.mockResolvedValue([]);
    mocks.grantHistoryFind.mockResolvedValue([]);
  });

  it('requires Admin authorization and a written explanation before granting', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Unauthorized'));
    await expect(grantAdminAttendanceRecovery('session-1', 'Internet outage')).resolves.toMatchObject({ success: false, message: 'Unauthorized' });
    vi.mocked(requireAuth).mockResolvedValue({ userId: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' });
    await expect(grantLateAttendanceRecovery('admin-1', 'session-1', 'short', NOW)).rejects.toThrow('Add a short note');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps the no-window handling server action Admin-only', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Unauthorized'));
    await expect(markSessionHandled('session-1', 'Resolved with the Tutor over the phone.')).resolves.toMatchObject({ success: false, message: 'Unauthorized' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('snapshots the recovery policy duration and exact close time', async () => {
    const tx = setupRecoveryTransaction();
    const result = await grantLateAttendanceRecovery('admin-1', 'session-1', 'Tutor reported an internet outage.', NOW);
    expect(result).toEqual({ id: 'grant-1', opened_at: NOW, closes_at: new Date('2026-10-01T15:00:00.000Z'), policy_duration_hours: 1 });
    expect(tx.attendanceRecoveryGrant.create).toHaveBeenCalledWith({ data: {
      session_id: 'session-1', granted_by_admin_id: 'admin-1', admin_reason: 'Tutor reported an internet outage.',
      policy_duration_hours: 1, opened_at: NOW, closes_at: new Date('2026-10-01T15:00:00.000Z'),
    }, select: { id: true, opened_at: true, closes_at: true, policy_duration_hours: true } });
  });

  it('rejects recovery before the normal deadline and prevents any repeat grant', async () => {
    setupRecoveryTransaction({ id: 'session-early', end_time: new Date('2026-10-01T11:00:00.000Z'), status: 'SCHEDULED', historical_only: false, attendance_submitted_at: null, attendance_finalized_at: null, _count: { participants: 1 } });
    await expect(grantLateAttendanceRecovery('admin-1', 'session-early', 'Tutor had an internet outage.', NOW)).rejects.toThrow('Only overdue Sessions');
    for (const grant of [{ id: 'active-grant' }, { id: 'expired-grant' }, { id: 'used-grant' }]) {
      const repeated = setupRecoveryTransaction();
      repeated.attendanceRecoveryGrant.findFirst.mockResolvedValue(grant);
      await expect(grantLateAttendanceRecovery('admin-1', 'session-1', 'Tutor had an internet outage.', NOW)).rejects.toThrow('already been handled by Admin');
      expect(repeated.attendanceRecoveryGrant.create).not.toHaveBeenCalled();
    }
  });

  it('requires an Admin note and persists a one-time no-recovery resolution', async () => {
    await expect(markAdminAttendanceHandled('admin-1', 'session-1', 'short', NOW)).rejects.toThrow('Add a note');
    expect(prisma.$transaction).not.toHaveBeenCalled();

    const tx = setupRecoveryTransaction();
    await expect(markAdminAttendanceHandled('admin-1', 'session-1', 'Resolved with the Tutor by phone.', NOW)).resolves.toEqual({
      handledAt: NOW,
      note: 'Resolved with the Tutor by phone.',
    });
    expect(tx.session.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: 'session-1', admin_attendance_handled_at: null, attendance_submitted_at: null }),
      data: { admin_attendance_handled_at: NOW, admin_attendance_handled_by_id: 'admin-1', admin_attendance_handling_note: 'Resolved with the Tutor by phone.' },
    });
    expect(tx.attendanceRecoveryGrant.create).not.toHaveBeenCalled();

    setupRecoveryTransaction({ id: 'session-1', end_time: new Date('2026-10-01T08:00:00.000Z'), status: 'SCHEDULED', historical_only: false, admin_attendance_handled_at: NOW, attendance_submitted_at: null, attendance_finalized_at: null, _count: { participants: 2 } });
    await expect(markAdminAttendanceHandled('admin-1', 'session-1', 'Resolved with the Tutor by phone.', NOW)).rejects.toThrow('already been handled by Admin');
  });

  it('derives missing, active, expired, rate, and settlement warnings from domain state', async () => {
    mocks.sessionFind
      .mockResolvedValueOnce([
        { id: 'session-1', title: 'Python', start_time: new Date('2026-10-01T06:00:00.000Z'), end_time: new Date('2026-10-01T08:00:00.000Z'), tutor: { name: 'Omar' }, participants: [{ student_id: 'student-1' }], attendances: [{ id: 'attendance-1' }], attendance_recovery_grants: [{ opened_at: new Date('2026-10-01T13:00:00.000Z'), closes_at: new Date('2026-10-01T15:00:00.000Z'), used_at: null, admin_reason: 'Internet outage.' }] },
        { id: 'session-2', title: 'Robotics', start_time: new Date('2026-10-01T05:00:00.000Z'), end_time: new Date('2026-10-01T07:00:00.000Z'), tutor: { name: 'Mona' }, participants: [{ student_id: 'student-2' }], attendances: [{ id: 'attendance-2' }], attendance_recovery_grants: [{ opened_at: new Date('2026-10-01T11:00:00.000Z'), closes_at: new Date('2026-10-01T12:00:00.000Z'), used_at: null, admin_reason: 'No connection.' }] },
        { id: 'session-3', title: 'Electronics', start_time: new Date('2026-09-17T21:27:00.000Z'), end_time: new Date('2026-09-17T23:27:00.000Z'), tutor: { name: 'Omar' }, participants: [], attendances: [{ id: 'attendance-3' }, { id: 'attendance-4' }, { id: 'attendance-5' }], attendance_recovery_grants: [] },
      ])
      .mockResolvedValueOnce([
        { id: 'session-1', title: 'Python', start_time: new Date('2026-10-01T06:00:00.000Z'), end_time: new Date('2026-10-01T08:00:00.000Z'), attendance_finalized_at: null, tutor: { name: 'Omar', tutor_hourly_rate_override: null } },
      ]);
    const warnings = await getAdminAttendanceAttention(NOW);
    expect(warnings).toHaveLength(3);
    expect(warnings.find(({ id }) => id === 'session-1')?.warnings).toEqual(expect.arrayContaining(['ATTENDANCE_MISSING', 'RECOVERY_ACTIVE', 'TUTOR_RATE_MISSING', 'SETTLEMENT_PENDING']));
    expect(warnings.find(({ id }) => id === 'session-2')?.warnings).toEqual(expect.arrayContaining(['ATTENDANCE_MISSING', 'RECOVERY_EXPIRED']));
    expect(warnings.find(({ id }) => id === 'session-3')?.warnings).toEqual(['ATTENDANCE_NEEDS_REVIEW']);
    expect(warnings.find(({ id }) => id === 'session-3')?.reviewDetail).toContain('3 attendance records');
  });

  it('uses one exact rolling 30-day cutoff and separates active recovery from handled history', async () => {
    const activeGrant = {
      id: 'grant-active', session_id: 'session-handled', admin_reason: 'Tutor reported a connection outage.',
      opened_at: new Date('2026-10-01T13:00:00.000Z'), closes_at: new Date('2026-10-01T15:00:00.000Z'),
      used_at: null, tutor_explanation: null,
      session: { id: 'session-handled', title: 'Robotics', start_time: new Date('2026-10-01T06:00:00.000Z'), end_time: new Date('2026-10-01T08:00:00.000Z'), tutor: { name: 'Omar' } },
      granted_by_admin: { name: 'Admin' },
    };
    mocks.sessionFind.mockImplementation(async (args: { where: Record<string, unknown> }) => {
      if ('OR' in args.where) return [{
        id: 'session-handled', title: 'Robotics', start_time: new Date('2026-10-01T06:00:00.000Z'), end_time: new Date('2026-10-01T08:00:00.000Z'),
        admin_attendance_handled_at: null, admin_attendance_handled_by: null, admin_attendance_handling_note: null, tutor: { name: 'Omar' },
        attendance_recovery_grants: [{ admin_reason: 'Tutor reported a connection outage.', opened_at: new Date('2026-10-01T13:00:00.000Z'), closes_at: new Date('2026-10-01T15:00:00.000Z'), used_at: null, tutor_explanation: null, granted_by_admin: { name: 'Admin' } }],
      }];
      if (args.where.attendance_submitted_at === null) return [
        { id: 'session-action', title: 'Python', start_time: new Date('2026-10-01T06:00:00.000Z'), end_time: new Date('2026-10-01T08:00:00.000Z'), tutor: { name: 'Mona' }, participants: [{ student_id: 'student-1' }], attendances: [], attendance_recovery_grants: [] },
        { id: 'session-handled', title: 'Robotics', start_time: new Date('2026-10-01T06:00:00.000Z'), end_time: new Date('2026-10-01T08:00:00.000Z'), tutor: { name: 'Omar' }, participants: [{ student_id: 'student-2' }], attendances: [], attendance_recovery_grants: [activeGrant] },
      ];
      return [];
    });

    const board = await getAdminAttendanceInterventionBoard(NOW);
    expect(board.needsAction.map(({ id }) => id)).toEqual(['session-action']);
    expect(board.recoveryActive).toHaveLength(1);
    expect(board.recoveryActive[0]).toMatchObject({ id: 'session-handled', recoveryWindowActive: true, adminName: 'Admin', closesAt: '2026-10-01T15:00:00.000Z', adminReason: 'Tutor reported a connection outage.' });
    expect(board.handled).toHaveLength(0);
    expect(board.needsAction.some(({ id }) => id === board.recoveryActive[0].id)).toBe(false);
    expect(mocks.sessionFind).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [
        { admin_attendance_handled_at: { gte: new Date('2026-09-01T14:00:00.000Z'), lte: NOW } },
        { attendance_recovery_grants: { some: { opened_at: { gte: new Date('2026-09-01T14:00:00.000Z'), lte: NOW } } } },
      ] },
    }));
  });

  it('keeps non-attendance Admin follow-ups out of attendance categories', async () => {
    mocks.sessionFind.mockResolvedValue([]);
    mocks.linkedPairFind.mockResolvedValue([{
      id: 'pair-1', created_at: NOW,
      student_a: { id: 'student-a', name: 'A', series_participants: [{ series: { id: 'private', title: 'Private', session_type: 'PRIVATE' } }] },
      student_b: { id: 'student-b', name: 'B', series_participants: [{ series: { id: 'group', title: 'Group A', session_type: 'GROUP' } }] },
    }]);
    const board = await getAdminAttendanceInterventionBoard(NOW);
    expect(board.needsAction).toHaveLength(0);
    expect(board.otherAttention).toMatchObject([{ id: 'linked-pair-1', warnings: ['LINKED_STUDENTS_DIFFERENT_ENROLLMENT'] }]);
  });
});

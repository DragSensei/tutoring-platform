import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from '@/features/auth/server/session';
import { getAdminAttendanceAttention, grantLateAttendanceRecovery } from '@/features/attendance/server/admin-attendance';
import { grantAdminAttendanceRecovery } from '@/app/(portal)/admin/finances/sessions/[sessionId]/actions';
import { prisma } from '@/shared/lib/prisma';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  transaction: vi.fn(),
  sessionFind: vi.fn(),
  policyFind: vi.fn(),
  recoveryFind: vi.fn(),
  recoveryCreate: vi.fn(),
}));
vi.mock('@/features/auth/server/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
    platformPolicy: { findUnique: mocks.policyFind },
    session: { findMany: mocks.sessionFind },
  },
}));

const NOW = new Date('2026-10-01T14:00:00.000Z');

function setupRecoveryTransaction(session = {
  id: 'session-1', end_time: new Date('2026-10-01T08:00:00.000Z'), status: 'SCHEDULED', historical_only: false,
  attendance_submitted_at: null, attendance_finalized_at: null, _count: { participants: 2 },
}) {
  const tx = {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'admin-1' }) },
    session: { findUnique: vi.fn().mockResolvedValue(session) },
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
  });

  it('requires Admin authorization and a written explanation before granting', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Unauthorized'));
    await expect(grantAdminAttendanceRecovery('session-1', 'Internet outage')).resolves.toMatchObject({ success: false, message: 'Unauthorized' });
    vi.mocked(requireAuth).mockResolvedValue({ userId: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' });
    await expect(grantLateAttendanceRecovery('admin-1', 'session-1', 'short', NOW)).rejects.toThrow('Add a short note');
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

  it('rejects recovery before the normal deadline and prevents overlapping grants', async () => {
    setupRecoveryTransaction({ id: 'session-early', end_time: new Date('2026-10-01T11:00:00.000Z'), status: 'SCHEDULED', historical_only: false, attendance_submitted_at: null, attendance_finalized_at: null, _count: { participants: 1 } });
    await expect(grantLateAttendanceRecovery('admin-1', 'session-early', 'Tutor had an internet outage.', NOW)).rejects.toThrow('Only overdue Sessions');
    const active = setupRecoveryTransaction();
    active.attendanceRecoveryGrant.findFirst.mockResolvedValue({ id: 'active-grant' });
    await expect(grantLateAttendanceRecovery('admin-1', 'session-1', 'Tutor had an internet outage.', NOW)).rejects.toThrow('A recovery window is already active');
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
    expect(warnings.find(({ id }) => id === 'session-3')?.warnings).toEqual(expect.arrayContaining(['ATTENDANCE_MISSING', 'ATTENDANCE_NEEDS_REVIEW']));
    expect(warnings.find(({ id }) => id === 'session-3')?.reviewDetail).toContain('3 legacy attendance records');
  });
});

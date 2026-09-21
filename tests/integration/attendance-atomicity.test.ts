import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeStudentCheckIn,
  isTableNotExistError,
} from '@/features/attendance/server/checkin-action';
import { prisma } from '@/shared/lib/prisma';
import { Prisma } from '@prisma/client';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    attendanceRecord: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    sessionParticipant: {
      findUnique: vi.fn(),
    },
    wallet: {
      create: vi.fn(),
      update: vi.fn(),
    },
    walletTransaction: {
      create: vi.fn(),
    },
    platformPolicy: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('Attendance Verification & Atomic Wallet Deduction Integration', () => {
  const mockSession = {
    id: 'sess_100',
    tutor_id: 'tutor_1',
    title: 'Chemistry 101 - Organic Chemistry',
    session_type: 'PRIVATE', // 500.00 EGP
    start_time: new Date('2026-10-01T10:00:00.000Z'),
    deadline: new Date('2026-10-01T14:00:00.000Z'), // 4 hours window
    token: 'b8e99999-9c0b-4ef8-bb6d-6bb9bd380a22',
    status: 'SCHEDULED',
    tutor: { id: 'tutor_1', name: 'Dr. Ahmed' },
  };

  const mockStudent = {
    id: 'stud_200',
    name: 'Karim Mostafa',
    role: 'STUDENT',
    wallet: {
      id: 'wall_300',
      user_id: 'stud_200',
      balance: new Prisma.Decimal(100.0), // Less than 500 => will trigger overdraft
      is_flagged_overdraft: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.platformPolicy.findUnique).mockResolvedValue(null);
  });

  it('rejects with HTTP 404 when session token does not exist', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

    const result = await executeStudentCheckIn({
      token: 'non-existent-token',
      studentId: 'stud_200',
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.message).toContain('Session not found');
  });

  it('strictly blocks check-in with HTTP 403 when NOW() > session.deadline (4-Hour window expired)', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any);

    // Current time is 1 second past deadline (14:00:01)
    const lateTime = new Date('2026-10-01T14:00:01.000Z');

    const result = await executeStudentCheckIn({
      token: mockSession.token,
      studentId: 'stud_200',
      currentTime: lateTime,
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.message).toContain('Check-in window expired');
    // Ensure no transaction was initiated
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('executes atomic check-in, deducts 500 EGP, flags overdraft, and appends immutable transaction', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);

    // Mock transaction behavior
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const tx = {
        session: {
          findUnique: vi.fn().mockResolvedValue({ id: mockSession.id, status: mockSession.status }),
        },
        sessionParticipant: {
          findUnique: vi.fn().mockResolvedValue({ session_id: mockSession.id, student_id: mockStudent.id }),
        },
        attendanceRecord: {
          findUnique: vi.fn().mockResolvedValue(null), // not already checked in
          create: vi.fn().mockResolvedValue({ id: 'att_1' }),
        },
        wallet: {
          findUnique: vi.fn().mockResolvedValue(mockStudent.wallet),
          update: vi.fn().mockImplementation(({ data }: any) => ({
            id: mockStudent.wallet.id,
            balance: data.balance,
            is_flagged_overdraft: data.is_flagged_overdraft,
          })),
        },
        walletTransaction: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'wtx_1' }),
        },
        platformPolicy: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };
      return callback(tx);
    });

    // Valid check-in time (11:00 AM, 1 hour after start)
    const checkInTime = new Date('2026-10-01T11:00:00.000Z');

    const result = await executeStudentCheckIn({
      token: mockSession.token,
      studentId: mockStudent.id,
      currentTime: checkInTime,
    });

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.deductedAmount).toBe(500.0);
    // 100.00 - 500.00 = -400.00
    expect(result.newBalance).toBe(-400.0);
    expect(result.isOverdraft).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate check-in with HTTP 409 status code', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);

    // Mock that attendance record already exists
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const tx = {
        session: {
          findUnique: vi.fn().mockResolvedValue({ id: mockSession.id, status: mockSession.status }),
        },
        sessionParticipant: {
          findUnique: vi.fn().mockResolvedValue({ session_id: mockSession.id, student_id: mockStudent.id }),
        },
        attendanceRecord: {
          findUnique: vi.fn().mockResolvedValue({ id: 'existing_att_1' }),
        },
      };
      return callback(tx);
    });

    const result = await executeStudentCheckIn({
      token: mockSession.token,
      studentId: mockStudent.id,
      currentTime: new Date('2026-10-01T11:00:00.000Z'),
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(409);
    expect(result.message).toContain('already checked in');
  });

  it('rejects a stale check-in when Tutor finalization wins after the preflight read', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);

    const transactionSessionRead = vi
      .fn()
      .mockResolvedValue({ id: mockSession.id, status: 'COMPLETED' });
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
      callback({
        session: { findUnique: transactionSessionRead },
        sessionParticipant: { findUnique: vi.fn() },
      })
    );

    const result = await executeStudentCheckIn({
      token: mockSession.token,
      studentId: mockStudent.id,
      currentTime: new Date('2026-10-01T11:00:00.000Z'),
    });

    expect(result).toEqual({
      success: false,
      statusCode: 409,
      message: 'Attendance for this session has already been finalized',
    });
    expect(transactionSessionRead).toHaveBeenCalledWith({
      where: { id: mockSession.id },
      select: { status: true },
    });
  });

  it('rolls back all mutations if transaction fails midway', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);

    vi.mocked(prisma.$transaction).mockImplementation(async () => {
      throw new Error('Database connection lost during mutation');
    });

    const result = await executeStudentCheckIn({
      token: mockSession.token,
      studentId: mockStudent.id,
      currentTime: new Date('2026-10-01T11:00:00.000Z'),
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.message).toContain('rolled back');
  });

  describe('PlatformPolicy Error Resilience & Billing Safety', () => {
    it('falls back to default pricing with a logged warning when PlatformPolicy table does not exist (P2021)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);

      const missingTableError = new Prisma.PrismaClientKnownRequestError(
        'The table PlatformPolicy does not exist in the current database.',
        { code: 'P2021', clientVersion: '5.0.0' }
      );
      vi.mocked(prisma.platformPolicy.findUnique).mockRejectedValue(missingTableError);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          session: {
            findUnique: vi.fn().mockResolvedValue({ id: mockSession.id, status: mockSession.status }),
          },
          sessionParticipant: {
            findUnique: vi.fn().mockResolvedValue({ session_id: mockSession.id, student_id: mockStudent.id }),
          },
          attendanceRecord: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'att_1' }),
          },
          wallet: {
            findUnique: vi.fn().mockResolvedValue(mockStudent.wallet),
            update: vi.fn().mockImplementation(({ data }: any) => ({
              id: mockStudent.wallet.id,
              balance: data.balance,
              is_flagged_overdraft: data.is_flagged_overdraft,
            })),
          },
          walletTransaction: {
            findMany: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockResolvedValue({ id: 'wtx_1' }),
          },
          platformPolicy: {
            findUnique: vi.fn().mockRejectedValue(missingTableError),
          },
        };
        return callback(tx);
      });

      const result = await executeStudentCheckIn({
        token: mockSession.token,
        studentId: mockStudent.id,
        currentTime: new Date('2026-10-01T11:00:00.000Z'),
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.deductedAmount).toBe(500.0); // Default PRIVATE price fallback
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ATTENDANCE_CHECKIN] PlatformPolicy table does not exist in database'),
        missingTableError
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });

    it('falls back to default pricing with a logged warning when platformPolicy is not defined on client', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);

      const originalPlatformPolicy = prisma.platformPolicy;
      (prisma as any).platformPolicy = undefined;

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const tx = {
          session: {
            findUnique: vi.fn().mockResolvedValue({ id: mockSession.id, status: mockSession.status }),
          },
          sessionParticipant: {
            findUnique: vi.fn().mockResolvedValue({ session_id: mockSession.id, student_id: mockStudent.id }),
          },
          attendanceRecord: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'att_1' }),
          },
          wallet: {
            findUnique: vi.fn().mockResolvedValue(mockStudent.wallet),
            update: vi.fn().mockImplementation(({ data }: any) => ({
              id: mockStudent.wallet.id,
              balance: data.balance,
              is_flagged_overdraft: data.is_flagged_overdraft,
            })),
          },
          walletTransaction: {
            findMany: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockResolvedValue({ id: 'wtx_1' }),
          },
        };
        return callback(tx);
      });

      const result = await executeStudentCheckIn({
        token: mockSession.token,
        studentId: mockStudent.id,
        currentTime: new Date('2026-10-01T11:00:00.000Z'),
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.deductedAmount).toBe(500.0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ATTENDANCE_CHECKIN] PlatformPolicy model not defined on Prisma client')
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      (prisma as any).platformPolicy = originalPlatformPolicy;
      warnSpy.mockRestore();
    });

    it('aborts check-in and fails with HTTP 500 when PlatformPolicy query throws a generic database error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);

      const dbError = new Error('Connection pool exhausted / timeout');
      vi.mocked(prisma.platformPolicy.findUnique).mockRejectedValue(dbError);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
        callback({
          session: {
            findUnique: vi.fn().mockResolvedValue({ id: mockSession.id, status: mockSession.status }),
          },
          sessionParticipant: {
            findUnique: vi.fn().mockResolvedValue({ session_id: mockSession.id, student_id: mockStudent.id }),
          },
          attendanceRecord: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
          },
          platformPolicy: {
            findUnique: vi.fn().mockRejectedValue(dbError),
          },
        })
      );

      const result = await executeStudentCheckIn({
        token: mockSession.token,
        studentId: mockStudent.id,
        currentTime: new Date('2026-10-01T11:00:00.000Z'),
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.message).toContain('Failed to retrieve platform policy configuration');
      // The shared billing owner is invoked inside the atomic transaction; the error rolls it back.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ATTENDANCE_CHECKIN] Failed to retrieve platform policy configuration:'),
        dbError
      );

      errorSpy.mockRestore();
    });

    it('correctly identifies missing table errors in isTableNotExistError helper', () => {
      const p2021Error = new Prisma.PrismaClientKnownRequestError('Table missing', {
        code: 'P2021',
        clientVersion: '5.0.0',
      });
      expect(isTableNotExistError(p2021Error)).toBe(true);
      expect(isTableNotExistError({ code: 'P2021' })).toBe(true);
      expect(isTableNotExistError(new Error('no such table: PlatformPolicy'))).toBe(true);
      expect(isTableNotExistError(new Error('relation "PlatformPolicy" does not exist'))).toBe(true);

      // Generic errors must NOT be classified as missing table
      expect(isTableNotExistError(new Error('Connection timed out'))).toBe(false);
      expect(isTableNotExistError(new Error('SSL connection closed unexpectedly'))).toBe(false);
      expect(isTableNotExistError({ code: 'P2002' })).toBe(false);
      expect(isTableNotExistError(null)).toBe(false);
      expect(isTableNotExistError(undefined)).toBe(false);
    });
  });
});

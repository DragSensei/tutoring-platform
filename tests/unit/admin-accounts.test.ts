import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from '@/features/auth/server/session';
import { prisma } from '@/shared/lib/prisma';
import {
  getAccountDetail,
  getAccountRoleLabel,
  getAccounts,
} from '@/app/(portal)/admin/accounts/_components/accounts-data';

vi.mock('@/features/auth/server/session', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const createdAt = new Date('2026-01-10T08:00:00.000Z');
const updatedAt = new Date('2026-02-11T09:30:00.000Z');

function commonAccount(role: 'ADMIN' | 'TUTOR' | 'STUDENT') {
  return {
    id: `${role.toLowerCase()}-1`,
    name: `${role} Account`,
    email: `${role.toLowerCase()}@example.com`,
    phone: '01000000000',
    role,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

describe('Admin account data access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
    });
  });

  it('uses the platform role vocabulary with a user-friendly faculty label', () => {
    expect(getAccountRoleLabel('STUDENT')).toBe('Student');
    expect(getAccountRoleLabel('TUTOR')).toBe('Faculty Mentor');
    expect(getAccountRoleLabel('ADMIN')).toBe('Admin');
  });

  it('authorizes and returns only safe account directory fields', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      commonAccount('STUDENT'),
      commonAccount('TUTOR'),
      commonAccount('ADMIN'),
    ] as never);

    const result = await getAccounts();

    expect(requireAuth).toHaveBeenCalledWith(['ADMIN']);
    expect(result.map((account) => account.roleLabel)).toEqual([
      'Student',
      'Faculty Mentor',
      'Admin',
    ]);
    expect(result[0].createdAt).toBe(createdAt.toISOString());

    const query = vi.mocked(prisma.user.findMany).mock.calls[0][0];
    expect(query?.select).toEqual({
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      created_at: true,
    });
    expect(query?.select).not.toHaveProperty('password_hash');
  });

  it('stops before database access when admin authorization fails', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Forbidden: Insufficient privileges'));

    await expect(getAccounts()).rejects.toThrow('Forbidden');

    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('returns null for an unknown account without querying role details', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    await expect(getAccountDetail('missing-account')).resolves.toBeNull();

    expect(requireAuth).toHaveBeenCalledWith(['ADMIN']);
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it('selects and maps student wallet and attendance relations', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(commonAccount('STUDENT') as never)
      .mockResolvedValueOnce({
        wallet: {
          balance: 625,
          is_flagged_overdraft: false,
          created_at: createdAt,
          updated_at: updatedAt,
        },
        attendances: [
          {
            id: 'attendance-1',
            attended_at: updatedAt,
            session: {
              title: 'Robotics Lab',
              session_type: 'GROUP',
              start_time: createdAt,
              tutor: { name: 'Mentor One' },
            },
          },
        ],
        _count: { attendances: 3 },
      } as never);

    const result = await getAccountDetail('student-1');

    expect(result?.role).toBe('STUDENT');
    if (result?.role !== 'STUDENT') throw new Error('Expected a student detail');
    expect(result.student.wallet?.balance).toBe(625);
    expect(result.student.attendanceCount).toBe(3);
    expect(result.student.recentAttendances[0]).toMatchObject({
      sessionTitle: 'Robotics Lab',
      tutorName: 'Mentor One',
    });
  });

  it('selects and maps faculty mentor session relations', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(commonAccount('TUTOR') as never)
      .mockResolvedValueOnce({
        tutored_sessions: [
          {
            id: 'session-1',
            title: 'Private Coding',
            session_type: 'PRIVATE',
            status: 'COMPLETED',
            start_time: createdAt,
            end_time: updatedAt,
            _count: { attendances: 1 },
          },
        ],
        _count: { tutored_sessions: 7 },
      } as never);

    const result = await getAccountDetail('tutor-1');

    expect(result?.role).toBe('TUTOR');
    if (result?.role !== 'TUTOR') throw new Error('Expected a tutor detail');
    expect(result.roleLabel).toBe('Faculty Mentor');
    expect(result.tutor.sessionCount).toBe(7);
    expect(result.tutor.recentSessions[0]).toMatchObject({
      title: 'Private Coding',
      attendanceCount: 1,
    });
  });

  it('selects and maps admin-created wallet activity', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(commonAccount('ADMIN') as never)
      .mockResolvedValueOnce({
        created_transactions: [
          {
            id: 'transaction-1',
            amount: 500,
            transaction_type: 'ADMIN_DEPOSIT',
            created_at: updatedAt,
            wallet: { user: { name: 'Student One' } },
          },
        ],
        _count: { created_transactions: 2 },
      } as never);

    const result = await getAccountDetail('admin-1');

    expect(result?.role).toBe('ADMIN');
    if (result?.role !== 'ADMIN') throw new Error('Expected an admin detail');
    expect(result.admin.transactionCount).toBe(2);
    expect(result.admin.recentTransactions[0]).toMatchObject({
      amount: 500,
      studentName: 'Student One',
    });
  });
});

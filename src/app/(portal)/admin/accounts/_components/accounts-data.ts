import type { AccountStatus, ReferralSourceKind, Role, SessionStatus, SessionType, TransactionType } from '@prisma/client';
import { requireAuth } from '@/features/auth/server/session';
import { prisma } from '@/shared/lib/prisma';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  TUTOR: 'Faculty Mentor',
  STUDENT: 'Student',
};

export interface AccountListItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  roleLabel: string;
  accountStatus: AccountStatus;
  referralSourceId: string | null;
  referralSourceName: string | null;
  referralSourceKind: ReferralSourceKind | null;
  createdAt: string;
}

interface CommonAccountDetail extends AccountListItem {
  updatedAt: string;
}

export interface StudentAccountDetail extends CommonAccountDetail {
  role: 'STUDENT';
  student: {
    linkedStudent: { id: string; name: string | null; relationshipId: string; discountAmount: number; createdAt: string } | null;
    linkedStudentDiscountMonthly: number;
    monthlyReceivables: Array<{ id: string; periodStart: string; periodEnd: string; enrollmentLabel: string; baseMonthlyPriceSnapshot: number; linkedDiscountSnapshot: number; expectedDueSnapshot: number; generatedAt: string }>;
    attendanceCount: number;
    wallet: {
      balance: number;
      isFlaggedOverdraft: boolean;
      createdAt: string;
      updatedAt: string;
    } | null;
    recentAttendances: Array<{
      id: string;
      attendedAt: string;
      sessionTitle: string;
      sessionType: SessionType;
      sessionStart: string;
      tutorName: string | null;
    }>;
  };
}

export interface TutorAccountDetail extends CommonAccountDetail {
  role: 'TUTOR';
  tutor: {
    sessionCount: number;
    hourlyRateOverride: string | null;
    recentSessions: Array<{
      id: string;
      title: string;
      sessionType: SessionType;
      status: SessionStatus;
      startTime: string;
      endTime: string;
      attendanceCount: number;
    }>;
  };
}

export interface AdminAccountDetail extends CommonAccountDetail {
  role: 'ADMIN';
  admin: {
    transactionCount: number;
    recentTransactions: Array<{
      id: string;
      amount: number;
      transactionType: TransactionType;
      createdAt: string;
      studentName: string | null;
    }>;
  };
}

export type AccountDetail =
  | StudentAccountDetail
  | TutorAccountDetail
  | AdminAccountDetail;

export function getAccountRoleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

export async function getAccounts(): Promise<AccountListItem[]> {
  await requireAuth(['ADMIN']);

  const accounts = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      account_status: true,
      referral_source_id: true,
      referral_source: { select: { id: true, name: true, kind: true } },
      created_at: true,
    },
    orderBy: [{ created_at: 'desc' }, { name: 'asc' }],
  });

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    role: account.role,
    roleLabel: getAccountRoleLabel(account.role),
    accountStatus: account.account_status,
    referralSourceId: account.referral_source_id,
    referralSourceName: account.referral_source?.name ?? null,
    referralSourceKind: account.referral_source?.kind ?? null,
    createdAt: account.created_at.toISOString(),
  }));
}

export async function getAccountDetail(id: string): Promise<AccountDetail | null> {
  await requireAuth(['ADMIN']);

  const account = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      account_status: true,
      referral_source_id: true,
      referral_source: { select: { id: true, name: true, kind: true } },
      tutor_hourly_rate_override: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!account) return null;

  const common = {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    role: account.role,
    roleLabel: getAccountRoleLabel(account.role),
    accountStatus: account.account_status,
    referralSourceId: account.referral_source_id,
    referralSourceName: account.referral_source?.name ?? null,
    referralSourceKind: account.referral_source?.kind ?? null,
    createdAt: account.created_at.toISOString(),
    updatedAt: account.updated_at.toISOString(),
  };

  if (account.role === 'STUDENT') {
    const [student, relationship, monthlyReceivables] = await Promise.all([prisma.user.findUnique({
      where: { id },
      select: {
        wallet: {
          select: {
            balance: true,
            is_flagged_overdraft: true,
            created_at: true,
            updated_at: true,
          },
        },
        attendances: {
          orderBy: { attended_at: 'desc' },
          take: 5,
          select: {
            id: true,
            attended_at: true,
            session: {
              select: {
                title: true,
                session_type: true,
                start_time: true,
                tutor: { select: { name: true } },
              },
            },
          },
        },
        _count: { select: { attendances: true } },
      },
    }), prisma.linkedStudentRelationship.findFirst({
      where: { active: true, OR: [{ student_a_id: id }, { student_b_id: id }] },
      include: { student_a: { select: { id: true, name: true } }, student_b: { select: { id: true, name: true } } },
    }), prisma.studentMonthlyReceivable.findMany({
      where: { student_id: id }, orderBy: { period_start: 'desc' }, take: 24,
      select: { id: true, period_start: true, period_end: true, enrollment_type_snapshot: true, base_amount_snapshot: true, linked_student_discount_snapshot: true, final_amount: true, created_at: true },
    })]);

    if (!student) return null;

    return {
      ...common,
      role: 'STUDENT',
      student: {
        linkedStudent: relationship ? {
          id: relationship.student_a_id === id ? relationship.student_b.id : relationship.student_a.id,
          name: relationship.student_a_id === id ? relationship.student_b.name : relationship.student_a.name,
          relationshipId: relationship.id,
          discountAmount: Number(relationship.discount_amount),
          createdAt: relationship.created_at.toISOString(),
        } : null,
        linkedStudentDiscountMonthly: relationship ? Number(relationship.discount_amount) : 0,
        monthlyReceivables: monthlyReceivables.map((row) => ({
          id: row.id, periodStart: row.period_start.toISOString().slice(0, 10), periodEnd: row.period_end.toISOString().slice(0, 10),
          enrollmentLabel: row.enrollment_type_snapshot, baseMonthlyPriceSnapshot: Number(row.base_amount_snapshot),
          linkedDiscountSnapshot: Number(row.linked_student_discount_snapshot), expectedDueSnapshot: Number(row.final_amount), generatedAt: row.created_at.toISOString(),
        })),
        attendanceCount: student._count.attendances,
        wallet: student.wallet
          ? {
              balance: Number(student.wallet.balance),
              isFlaggedOverdraft: student.wallet.is_flagged_overdraft,
              createdAt: student.wallet.created_at.toISOString(),
              updatedAt: student.wallet.updated_at.toISOString(),
            }
          : null,
        recentAttendances: student.attendances.map((attendance) => ({
          id: attendance.id,
          attendedAt: attendance.attended_at.toISOString(),
          sessionTitle: attendance.session.title,
          sessionType: attendance.session.session_type,
          sessionStart: attendance.session.start_time.toISOString(),
          tutorName: attendance.session.tutor.name,
        })),
      },
    };
  }

  if (account.role === 'TUTOR') {
    const tutor = await prisma.user.findUnique({
      where: { id },
      select: {
        tutored_sessions: {
          orderBy: { start_time: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            session_type: true,
            status: true,
            start_time: true,
            end_time: true,
            _count: { select: { attendances: true } },
          },
        },
        _count: { select: { tutored_sessions: true } },
        tutor_hourly_rate_override: true,
      },
    });

    if (!tutor) return null;

    return {
      ...common,
      role: 'TUTOR',
      tutor: {
        sessionCount: tutor._count.tutored_sessions,
        hourlyRateOverride: tutor.tutor_hourly_rate_override?.toFixed(2) ?? null,
        recentSessions: tutor.tutored_sessions.map((session) => ({
          id: session.id,
          title: session.title,
          sessionType: session.session_type,
          status: session.status,
          startTime: session.start_time.toISOString(),
          endTime: session.end_time.toISOString(),
          attendanceCount: session._count.attendances,
        })),
      },
    };
  }

  const admin = await prisma.user.findUnique({
    where: { id },
    select: {
      created_transactions: {
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          amount: true,
          transaction_type: true,
          created_at: true,
          wallet: { select: { user: { select: { name: true } } } },
        },
      },
      _count: { select: { created_transactions: true } },
    },
  });

  if (!admin) return null;

  return {
    ...common,
    role: 'ADMIN',
    admin: {
      transactionCount: admin._count.created_transactions,
      recentTransactions: admin.created_transactions.map((transaction) => ({
        id: transaction.id,
        amount: Number(transaction.amount),
        transactionType: transaction.transaction_type,
        createdAt: transaction.created_at.toISOString(),
        studentName: transaction.wallet.user.name,
      })),
    },
  };
}

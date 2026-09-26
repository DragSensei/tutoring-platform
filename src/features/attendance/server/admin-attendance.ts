import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { computeAttendanceClosesAt } from '@/shared/utils/deadline';

export type AdminAttendanceWarning = 'ATTENDANCE_MISSING' | 'ATTENDANCE_NEEDS_REVIEW' | 'RECOVERY_ACTIVE' | 'RECOVERY_EXPIRED' | 'TUTOR_RATE_MISSING' | 'SETTLEMENT_PENDING' | 'LINKED_STUDENTS_DIFFERENT_ENROLLMENT' | 'LINKED_STUDENTS_DIFFERENT_GROUPS';

export interface AdminAttendanceAttentionItem {
  id: string;
  title: string;
  tutorName: string;
  startTime: string;
  endTime: string;
  warnings: AdminAttendanceWarning[];
  deadline?: string;
  grantClosesAt?: string;
  adminReason?: string;
  reviewDetail?: string;
  kind?: 'SESSION' | 'LINKED_STUDENTS';
  reviewHref?: string;
  linkedStudents?: Array<{ id: string; name: string; enrollment: string }>;
}

export async function getAdminAttendanceAttention(now = new Date()): Promise<AdminAttendanceAttentionItem[]> {
  const policy = await prisma.platformPolicy.findUnique({
    where: { id: 'default' },
    select: { check_in_window_hours: true, default_tutor_hourly_rate: true },
  });
  const graceHours = policy?.check_in_window_hours ?? 4;
  const missing = await prisma.session.findMany({
    where: {
      end_time: { lte: now },
      attendance_submitted_at: null,
      historical_only: false,
      status: { not: 'CANCELLED' },
    },
    include: {
      tutor: { select: { name: true } },
      participants: { select: { student_id: true } },
      attendances: { select: { id: true } },
      attendance_recovery_grants: { orderBy: { opened_at: 'desc' }, take: 5 },
    },
    orderBy: { end_time: 'desc' },
    take: 300,
  });

  const items: AdminAttendanceAttentionItem[] = missing.flatMap((session) => {
    const closesAt = computeAttendanceClosesAt(session.end_time, graceHours);
    if (now <= closesAt) return [];
    const latestGrant = session.attendance_recovery_grants.find((grant) => !grant.used_at);
    const active = latestGrant && now >= latestGrant.opened_at && now <= latestGrant.closes_at;
    const warnings: AdminAttendanceWarning[] = ['ATTENDANCE_MISSING'];
    if (!session.participants.length) warnings.push('ATTENDANCE_NEEDS_REVIEW');
    if (active) warnings.push('RECOVERY_ACTIVE');
    else if (latestGrant && now > latestGrant.closes_at) warnings.push('RECOVERY_EXPIRED');
    return [{
      id: session.id,
      title: session.title,
      tutorName: session.tutor.name ?? 'Tutor',
      startTime: session.start_time.toISOString(),
      endTime: session.end_time.toISOString(),
      deadline: closesAt.toISOString(),
      grantClosesAt: latestGrant?.closes_at.toISOString(),
      adminReason: latestGrant?.admin_reason,
      reviewDetail: !session.participants.length
        ? session.attendances.length
          ? `${session.attendances.length} legacy attendance records exist without a Student roster; attendance cannot be finalized safely.`
          : 'This Session has no Student roster, so attendance cannot be finalized safely.'
        : undefined,
      warnings,
    }];
  });

  const eligibleForPay = await prisma.session.findMany({
    where: {
      end_time: { lte: now },
      attendance_submitted_at: { not: null },
      historical_only: false,
      status: { not: 'CANCELLED' },
      tutor_compensation: null,
      participants: { some: { attendance_outcome: 'PRESENT' } },
    },
    select: {
      id: true,
      title: true,
      start_time: true,
      end_time: true,
      attendance_finalized_at: true,
      tutor: { select: { name: true, tutor_hourly_rate_override: true } },
    },
    orderBy: { end_time: 'desc' },
    take: 300,
  });
  for (const session of eligibleForPay) {
    const warnings: AdminAttendanceWarning[] = [];
    const rate = session.tutor.tutor_hourly_rate_override ?? policy?.default_tutor_hourly_rate ?? new Prisma.Decimal(0);
    if (new Prisma.Decimal(rate).isZero()) warnings.push('TUTOR_RATE_MISSING');
    if (!session.attendance_finalized_at && now > computeAttendanceClosesAt(session.end_time, graceHours)) warnings.push('SETTLEMENT_PENDING');
    if (warnings.length) items.push({
      id: session.id,
      title: session.title,
      tutorName: session.tutor.name ?? 'Tutor',
      startTime: session.start_time.toISOString(),
      endTime: session.end_time.toISOString(),
      warnings,
    });
  }
  const linkedPairs = await prisma.linkedStudentRelationship.findMany({
    where: { active: true },
    include: {
      student_a: { select: { id: true, name: true, series_participants: { where: { series: { status: 'ACTIVE' } }, select: { series: { select: { id: true, title: true, session_type: true } } } } } },
      student_b: { select: { id: true, name: true, series_participants: { where: { series: { status: 'ACTIVE' } }, select: { series: { select: { id: true, title: true, session_type: true } } } } } },
    },
  });
  for (const pair of linkedPairs) {
    const enrollment = (student: typeof pair.student_a) => student.series_participants.map(({ series }) => series);
    const aAssignments = enrollment(pair.student_a);
    const bAssignments = enrollment(pair.student_b);
    const aGroups = aAssignments.filter((series) => series.session_type === 'GROUP');
    const bGroups = bAssignments.filter((series) => series.session_type === 'GROUP');
    const aPrivate = aAssignments.some((series) => series.session_type === 'PRIVATE');
    const bPrivate = bAssignments.some((series) => series.session_type === 'PRIVATE');
    let warning: AdminAttendanceWarning | null = null;
    if ((aPrivate && bGroups.length > 0) || (bPrivate && aGroups.length > 0)) warning = 'LINKED_STUDENTS_DIFFERENT_ENROLLMENT';
    else if (aGroups.some((a) => bGroups.some((b) => a.id !== b.id))) warning = 'LINKED_STUDENTS_DIFFERENT_GROUPS';
    if (!warning) continue;
    const aEnrollment = aGroups[0]?.title ?? (aPrivate ? 'Private' : 'No active schedule');
    const bEnrollment = bGroups[0]?.title ?? (bPrivate ? 'Private' : 'No active schedule');
    const warningTime = pair.created_at.toISOString();
    items.push({
      id: `linked-${pair.id}`,
      kind: 'LINKED_STUDENTS',
      title: 'Linked students need enrollment review',
      tutorName: '',
      startTime: warningTime,
      endTime: warningTime,
      warnings: [warning],
      reviewHref: `/admin/accounts/${pair.student_a.id}`,
      linkedStudents: [
        { id: pair.student_a.id, name: pair.student_a.name ?? 'Student', enrollment: aEnrollment },
        { id: pair.student_b.id, name: pair.student_b.name ?? 'Student', enrollment: bEnrollment },
      ],
    });
  }
  const bySession = new Map<string, AdminAttendanceAttentionItem>();
  for (const item of items) {
    const existing = bySession.get(item.id);
    bySession.set(item.id, existing ? { ...existing, warnings: [...new Set([...existing.warnings, ...item.warnings])] } : item);
  }
  return [...bySession.values()];
}

export async function grantLateAttendanceRecovery(adminId: string, sessionId: string, adminReason: string, currentTime = new Date()) {
  const reason = adminReason.trim();
  if (reason.length < 8 || reason.length > 1000) throw new Error('Add a short note explaining why attendance could not be submitted.');

  return withSerializableRetry(() => prisma.$transaction(async (tx) => {
    const admin = await tx.user.findUnique({ where: { id: adminId, role: 'ADMIN' }, select: { id: true } });
    if (!admin) throw new Error('Admin authorization is required.');
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        end_time: true,
        status: true,
        historical_only: true,
        attendance_submitted_at: true,
        attendance_finalized_at: true,
        _count: { select: { participants: true } },
      },
    });
    if (!session || session.historical_only || session.status === 'CANCELLED') throw new Error('Session is not eligible for attendance recovery.');
    if (session.attendance_submitted_at || session.attendance_finalized_at) throw new Error('Submitted or finalized attendance cannot be reopened.');

    const policy = await tx.platformPolicy.findUnique({
      where: { id: 'default' },
      select: { check_in_window_hours: true, late_attendance_recovery_window_hours: true },
    });
    const grace = policy?.check_in_window_hours ?? 4;
    const duration = policy?.late_attendance_recovery_window_hours ?? 1;
    if (!session._count.participants || currentTime <= computeAttendanceClosesAt(session.end_time, grace)) {
      throw new Error('Only overdue Sessions with an assigned Student roster can be reopened.');
    }
    const activeGrant = await tx.attendanceRecoveryGrant.findFirst({
      where: { session_id: session.id, used_at: null, opened_at: { lte: currentTime }, closes_at: { gte: currentTime } },
      select: { id: true },
    });
    if (activeGrant) throw new Error('A recovery window is already active for this Session.');

    const closesAt = new Date(currentTime.getTime() + duration * 60 * 60 * 1000);
    return tx.attendanceRecoveryGrant.create({
      data: {
        session_id: session.id,
        granted_by_admin_id: admin.id,
        admin_reason: reason,
        policy_duration_hours: duration,
        opened_at: currentTime,
        closes_at: closesAt,
      },
      select: { id: true, opened_at: true, closes_at: true, policy_duration_hours: true },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

async function withSerializableRetry<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
    }
  }
  throw new Error('Attendance recovery could not be granted');
}

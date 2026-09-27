import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { computeAttendanceClosesAt } from '@/shared/utils/deadline';
import { classifyZeroRosterSession } from '@/shared/utils/zero-roster';

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
  adminHandledAt?: string;
}

export interface AdminAttendanceHandledItem {
  id: string;
  title: string;
  tutorName: string;
  startTime: string;
  endTime: string;
  adminName: string;
  adminReason: string;
  interventionKind: 'RECOVERY_GRANTED' | 'ADMIN_RESOLVED';
  openedAt: string;
  closesAt: string | null;
  recoveryWindowActive: boolean;
  usedAt: string | null;
  tutorExplanation: string | null;
}

export interface AdminAttendanceInterventionBoard {
  needsAction: AdminAttendanceAttentionItem[];
  recoveryActive: AdminAttendanceHandledItem[];
  handled: AdminAttendanceHandledItem[];
  otherAttention: AdminAttendanceAttentionItem[];
  attention: AdminAttendanceAttentionItem[];
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
      _count: { select: { transactions: true, commission_entries: true } },
      tutor_compensation: { select: { id: true } },
      attendance_recovery_grants: { orderBy: { opened_at: 'desc' }, take: 5 },
    },
    orderBy: { end_time: 'desc' },
  });

  const items: AdminAttendanceAttentionItem[] = missing.flatMap((session) => {
    const closesAt = computeAttendanceClosesAt(session.end_time, graceHours);
    if (now <= closesAt) return [];
    const disposition = classifyZeroRosterSession({
      participantCount: session.participants.length,
      attendanceRecordCount: session.attendances.length,
      transactionCount: session._count?.transactions ?? 0,
      commissionEntryCount: session._count?.commission_entries ?? 0,
      hasTutorCompensation: Boolean(session.tutor_compensation),
    });
    if (disposition === 'NO_ACTION') return [];
    const latestGrant = session.attendance_recovery_grants[0];
    const active = latestGrant && !latestGrant.used_at && now >= latestGrant.opened_at && now <= latestGrant.closes_at;
    const warnings: AdminAttendanceWarning[] = disposition === 'HAS_ROSTER' ? ['ATTENDANCE_MISSING'] : ['ATTENDANCE_NEEDS_REVIEW'];
    if (active) warnings.push('RECOVERY_ACTIVE');
    else if (latestGrant && !latestGrant.used_at && now > latestGrant.closes_at) warnings.push('RECOVERY_EXPIRED');
    return [{
      id: session.id,
      title: session.title,
      tutorName: session.tutor.name ?? 'Tutor',
      startTime: session.start_time.toISOString(),
      endTime: session.end_time.toISOString(),
      deadline: closesAt.toISOString(),
      grantClosesAt: latestGrant?.closes_at.toISOString(),
      adminReason: latestGrant?.admin_reason,
      adminHandledAt: (session.admin_attendance_handled_at ?? latestGrant?.opened_at)?.toISOString(),
      reviewDetail: disposition === 'ADMIN_REVIEW'
        ? `No Student roster exists; ${[
            session.attendances.length ? `${session.attendances.length} attendance records` : '',
            (session._count?.transactions ?? 0) ? `${session._count.transactions} wallet transactions` : '',
            (session._count?.commission_entries ?? 0) ? `${session._count.commission_entries} commission records` : '',
            session.tutor_compensation ? 'Tutor compensation' : '',
          ].filter(Boolean).join(', ')} are retained for Admin data review. Tutor attendance is unavailable.`
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

export async function getAdminAttendanceInterventionBoard(now = new Date()): Promise<AdminAttendanceInterventionBoard> {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [attention, handledSessions] = await Promise.all([
    getAdminAttendanceAttention(now),
    prisma.session.findMany({
      where: {
        OR: [
          { admin_attendance_handled_at: { gte: cutoff, lte: now } },
          { attendance_recovery_grants: { some: { opened_at: { gte: cutoff, lte: now } } } },
        ],
      },
      select: {
        id: true,
        title: true,
        start_time: true,
        end_time: true,
        admin_attendance_handled_at: true,
        admin_attendance_handled_by: { select: { name: true } },
        admin_attendance_handling_note: true,
        tutor: { select: { name: true } },
        attendance_recovery_grants: {
          where: { opened_at: { gte: cutoff, lte: now } },
          orderBy: { opened_at: 'desc' },
          take: 1,
          select: {
            admin_reason: true,
            opened_at: true,
            closes_at: true,
            used_at: true,
            tutor_explanation: true,
            granted_by_admin: { select: { name: true } },
          },
        },
      },
    }),
  ]);
  const handledBySession = new Map<string, AdminAttendanceHandledItem>();
  for (const session of handledSessions) {
    const grant = session.attendance_recovery_grants[0];
    const handledAt = session.admin_attendance_handled_at ?? grant?.opened_at;
    if (!handledAt) continue;
    handledBySession.set(session.id, {
      id: session.id,
      title: session.title,
      tutorName: session.tutor.name ?? 'Tutor',
      startTime: session.start_time.toISOString(),
      endTime: session.end_time.toISOString(),
      adminName: session.admin_attendance_handled_by?.name ?? grant?.granted_by_admin.name ?? 'Admin',
      adminReason: session.admin_attendance_handling_note ?? grant?.admin_reason ?? 'Admin intervention completed.',
      interventionKind: grant ? 'RECOVERY_GRANTED' : 'ADMIN_RESOLVED',
      openedAt: handledAt.toISOString(),
      closesAt: grant?.closes_at.toISOString() ?? null,
      recoveryWindowActive: Boolean(grant && !grant.used_at && grant.opened_at <= now && grant.closes_at >= now),
      usedAt: grant?.used_at?.toISOString() ?? null,
      tutorExplanation: grant?.tutor_explanation ?? null,
    });
  }
  const handled = [...handledBySession.values()].sort((left, right) => Date.parse(right.openedAt) - Date.parse(left.openedAt));
  const attendanceWarnings = new Set<AdminAttendanceWarning>(['ATTENDANCE_MISSING', 'ATTENDANCE_NEEDS_REVIEW', 'RECOVERY_ACTIVE', 'RECOVERY_EXPIRED']);
  return {
    attention,
    needsAction: attention.filter((item) => !item.adminHandledAt && item.warnings.some((warning) => warning === 'ATTENDANCE_MISSING' || warning === 'ATTENDANCE_NEEDS_REVIEW')),
    recoveryActive: handled.filter((item) => item.recoveryWindowActive),
    handled: handled.filter((item) => !item.recoveryWindowActive),
    otherAttention: attention.flatMap((item) => {
      const warnings = item.warnings.filter((warning) => !attendanceWarnings.has(warning));
      return warnings.length ? [{ ...item, warnings }] : [];
    }),
  };
}

export async function grantLateAttendanceRecovery(adminId: string, sessionId: string, adminReason: string, currentTime = new Date()) {
  const reason = requireHandlingNote(adminReason, 'Add a short note explaining why attendance could not be submitted.');

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
        admin_attendance_handled_at: true,
        attendance_submitted_at: true,
        attendance_finalized_at: true,
        _count: { select: { participants: true } },
      },
    });
    if (!session || session.historical_only || session.status === 'CANCELLED') throw new Error('Session is not eligible for attendance recovery.');
    if (session.admin_attendance_handled_at) throw new Error('This Session has already been handled by Admin.');
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
    const previousGrant = await tx.attendanceRecoveryGrant.findFirst({
      where: { session_id: session.id },
      select: { id: true },
    });
    if (previousGrant) throw new Error('This Session has already been handled by Admin and cannot receive another recovery window.');

    const handled = await tx.session.updateMany({
      where: { id: session.id, admin_attendance_handled_at: null, attendance_submitted_at: null, attendance_finalized_at: null, status: { not: 'CANCELLED' }, historical_only: false },
      data: { admin_attendance_handled_at: currentTime, admin_attendance_handled_by_id: admin.id, admin_attendance_handling_note: reason },
    });
    if (handled.count !== 1) throw new Error('This Session has already been handled by Admin.');

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

export async function markAdminAttendanceHandled(adminId: string, sessionId: string, adminNote: string, currentTime = new Date()) {
  const note = requireHandlingNote(adminNote, 'Add a note explaining how this Session was handled.');
  return withSerializableRetry(() => prisma.$transaction(async (tx) => {
    const admin = await tx.user.findUnique({ where: { id: adminId, role: 'ADMIN' }, select: { id: true } });
    if (!admin) throw new Error('Admin authorization is required.');
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true, end_time: true, status: true, historical_only: true,
        admin_attendance_handled_at: true, attendance_submitted_at: true, attendance_finalized_at: true,
      },
    });
    if (!session || session.historical_only || session.status === 'CANCELLED') throw new Error('Session is not eligible for Admin handling.');
    if (session.admin_attendance_handled_at) throw new Error('This Session has already been handled by Admin.');
    if (session.attendance_submitted_at || session.attendance_finalized_at) throw new Error('Submitted or finalized attendance cannot be marked as unresolved.');

    const previousGrant = await tx.attendanceRecoveryGrant.findFirst({ where: { session_id: session.id }, select: { id: true } });
    if (previousGrant) throw new Error('This Session already has a recovery intervention.');
    const policy = await tx.platformPolicy.findUnique({ where: { id: 'default' }, select: { check_in_window_hours: true } });
    if (currentTime <= computeAttendanceClosesAt(session.end_time, policy?.check_in_window_hours ?? 4)) {
      throw new Error('Only overdue Sessions can be marked handled by Admin.');
    }

    const handled = await tx.session.updateMany({
      where: { id: session.id, admin_attendance_handled_at: null, attendance_submitted_at: null, attendance_finalized_at: null, status: { not: 'CANCELLED' }, historical_only: false },
      data: { admin_attendance_handled_at: currentTime, admin_attendance_handled_by_id: admin.id, admin_attendance_handling_note: note },
    });
    if (handled.count !== 1) throw new Error('This Session has already been handled by Admin.');
    return { handledAt: currentTime, note };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

function requireHandlingNote(input: string, errorMessage: string) {
  const note = input.trim();
  if (note.length < 8 || note.length > 1000) throw new Error(errorMessage);
  return note;
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

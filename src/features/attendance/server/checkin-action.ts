import { prisma } from '@/shared/lib/prisma';
import { isCheckInExpired } from '@/shared/utils/deadline';
import { CheckInVerificationResult, SessionType } from '@/shared/types';
import { Prisma } from '@prisma/client';
import {
  isTableNotExistError,
  OverdraftDisallowedError,
  PlatformPolicyReadError,
  reconcileSessionFinancialState,
} from './session-financials';

export { isTableNotExistError, OverdraftDisallowedError } from './session-financials';

export interface CheckInParams {
  token: string;
  studentId: string;
  currentTime?: Date;
}

/**
 * Executes student check-in with atomic verification, 4-hour expiration enforcement,
 * duplicate check-in prevention, and wallet balance deduction inside an isolated transaction.
 */
export async function executeStudentCheckIn({
  token,
  studentId,
  currentTime = new Date(),
}: CheckInParams): Promise<CheckInVerificationResult> {
  // Step 1: Validate session existence and status
  const session = await prisma.session.findUnique({
    where: { token },
    include: { tutor: true },
  });

  if (!session) {
    return {
      success: false,
      statusCode: 404,
      message: 'Session not found for the provided token',
    };
  }

  if (session.status === 'CANCELLED') {
    return {
      success: false,
      statusCode: 400,
      message: 'This session has been cancelled',
    };
  }

  if (session.status === 'COMPLETED') {
    return {
      success: false,
      statusCode: 409,
      message: 'Attendance for this session has already been finalized',
    };
  }

  // Step 2: 4-Hour Expiration Check (Strict HTTP 403 enforcement)
  if (isCheckInExpired(session.deadline, currentTime)) {
    return {
      success: false,
      statusCode: 403,
      message: 'Check-in window expired: Cannot check in after the 4-hour deadline.',
    };
  }

  // Step 3: Verify Student identity
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true },
  });

  if (!student) {
    return {
      success: false,
      statusCode: 404,
      message: 'Student account not found',
    };
  }

  if (student.role !== 'STUDENT') {
    return {
      success: false,
      statusCode: 403,
      message: 'Only students can check in to sessions',
    };
  }

  try {
    // Step 4: Atomic roster verification, attendance, and financial reconciliation.
    const result = await prisma.$transaction(async (tx) => {
      // Re-read lifecycle state inside the serializable transaction. The
      // preflight read above can become stale while a Tutor finalizes the
      // session; finalized attendance is authoritative and must not be
      // mutated by a late Student check-in.
      const currentSession = await tx.session.findUnique({
        where: { id: session.id },
        select: { status: true },
      });

      if (!currentSession) {
        throw new SessionStateError(404, 'Session not found for the provided token');
      }
      if (currentSession.status === 'CANCELLED') {
        throw new SessionStateError(400, 'This session has been cancelled');
      }
      if (currentSession.status === 'COMPLETED') {
        throw new SessionStateError(409, 'Attendance for this session has already been finalized');
      }

      const participant = await tx.sessionParticipant.findUnique({
        where: {
          session_id_student_id: {
            session_id: session.id,
            student_id: student.id,
          },
        },
      });

      if (!participant) {
        throw new StudentNotEnrolledError('Student is not assigned to this session');
      }

      const existingAttendance = await tx.attendanceRecord.findUnique({
        where: {
          session_id_student_id: {
            session_id: session.id,
            student_id: student.id,
          },
        },
      });

      if (existingAttendance) {
        throw new DuplicateAttendanceError('Student has already checked in for this session');
      }

      await tx.attendanceRecord.create({
        data: {
          session_id: session.id,
          student_id: student.id,
          attended_at: currentTime,
        },
      });

      const financials = await reconcileSessionFinancialState(tx, {
        sessionId: session.id,
        studentId: student.id,
        sessionType: session.session_type as SessionType,
        present: true,
        occurredAt: currentTime,
      });

      return {
        sessionTitle: session.title,
        deductedAmount: Number(financials.adjustment.abs()),
        newBalance: Number(financials.balance),
        isOverdraft: financials.isOverdraft,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return {
      success: true,
      statusCode: 200,
      message: 'Check-in successful and session fee deducted',
      sessionTitle: result.sessionTitle,
      deductedAmount: result.deductedAmount,
      newBalance: result.newBalance,
      isOverdraft: result.isOverdraft,
    };
  } catch (error) {
    if (error instanceof DuplicateAttendanceError) {
      return {
        success: false,
        statusCode: 409,
        message: error.message,
      };
    }

    if (error instanceof OverdraftDisallowedError) {
      return {
        success: false,
        statusCode: 402,
        message: error.message,
      };
    }

    if (error instanceof StudentNotEnrolledError) {
      return {
        success: false,
        statusCode: 403,
        message: 'Student is not assigned to this session',
      };
    }

    if (error instanceof SessionStateError) {
      return {
        success: false,
        statusCode: error.statusCode,
        message: error.message,
      };
    }

    if (error instanceof PlatformPolicyReadError) {
      console.error(
        '[ATTENDANCE_CHECKIN] Failed to retrieve platform policy configuration:',
        error.cause
      );
      return {
        success: false,
        statusCode: 500,
        message:
          'Failed to retrieve platform policy configuration due to a database error. Check-in aborted to prevent incorrect billing.',
      };
    }

    // Prisma unique constraint violation code
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        success: false,
        statusCode: 409,
        message: 'Duplicate check-in detected by database constraint',
      };
    }

    return {
      success: false,
      statusCode: 500,
      message: 'Failed to process check-in transaction. All operations rolled back.',
    };
  }
}

export class DuplicateAttendanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateAttendanceError';
  }
}

export class StudentNotEnrolledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudentNotEnrolledError';
  }
}

export class SessionStateError extends Error {
  constructor(public readonly statusCode: 400 | 404 | 409, message: string) {
    super(message);
    this.name = 'SessionStateError';
  }
}

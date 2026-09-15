import { prisma } from '@/shared/lib/prisma';
import { isCheckInExpired } from '@/shared/utils/deadline';
import { SESSION_PRICING, CheckInVerificationResult } from '@/shared/types';
import { Prisma } from '@prisma/client';

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
    include: { wallet: true },
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

  const sessionCost = SESSION_PRICING[session.session_type] ?? 375.00;

  try {
    // Step 4: Atomic Verification & Deduction Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 4a: Check duplicate attendance inside transaction
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

      // 4b: Ensure student has a wallet
      let wallet = student.wallet;
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            user_id: student.id,
            balance: new Prisma.Decimal(0.00),
            is_flagged_overdraft: false,
          },
        });
      }

      // 4c: Record entry in AttendanceRecords
      await tx.attendanceRecord.create({
        data: {
          session_id: session.id,
          student_id: student.id,
          attended_at: currentTime,
        },
      });

      // 4d: Calculate new balance and overdraft status
      const currentBalance = new Prisma.Decimal(wallet.balance);
      const deductionAmount = new Prisma.Decimal(sessionCost);
      const newBalance = currentBalance.sub(deductionAmount);
      const isOverdraft = newBalance.isNegative();

      // Update wallet balance & overdraft flag
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          is_flagged_overdraft: isOverdraft,
        },
      });

      // 4e: Append immutable transaction record to WalletTransactions
      await tx.walletTransaction.create({
        data: {
          wallet_id: updatedWallet.id,
          amount: deductionAmount.negated(),
          transaction_type: 'SESSION_DEDUCTION',
          session_id: session.id,
          created_at: currentTime,
        },
      });

      return {
        sessionTitle: session.title,
        deductedAmount: sessionCost,
        newBalance: Number(newBalance),
        isOverdraft,
      };
    });

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

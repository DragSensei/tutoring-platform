import { Prisma } from '@prisma/client';
import { SESSION_PRICING, SessionType } from '@/shared/types';

type BillingClient = Prisma.TransactionClient | {
  platformPolicy?: {
    findUnique: (args: { where: { id: string } }) => Promise<{
      private_session_price: Prisma.Decimal;
      group_session_price: Prisma.Decimal;
      allow_overdraft: boolean;
    } | null>;
  };
};

export interface SessionFinancialReconciliationInput {
  sessionId: string;
  studentId: string;
  sessionType: SessionType;
  present: boolean;
  occurredAt: Date;
}

export interface SessionFinancialReconciliationResult {
  adjustment: Prisma.Decimal;
  netSessionCharge: Prisma.Decimal;
  balance: Prisma.Decimal;
  isOverdraft: boolean;
}

export async function reconcileSessionFinancialState(
  tx: Prisma.TransactionClient,
  input: SessionFinancialReconciliationInput
): Promise<SessionFinancialReconciliationResult> {
  const billing = await getSessionBillingConfig(tx, input.sessionType);
  let wallet = await tx.wallet.findUnique({ where: { user_id: input.studentId } });

  if (!wallet) {
    wallet = await tx.wallet.create({
      data: {
        user_id: input.studentId,
        balance: new Prisma.Decimal(0),
        is_flagged_overdraft: false,
      },
    });
  }

  const ledger = await tx.walletTransaction.findMany({
    where: {
      wallet_id: wallet.id,
      session_id: input.sessionId,
      OR: [
        { transaction_type: 'SESSION_DEDUCTION' },
        // Attendance reconciliation refunds are unowned ledger entries.
        // Admin refunds carry created_by_user_id and remain independent
        // financial decisions that finalization must never reverse.
        { transaction_type: 'REFUND', created_by_user_id: null },
      ],
    },
    select: { amount: true, transaction_type: true },
    orderBy: { created_at: 'asc' },
  });

  const netSessionCharge = ledger.reduce(
    (total, entry) => total.add(new Prisma.Decimal(entry.amount)),
    new Prisma.Decimal(0)
  );
  const firstCharge = ledger.find((entry) => entry.transaction_type === 'SESSION_DEDUCTION');
  const targetNetCharge = input.present
    ? firstCharge
      ? new Prisma.Decimal(firstCharge.amount)
      : billing.price.negated()
    : new Prisma.Decimal(0);
  const adjustment = targetNetCharge.sub(netSessionCharge);

  if (adjustment.isZero()) {
    return {
      adjustment,
      netSessionCharge,
      balance: new Prisma.Decimal(wallet.balance),
      isOverdraft: wallet.is_flagged_overdraft,
    };
  }

  const currentBalance = new Prisma.Decimal(wallet.balance);
  const newBalance = currentBalance.add(adjustment);
  const isOverdraft = newBalance.isNegative();

  if (adjustment.isNegative() && !billing.allowOverdraft && isOverdraft) {
    throw new OverdraftDisallowedError(
      'Insufficient balance: Platform policy prohibits negative account balance'
    );
  }

  const updatedWallet = await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: newBalance,
      is_flagged_overdraft: isOverdraft,
    },
  });

  await tx.walletTransaction.create({
    data: {
      wallet_id: updatedWallet.id,
      amount: adjustment,
      transaction_type: adjustment.isNegative() ? 'SESSION_DEDUCTION' : 'REFUND',
      session_id: input.sessionId,
      created_by_user_id: null,
      created_at: input.occurredAt,
    },
  });

  return {
    adjustment,
    netSessionCharge: netSessionCharge.add(adjustment),
    balance: new Prisma.Decimal(updatedWallet.balance),
    isOverdraft: updatedWallet.is_flagged_overdraft,
  };
}

export async function getSessionBillingConfig(
  db: BillingClient,
  sessionType: SessionType
): Promise<{ price: Prisma.Decimal; allowOverdraft: boolean }> {
  let policy = null;
  if (!db.platformPolicy?.findUnique) {
    console.warn(
      '[ATTENDANCE_CHECKIN] PlatformPolicy model not defined on Prisma client. Falling back to default platform pricing.'
    );
  } else {
    try {
      policy = await db.platformPolicy.findUnique({ where: { id: 'default' } });
    } catch (error) {
      if (isTableNotExistError(error)) {
        console.warn(
          '[ATTENDANCE_CHECKIN] PlatformPolicy table does not exist in database (migration pending). Falling back to default pricing.',
          error
        );
      } else {
        throw new PlatformPolicyReadError(error);
      }
    }
  }

  return {
    price: new Prisma.Decimal(
      policy
        ? sessionType === 'PRIVATE'
          ? policy.private_session_price
          : policy.group_session_price
        : SESSION_PRICING[sessionType]
    ),
    allowOverdraft: policy?.allow_overdraft ?? true,
  };
}

export class OverdraftDisallowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OverdraftDisallowedError';
  }
}

export class PlatformPolicyReadError extends Error {
  constructor(public readonly cause: unknown) {
    super('Failed to retrieve platform policy configuration due to a database error');
    this.name = 'PlatformPolicyReadError';
  }
}

export function isTableNotExistError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
    return true;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code: unknown }).code === 'P2021';
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('p2021') ||
      message.includes('table does not exist') ||
      message.includes('no such table') ||
      message.includes('relation') && message.includes('does not exist')
    );
  }
  return false;
}

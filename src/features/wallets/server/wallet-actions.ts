import { prisma } from '@/shared/lib/prisma';
import { Prisma } from '@prisma/client';
import { AdminDepositInput, adminDepositSchema, RefundInput } from '../schemas';

export async function getStudentWallet(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error(`Cannot retrieve or create wallet: User "${userId}" not found in database.`);
  }

  let wallet = await prisma.wallet.findUnique({
    where: { user_id: userId },
    include: {
      transactions: {
        orderBy: { created_at: 'desc' },
        take: 50,
      },
    },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        user_id: userId,
        balance: new Prisma.Decimal(0.00),
        is_flagged_overdraft: false,
      },
      include: {
        transactions: true,
      },
    });
  }

  return {
    id: wallet.id,
    userId: wallet.user_id,
    balance: Number(wallet.balance),
    isFlaggedOverdraft: wallet.is_flagged_overdraft,
    transactions: wallet.transactions.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      transactionType: t.transaction_type,
      sessionId: t.session_id,
      createdAt: t.created_at.toISOString(),
    })),
  };
}

export function adminDeposit(input: AdminDepositInput) {
  return adminDepositAttempt(input, true);
}

async function adminDepositAttempt(input: AdminDepositInput, retryWalletCreateConflict: boolean) {
  if (!input.adminUserId) throw new Error('Admin identity is required for deposit provenance');
  const validation = adminDepositSchema.safeParse(input);
  if (!validation.success) throw new Error(validation.error.errors[0]?.message || 'Invalid deposit input');
  const request = validation.data;
  const admin = await prisma.user.findUnique({ where: { id: input.adminUserId }, select: { role: true } });
  if (admin?.role !== 'ADMIN') throw new Error('Admin identity is required for deposit provenance');
  const amountDec = new Prisma.Decimal(request.amount);
  const matchingDeposit = async (tx: Prisma.TransactionClient) => {
    const prior = await tx.walletTransaction.findUnique({ where: { request_key: request.requestKey } });
    if (!prior) return null;
    const wallet = await tx.wallet.findUnique({ where: { id: prior.wallet_id }, select: { id: true, user_id: true, balance: true, is_flagged_overdraft: true } });
    if (prior.transaction_type !== 'ADMIN_DEPOSIT' || prior.created_by_user_id !== input.adminUserId || !new Prisma.Decimal(prior.amount).equals(amountDec) || wallet?.user_id !== request.studentId) {
      throw new Error('Deposit request key was already used for different details');
    }
    return { walletId: wallet.id, creditedAmount: Number(prior.amount), newBalance: Number(wallet.balance), isFlaggedOverdraft: wallet.is_flagged_overdraft, transactionId: prior.id };
  };

  try {
    return await prisma.$transaction(async (tx) => {
      const prior = await matchingDeposit(tx);
      if (prior) return prior;
      const student = await tx.user.findUnique({ where: { id: request.studentId }, select: { role: true } });
      if (student?.role !== 'STUDENT') throw new Error('Student account not found');
      const wallet = await tx.wallet.upsert({
        where: { user_id: request.studentId },
        create: { user_id: request.studentId, balance: new Prisma.Decimal(0), is_flagged_overdraft: false },
        update: {},
      });
      const [updated] = await tx.$queryRaw<Array<{ id: string; balance: Prisma.Decimal; is_flagged_overdraft: boolean }>>(Prisma.sql`
        UPDATE "Wallet"
        SET balance = balance + ${amountDec},
            is_flagged_overdraft = balance + ${amountDec} < 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${wallet.id}
        RETURNING id, balance, is_flagged_overdraft
      `);
      const txRecord = await tx.walletTransaction.create({ data: {
        wallet_id: updated.id, amount: amountDec, transaction_type: 'ADMIN_DEPOSIT',
        created_by_user_id: input.adminUserId, request_key: request.requestKey,
      } });
      return { walletId: updated.id, creditedAmount: Number(txRecord.amount), newBalance: Number(updated.balance), isFlaggedOverdraft: updated.is_flagged_overdraft, transactionId: txRecord.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const prior = await prisma.walletTransaction.findUnique({ where: { request_key: request.requestKey } });
      const wallet = prior && await prisma.wallet.findUnique({ where: { id: prior.wallet_id }, select: { id: true, user_id: true, balance: true, is_flagged_overdraft: true } });
      if (prior) {
        if (wallet && prior.transaction_type === 'ADMIN_DEPOSIT' && prior.created_by_user_id === input.adminUserId && new Prisma.Decimal(prior.amount).equals(amountDec) && wallet.user_id === request.studentId) {
          return { walletId: wallet.id, creditedAmount: Number(prior.amount), newBalance: Number(wallet.balance), isFlaggedOverdraft: wallet.is_flagged_overdraft, transactionId: prior.id };
        }
        throw new Error('Deposit request key was already used for different details');
      }
      const target = error.meta?.target;
      if (retryWalletCreateConflict && Array.isArray(target) && target.includes('user_id')) {
        return adminDepositAttempt(input, false);
      }
    }
    throw error;
  }
}

export async function adminRefund(input: RefundInput) {
  if (!input.adminUserId) {
    throw new Error('Admin identity is required for refund provenance');
  }

  const amountDec = new Prisma.Decimal(input.amount);

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { id: input.walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found for refund');
    }

    const [updatedWallet] = await tx.$queryRaw<Array<{ id: string; balance: Prisma.Decimal; is_flagged_overdraft: boolean }>>(Prisma.sql`
      UPDATE "Wallet" SET balance = balance + ${amountDec}, is_flagged_overdraft = balance + ${amountDec} < 0,
      updated_at = CURRENT_TIMESTAMP WHERE id = ${wallet.id} RETURNING id, balance, is_flagged_overdraft
    `);

    const txRecord = await tx.walletTransaction.create({
      data: {
        wallet_id: updatedWallet.id,
        amount: amountDec,
        transaction_type: 'REFUND',
        session_id: input.sessionId,
        created_by_user_id: input.adminUserId,
      },
    });

    return {
      walletId: updatedWallet.id,
      newBalance: Number(updatedWallet.balance),
      transactionId: txRecord.id,
    };
  });
}

export async function getAllWalletsWithUsers() {
  const wallets = [];
  let cursorId: string | undefined;

  while (true) {
    const page = await prisma.wallet.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: [{ balance: 'asc' }, { id: 'asc' }], // Overdrafts first, with a stable tie-breaker.
      take: 50,
      cursor: cursorId ? { id: cursorId } : undefined,
      skip: cursorId ? 1 : 0,
    });

    wallets.push(...page);
    if (page.length < 50) break;

    const nextCursor = page[page.length - 1]?.id;
    if (!nextCursor || nextCursor === cursorId) {
      throw new Error('Wallet pagination did not advance its cursor');
    }
    cursorId = nextCursor;
  }

  return wallets.map((w) => ({
    id: w.id,
    userId: w.user_id,
    userName: w.user.name ?? 'Not provided',
    userEmail: w.user.email ?? 'Not provided',
    userPhone: w.user.phone ?? 'Not provided',
    role: w.user.role,
    balance: Number(w.balance),
    isFlaggedOverdraft: w.is_flagged_overdraft,
    transactionCount: w._count.transactions,
    updatedAt: w.updated_at.toISOString(),
  }));
}

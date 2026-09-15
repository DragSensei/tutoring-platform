import { prisma } from '@/shared/lib/prisma';
import { Prisma } from '@prisma/client';
import { AdminDepositInput, RefundInput } from '../schemas';

export async function getStudentWallet(userId: string) {
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

export async function adminDeposit(input: AdminDepositInput) {
  const amountDec = new Prisma.Decimal(input.amount);

  return prisma.$transaction(async (tx) => {
    let wallet = await tx.wallet.findUnique({
      where: { user_id: input.studentId },
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          user_id: input.studentId,
          balance: new Prisma.Decimal(0.00),
          is_flagged_overdraft: false,
        },
      });
    }

    const newBalance = new Prisma.Decimal(wallet.balance).add(amountDec);
    const isStillOverdraft = newBalance.isNegative();

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: newBalance,
        is_flagged_overdraft: isStillOverdraft,
      },
    });

    const txRecord = await tx.walletTransaction.create({
      data: {
        wallet_id: updatedWallet.id,
        amount: amountDec,
        transaction_type: 'ADMIN_DEPOSIT',
        created_by_user_id: input.adminUserId,
      },
    });

    return {
      walletId: updatedWallet.id,
      newBalance: Number(updatedWallet.balance),
      isFlaggedOverdraft: updatedWallet.is_flagged_overdraft,
      transactionId: txRecord.id,
    };
  });
}

export async function adminRefund(input: RefundInput) {
  const amountDec = new Prisma.Decimal(input.amount);

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { id: input.walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found for refund');
    }

    const newBalance = new Prisma.Decimal(wallet.balance).add(amountDec);
    const isStillOverdraft = newBalance.isNegative();

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: newBalance,
        is_flagged_overdraft: isStillOverdraft,
      },
    });

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
  const wallets = await prisma.wallet.findMany({
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
    orderBy: { balance: 'asc' }, // Overdrafts first
  });

  return wallets.map((w) => ({
    id: w.id,
    userId: w.user_id,
    userName: w.user.name,
    userEmail: w.user.email,
    userPhone: w.user.phone,
    role: w.user.role,
    balance: Number(w.balance),
    isFlaggedOverdraft: w.is_flagged_overdraft,
    transactionCount: w._count.transactions,
    updatedAt: w.updated_at.toISOString(),
  }));
}

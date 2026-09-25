'use server';

import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/shared/server/session';
import { prisma } from '@/shared/lib/prisma';
import { netPayout } from '@/features/finances/domain/payout-math';

function amountFrom(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !/^\d{1,8}(\.\d{1,2})?$/.test(value)) throw new Error('Enter a positive payout amount with up to two decimal places');
  const amount = new Prisma.Decimal(value);
  if (!amount.isPositive()) throw new Error('Payout amount must be greater than zero');
  return amount;
}

export interface PayoutActionState { message: string | null; key: string }

export async function recordPayout(previous: PayoutActionState, formData: FormData): Promise<PayoutActionState> {
  try {
  const actor = await requireAuth(['ADMIN']);
  const choice = formData.get('recipientChoice');
  const [type, id] = typeof choice === 'string' ? choice.split(':', 2) : [];
  const key = formData.get('idempotencyKey');
  if ((type !== 'tutor' && type !== 'source') || !id || id.length > 128) throw new Error('Choose a valid payout recipient');
  if (typeof key !== 'string' || !/^[0-9a-f-]{36}$/i.test(key)) throw new Error('Refresh the page and try again');
  const amount = amountFrom(formData.get('amount'));
  const noteValue = formData.get('note');
  const note = typeof noteValue === 'string' ? noteValue.trim().slice(0, 500) || null : null;
  const recipient = type === 'tutor' ? { tutor_id: id, source_id: null } : { tutor_id: null, source_id: id };

  const operation = async (tx: Prisma.TransactionClient) => {
    const existing = await tx.payoutSettlement.findUnique({ where: { idempotency_key: key }, select: { tutor_id: true, source_id: true, amount: true, note: true } });
    if (existing) {
      if (existing.tutor_id !== recipient.tutor_id || existing.source_id !== recipient.source_id || !existing.amount.equals(amount) || existing.note !== note) {
        throw new Error('This payout request key was already used for different details');
      }
      return;
    }
    if (type === 'tutor') {
      const tutor = await tx.user.findUnique({ where: { id }, select: { role: true } });
      if (!tutor || tutor.role !== 'TUTOR') throw new Error('Tutor recipient was not found');
    } else if (!await tx.referralSource.findUnique({ where: { id }, select: { id: true } })) {
      throw new Error('Sales source recipient was not found');
    }
    const [earned, payouts] = await Promise.all([
      type === 'tutor'
        ? tx.tutorCompensationLedgerEntry.aggregate({ where: { tutor_id: id }, _sum: { amount: true } })
        : tx.commissionLedgerEntry.aggregate({ where: { recipient_source_id: id }, _sum: { amount: true } }),
      tx.payoutSettlement.findMany({ where: recipient, select: { amount: true, reversal_of_id: true, tutor_id: true, source_id: true, reversal_of: { select: { amount: true, tutor_id: true, source_id: true, reversal_of_id: true } } } }),
    ]);
    const paid = netPayout(payouts);
    const outstanding = new Prisma.Decimal(earned._sum.amount ?? 0).minus(paid);
    if (amount.greaterThan(outstanding)) throw new Error('Payout exceeds this recipient’s outstanding earned balance');
    await tx.payoutSettlement.create({ data: {
      ...recipient,
      amount,
      created_by_user_id: actor.userId,
      idempotency_key: key,
      note,
    } });
  };
  for (let attempt = 0; ; attempt += 1) {
    try {
      await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await prisma.payoutSettlement.findUnique({ where: { idempotency_key: key }, select: { tutor_id: true, source_id: true, amount: true, note: true } });
        if (existing && existing.tutor_id === recipient.tutor_id && existing.source_id === recipient.source_id && existing.amount.equals(amount) && existing.note === note) break;
        throw new Error('This payout request key was already used for different details');
      }
      throw error;
    }
  }
  revalidatePath('/admin/finances');
  return { message: 'Payout recorded.', key: randomUUID() };
  } catch (error) {
    return { message: error instanceof Error ? error.message : 'Payout could not be recorded.', key: previous.key };
  }
}

import { Prisma } from '@prisma/client';

export interface PayoutEntry {
  amount: Prisma.Decimal;
  tutor_id: string | null;
  source_id: string | null;
  reversal_of_id: string | null;
  reversal_of?: Pick<PayoutEntry, 'amount' | 'tutor_id' | 'source_id' | 'reversal_of_id'> | null;
}

export function netPayout(entries: PayoutEntry[]) {
  return entries.reduce((sum, entry) => {
    if (!entry.reversal_of_id) return sum.plus(entry.amount);
    const original = entry.reversal_of;
    if (!original || original.reversal_of_id || original.tutor_id !== entry.tutor_id || original.source_id !== entry.source_id || !original.amount.equals(entry.amount)) {
      throw new Error('Invalid payout reversal requires finance review');
    }
    return sum.minus(entry.amount);
  }, new Prisma.Decimal(0));
}

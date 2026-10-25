import { z } from 'zod';

export const adminDepositSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  amount: z.number().finite().positive('Deposit amount must be greater than zero').max(99999999.99).refine((amount) => /^\d+(?:\.\d{1,2})?$/.test(amount.toString()), 'Deposit amount must have at most two decimal places'),
  requestKey: z.string().uuid(),
});

export type AdminDepositInput = z.infer<typeof adminDepositSchema> & { adminUserId: string };

export const refundSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
  amount: z.number().positive('Refund amount must be greater than zero'),
  sessionId: z.string().optional(),
  // Required so attendance reconciliation can distinguish an Admin refund
  // from its own unowned compensating REFUND entries.
  adminUserId: z.string().min(1, 'Admin identity is required'),
});

export type RefundInput = z.infer<typeof refundSchema>;

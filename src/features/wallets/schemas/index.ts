import { z } from 'zod';

export const adminDepositSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  amount: z.number().positive('Deposit amount must be greater than zero'),
  adminUserId: z.string().optional(),
});

export type AdminDepositInput = z.infer<typeof adminDepositSchema>;

export const refundSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
  amount: z.number().positive('Refund amount must be greater than zero'),
  sessionId: z.string().optional(),
  adminUserId: z.string().optional(),
});

export type RefundInput = z.infer<typeof refundSchema>;

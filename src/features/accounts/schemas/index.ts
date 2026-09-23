import { z } from 'zod';

export const createAccountSchema = z.object({
  role: z.enum(['TUTOR', 'STUDENT']),
  name: z.string().trim().max(120).optional().or(z.literal('')),
  email: z.string().trim().email('Use a valid email address').optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  referralSourceId: z.string().trim().min(1).nullable().optional(),
}).superRefine((input, context) => {
  if (input.role === 'TUTOR' && input.referralSourceId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['referralSourceId'], message: 'Referral source applies to Student accounts only' });
  }
  const values = [input.name, input.email, input.phone].filter(Boolean);
  if (values.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Provide at least one known profile detail' });
  }
  if (input.role === 'TUTOR' && (!input.name || !input.email || !input.phone)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Tutor profiles require name, email, and phone' });
  }
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

const tutorHourlyRate = z.string().regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/, 'Use a non-negative rate with up to two decimal places').nullable();

export const updateAccountProfileSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email('Use a valid email address').or(z.literal('')).optional(),
  phone: z.string().trim().max(40).optional(),
  referralSourceId: z.string().trim().min(1).nullable().optional(),
  tutorHourlyRateOverride: tutorHourlyRate.optional(),
});

export type UpdateAccountProfileInput = z.infer<typeof updateAccountProfileSchema>;

export const createReferralSourceSchema = z.object({
  name: z.string().trim().min(1, 'Source name is required').max(100),
  kind: z.enum(['REFERRAL', 'SALES']),
});

export type CreateReferralSourceInput = z.infer<typeof createReferralSourceSchema>;

export const accountSetupSchema = z.object({
  token: z.string().min(32, 'Setup token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().max(120).optional().or(z.literal('')),
  email: z.string().trim().email('Use a valid email address').optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
});

export type AccountSetupInput = z.infer<typeof accountSetupSchema>;

export const passwordResetSchema = z.object({
  token: z.string().min(32, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

import { z } from 'zod';

export const createAccountSchema = z.object({
  role: z.enum(['TUTOR', 'STUDENT']),
  name: z.string().trim().max(120).optional().or(z.literal('')),
  email: z.string().trim().email('Use a valid email address').optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
}).superRefine((input, context) => {
  const values = [input.name, input.email, input.phone].filter(Boolean);
  if (values.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Provide at least one known profile detail' });
  }
  if (input.role === 'TUTOR' && (!input.name || !input.email || !input.phone)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Tutor profiles require name, email, and phone' });
  }
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

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

import { z } from 'zod';

export const checkInSchema = z.object({
  token: z.string().uuid('Invalid session token format'),
  studentId: z.string().min(1, 'Student ID is required'),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

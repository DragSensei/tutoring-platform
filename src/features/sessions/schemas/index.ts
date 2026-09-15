import { z } from 'zod';

export const createSessionSchema = z.object({
  title: z.string().min(3, 'Session title must be at least 3 characters'),
  tutorId: z.string().min(1, 'Tutor ID is required'),
  sessionType: z.enum(['PRIVATE', 'GROUP']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const sessionFilterSchema = z.object({
  tutorId: z.string().optional(),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type SessionFilterInput = z.infer<typeof sessionFilterSchema>;

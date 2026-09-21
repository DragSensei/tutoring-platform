import { z } from 'zod';

export const createSessionSchema = z.object({
  title: z.string().min(3, 'Session title must be at least 3 characters'),
  tutorId: z.string().min(1, 'Tutor ID is required'),
  sessionType: z.enum(['PRIVATE', 'GROUP']),
  participantIds: z.array(z.string().min(1)).max(4),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
}).superRefine((input, context) => {
  const participantCount = new Set(input.participantIds).size;

  if (input.sessionType === 'PRIVATE' && participantCount !== 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['participantIds'],
      message: 'Private sessions require exactly one student',
    });
  }

  if (input.sessionType === 'GROUP' && (participantCount < 1 || participantCount > 4)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['participantIds'],
      message: 'Group sessions require one to four students',
    });
  }
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const sessionFilterSchema = z.object({
  tutorId: z.string().optional(),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type SessionFilterInput = z.infer<typeof sessionFilterSchema>;

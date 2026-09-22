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

export const sessionSeriesSchema = z.object({
  title: z.string().trim().min(3, 'Series title must be at least 3 characters'),
  tutorId: z.string().min(1, 'Tutor ID is required'),
  sessionType: z.enum(['PRIVATE', 'GROUP']),
  participantIds: z.array(z.string().min(1)).min(1, 'At least one student must be assigned').max(4),
  weekday: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  durationMinutes: z.number().int().min(30).max(480),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid start date'),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid end date').optional().or(z.literal('')),
}).superRefine((input, context) => {
  const participantCount = new Set(input.participantIds).size;
  if (input.sessionType === 'PRIVATE' && participantCount !== 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['participantIds'], message: 'Private series require exactly one student' });
  }
  if (input.endsOn && input.endsOn < input.startsOn) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['endsOn'], message: 'End date must be on or after the start date' });
  }
});

export type SessionSeriesInput = z.infer<typeof sessionSeriesSchema>;
export const recurrenceScopeSchema = z.enum(['THIS', 'THIS_AND_FUTURE', 'ENTIRE_SERIES']);
export type RecurrenceScope = z.infer<typeof recurrenceScopeSchema>;

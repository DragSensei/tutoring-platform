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

export const weeklyScheduleSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  durationMinutes: z.number().int().min(30).max(480),
}).refine((slot) => slot.startMinute + slot.durationMinutes <= 1440, 'Weekly times must end on the same day');

export const sessionSeriesSchema = z.object({
  title: z.string().trim().min(3, 'Series title must be at least 3 characters'),
  programCode: z.enum(['P1', 'P3', 'P4', 'P5']).nullable().optional(),
  courseName: z.string().trim().max(120).nullable().optional(),
  level: z.number().int().min(1).max(20).nullable().optional(),
  tutorId: z.string().min(1, 'Tutor ID is required'),
  sessionType: z.enum(['PRIVATE', 'GROUP']),
  participantIds: z.array(z.string().min(1)).min(1, 'At least one student must be assigned').max(4),
  weekday: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  durationMinutes: z.number().int().min(30).max(480),
  weeklySlots: z.array(weeklyScheduleSlotSchema).min(1).max(14).optional(),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid start date'),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid end date').optional().or(z.literal('')),
  pricingProfileId: z.string().min(1).nullable(),
  historicalStartsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid historical start date').nullable(),
}).superRefine((input, context) => {
  if (input.programCode === 'P5' && !input.courseName) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['courseName'], message: 'Choose the P5 course' });
  }
  const slots = input.weeklySlots ?? [{ weekday: input.weekday, startMinute: input.startMinute, durationMinutes: input.durationMinutes }];
  if (input.weeklySlots && JSON.stringify(slots[0]) !== JSON.stringify({ weekday: input.weekday, startMinute: input.startMinute, durationMinutes: input.durationMinutes })) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['weeklySlots'], message: 'The first weekly time must match the series primary time' });
  }
  for (let index = 0; index < slots.length; index++) {
    const slot = slots[index];
    if (slots.some((other, otherIndex) => otherIndex < index && other.weekday === slot.weekday && slot.startMinute < other.startMinute + other.durationMinutes && other.startMinute < slot.startMinute + slot.durationMinutes)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['weeklySlots', index], message: 'Weekly times for one group cannot overlap' });
    }
  }
  const participantCount = new Set(input.participantIds).size;
  if (input.sessionType === 'PRIVATE' && participantCount !== 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['participantIds'], message: 'Private series require exactly one student' });
  }
  if (input.endsOn && input.endsOn < input.startsOn) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['endsOn'], message: 'End date must be on or after the start date' });
  }
  if (input.historicalStartsOn && input.historicalStartsOn >= input.startsOn) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['historicalStartsOn'], message: 'Historical dates must be before the series starts on date' });
  }
});

export type SessionSeriesInput = z.infer<typeof sessionSeriesSchema>;
export const recurrenceScopeSchema = z.enum(['THIS', 'THIS_AND_FUTURE', 'ENTIRE_SERIES']);
export type RecurrenceScope = z.infer<typeof recurrenceScopeSchema>;

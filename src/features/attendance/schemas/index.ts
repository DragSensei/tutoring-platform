import { z } from 'zod';
import { MIN_SESSION_NOTE_LENGTH } from '../utils/attendance-review';

export const checkInSchema = z.object({
  token: z.string().uuid('Invalid session token format'),
  studentId: z.string().min(1, 'Student ID is required'),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

const attendanceOutcomesSchema = z.record(
  z.string().min(1).max(128),
  z.enum(['PRESENT', 'ABSENT']).nullable(),
).refine((outcomes) => Object.keys(outcomes).length <= 4, 'A Session roster may contain at most four Students');

const sessionIdSchema = z.string().min(1, 'Session ID is required').max(128);

export const tutorAttendanceDraftSchema = z.object({
  sessionId: sessionIdSchema,
  outcomes: attendanceOutcomesSchema,
  notes: z.string().trim().max(5000, 'Session notes must be 5000 characters or fewer'),
});

export const tutorAttendanceSubmissionSchema = z.object({
  sessionId: sessionIdSchema,
  outcomes: attendanceOutcomesSchema,
  notes: z
    .string()
    .trim()
    .min(
      MIN_SESSION_NOTE_LENGTH,
      `Session notes must be at least ${MIN_SESSION_NOTE_LENGTH} characters`
    )
    .max(5000, 'Session notes must be 5000 characters or fewer'),
  normalEvidenceSelected: z.boolean().optional(),
  recoveryGrantId: z.string().min(1).max(128).optional(),
  lateExplanation: z.string().trim().max(2000).optional(),
  tutorAttested: z.boolean().optional(),
  screenshotUnavailable: z.boolean().optional(),
});

export type TutorAttendanceDraftInput = z.infer<typeof tutorAttendanceDraftSchema>;
export type TutorAttendanceSubmissionInput = z.infer<typeof tutorAttendanceSubmissionSchema>;

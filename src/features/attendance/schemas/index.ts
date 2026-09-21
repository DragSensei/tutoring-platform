import { z } from 'zod';
import { MIN_SESSION_NOTE_LENGTH } from '../utils/attendance-review';

export const checkInSchema = z.object({
  token: z.string().uuid('Invalid session token format'),
  studentId: z.string().min(1, 'Student ID is required'),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

export const tutorAttendanceSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required').max(128),
  presentStudentIds: z.array(z.string().min(1).max(128)).max(4),
  notes: z
    .string()
    .trim()
    .min(
      MIN_SESSION_NOTE_LENGTH,
      `Session notes must be at least ${MIN_SESSION_NOTE_LENGTH} characters`
    )
    .max(5000, 'Session notes must be 5000 characters or fewer'),
});

export type TutorAttendanceInput = z.infer<typeof tutorAttendanceSchema>;

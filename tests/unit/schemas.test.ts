import { describe, it, expect } from 'vitest';
import { checkInSchema } from '@/features/attendance/schemas';
import { loginSchema, registerSchema } from '@/features/auth/schemas';
import { createSessionSchema } from '@/features/sessions/schemas';
import { adminDepositSchema } from '@/features/wallets/schemas';

describe('Domain Zod Schemas Validation', () => {
  describe('checkInSchema', () => {
    it('accepts valid UUID token and student ID', () => {
      const valid = {
        token: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        studentId: 'student_123',
      };
      const result = checkInSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects non-UUID strings for session token', () => {
      const invalid = {
        token: 'invalid-non-uuid-token',
        studentId: 'student_123',
      };
      const result = checkInSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid session token format');
      }
    });

    it('rejects empty studentId', () => {
      const invalid = {
        token: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        studentId: '',
      };
      const result = checkInSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('createSessionSchema', () => {
    it('accepts valid session payload with PRIVATE or GROUP type', () => {
      const valid = {
        title: 'Physics Mechanics I',
        tutorId: 'tutor_99',
        sessionType: 'PRIVATE',
        participantIds: ['student_123'],
        startTime: '2026-10-01T12:00:00.000Z',
        endTime: '2026-10-01T14:00:00.000Z',
      };
      expect(createSessionSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects invalid session types', () => {
      const invalid = {
        title: 'Physics Mechanics I',
        tutorId: 'tutor_99',
        sessionType: 'FREE_TRIAL', // Invalid
        startTime: '2026-10-01T12:00:00.000Z',
        endTime: '2026-10-01T14:00:00.000Z',
      };
      expect(createSessionSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('adminDepositSchema', () => {
    it('accepts positive amount and student ID', () => {
      const valid = {
        studentId: 'student_123',
        amount: 500,
      };
      expect(adminDepositSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects zero or negative deposit amounts', () => {
      expect(adminDepositSchema.safeParse({ studentId: 'std_1', amount: 0 }).success).toBe(false);
      expect(adminDepositSchema.safeParse({ studentId: 'std_1', amount: -100 }).success).toBe(false);
    });
  });

  describe('loginSchema & registerSchema', () => {
    it('validates email format and password length', () => {
      expect(loginSchema.safeParse({ email: 'test@example.com', password: 'password123' }).success).toBe(true);
      expect(loginSchema.safeParse({ email: 'bad-email', password: 'password123' }).success).toBe(false);
      expect(loginSchema.safeParse({ email: 'test@example.com', password: '123' }).success).toBe(false);
    });
  });
});

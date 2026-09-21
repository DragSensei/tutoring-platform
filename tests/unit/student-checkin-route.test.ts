import { describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/features/auth/server/session', () => ({ getSession: vi.fn() }));
vi.mock('@/features/attendance/server/checkin-action', () => ({
  executeStudentCheckIn: vi.fn(),
}));

const { getSession } = await import('@/features/auth/server/session');
const { executeStudentCheckIn } = await import('@/features/attendance/server/checkin-action');
const { POST } = await import('@/app/api/attend/[token]/route');

describe('student token check-in authorization', () => {
  it('rejects an unauthenticated check-in before invoking the domain mutation', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await POST({} as NextRequest, { params: { token: 'session-token' } });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: 'Student authentication is required' });
    expect(executeStudentCheckIn).not.toHaveBeenCalled();
  });

  it('uses the authenticated Student identity and ignores client studentId input', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'authenticated-student',
      email: 'student@example.com',
      name: 'Student',
      role: 'STUDENT',
    });
    vi.mocked(executeStudentCheckIn).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Check-in successful and session fee deducted',
      sessionTitle: 'Algebra',
      deductedAmount: 375,
      newBalance: 625,
      isOverdraft: false,
    });

    const response = await POST(
      new Request('http://localhost/api/attend/session-token', {
        method: 'POST',
        body: JSON.stringify({ studentId: 'client-supplied-foreign-id' }),
      }) as NextRequest,
      { params: { token: 'session-token' } }
    );

    expect(response.status).toBe(200);
    expect(executeStudentCheckIn).toHaveBeenCalledWith({
      token: 'session-token',
      studentId: 'authenticated-student',
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => cookieStore),
}));

const { prisma } = await import('@/shared/lib/prisma');
const { cookies } = await import('next/headers');
const {
  authenticateUser,
  clearSessionCookie,
  hashPassword,
  signSessionToken,
  verifySessionToken,
} = await import('@/features/auth/server/session');

const testPayload = {
  userId: 'student-1',
  email: 'student@example.com',
  name: 'Student One',
  role: 'STUDENT' as const,
};

describe('server authentication contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('AUTH_SECRET', 'test-auth-secret-that-is-at-least-32-characters');
  });

  it('verifies the stored password hash and creates an authenticated cookie', async () => {
    const passwordHash = await hashPassword('password123');
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: testPayload.userId,
      email: testPayload.email,
      name: testPayload.name,
      phone: '+201000000001',
      role: testPayload.role,
      password_hash: passwordHash,
      account_status: 'ACTIVE',
    } as never);

    const result = await authenticateUser({ identifier: testPayload.email, password: 'password123' });

    expect(result).toEqual({ success: true, user: testPayload });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { email: testPayload.email },
          { phone: testPayload.email },
        ],
      },
    });
    expect(cookieStore.set).toHaveBeenCalledWith(
      'tp_session_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 })
    );
  });

  it('supports the seeded phone identifier without trusting a client role', async () => {
    const passwordHash = await hashPassword('password123');
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'tutor-1',
      email: 'tutor@example.com',
      name: 'Tutor One',
      phone: '+201000000002',
      role: 'TUTOR',
      password_hash: passwordHash,
      account_status: 'ACTIVE',
    } as never);

    const result = await authenticateUser({ identifier: '+201000000002', password: 'password123' });

    expect(result).toMatchObject({
      success: true,
      user: { userId: 'tutor-1', role: 'TUTOR' },
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { email: '+201000000002'.toLowerCase() },
          { phone: '+201000000002' },
        ],
      },
    });
  });

  it('returns the same generic failure for wrong and unknown credentials', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    const unknown = await authenticateUser({ identifier: 'missing@example.com', password: 'password123' });

    const passwordHash = await hashPassword('password123');
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      ...testPayload,
      password_hash: passwordHash,
    } as never);
    const wrong = await authenticateUser({ identifier: testPayload.email, password: 'wrong-password' });

    expect(unknown).toEqual({ success: false, error: 'Invalid email or password' });
    expect(wrong).toEqual({ success: false, error: 'Invalid email or password' });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('does not disclose password-setup state before credential authentication', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'pending-credentials',
      email: 'pending@example.com',
      name: 'Pending Student',
      phone: '+201000000003',
      role: 'STUDENT',
      password_hash: null,
      account_status: 'PENDING_CREDENTIALS',
    } as never);

    await expect(authenticateUser({ identifier: 'pending@example.com', password: 'password123' })).resolves.toEqual({
      success: false,
      error: 'Invalid email or password',
    });
  });

  it('keeps a valid-password incomplete profile out of normal portal authentication', async () => {
    const passwordHash = await hashPassword('password123');
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'pending-profile',
      email: 'profile@example.com',
      name: null,
      phone: '+201000000004',
      role: 'STUDENT',
      password_hash: passwordHash,
      account_status: 'PENDING_PROFILE',
    } as never);

    await expect(authenticateUser({ identifier: 'profile@example.com', password: 'password123' })).resolves.toMatchObject({
      success: false,
      code: 'PROFILE_COMPLETION_REQUIRED',
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('round-trips the signed session identity and clears logout state', async () => {
    const token = await signSessionToken(testPayload);
    expect(await verifySessionToken(token)).toEqual(testPayload);

    await clearSessionCookie();
    expect(cookies).toHaveBeenCalled();
    expect(cookieStore.delete).toHaveBeenCalledWith('tp_session_token');
  });

  it('fails closed when production has no sufficiently strong signing secret', async () => {
    const previousNodeEnv = process.env.NODE_ENV || 'test';
    const previousSecret = process.env.AUTH_SECRET;
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_SECRET', '');

    await expect(signSessionToken(testPayload)).rejects.toThrow('AUTH_SECRET must be configured');

    vi.stubEnv('NODE_ENV', previousNodeEnv);
    vi.stubEnv('AUTH_SECRET', previousSecret || '');
  });
});

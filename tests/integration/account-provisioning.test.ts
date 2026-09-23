import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for database-backed integration tests');
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = process.env.TEST_DIRECT_DATABASE_URL?.trim() || testDatabaseUrl;
const authMocks = vi.hoisted(() => ({ requireAuth: vi.fn(), setSessionCookie: vi.fn() }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/features/auth/server/session', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/server/session')>('@/features/auth/server/session');
  return { ...actual, requireAuth: authMocks.requireAuth, setSessionCookie: authMocks.setSessionCookie };
});
vi.mock('@/shared/server/session', async () => {
  const actual = await vi.importActual<typeof import('@/shared/server/session')>('@/shared/server/session');
  return { ...actual, requireAuth: authMocks.requireAuth, setSessionCookie: authMocks.setSessionCookie };
});

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
vi.mock('next/headers', () => ({ cookies: vi.fn(() => cookieStore) }));
authMocks.setSessionCookie.mockImplementation(async () => {
  cookieStore.set('tp_session_token', 'test-session-token');
});

const { prisma } = await import('@/shared/lib/prisma');
const { authenticateUser, requireAuth, setSessionCookie } = await import('@/features/auth/server/session');
const { accountSetupSchema, createAccountSchema, passwordResetSchema } = await import('@/features/accounts/schemas');
const { createAdminAccount, issueAdminAccountSetupLink, issueAdminPasswordResetLink } = await import('@/app/(portal)/admin/accounts/actions');
const { completeAccountSetup } = await import('@/app/(auth)/login/setup/actions');
const { completePasswordReset } = await import('@/app/(auth)/login/reset/actions');

const prefix = `test-002-account-${process.pid}-${Date.now()}-`;
let counter = 0;

async function createUser(role: 'ADMIN' | 'TUTOR' | 'STUDENT', values: { name?: string | null; email?: string | null; phone?: string | null; passwordHash?: string | null; accountStatus?: 'ACTIVE' | 'PENDING_CREDENTIALS' | 'PENDING_PROFILE' } = {}) {
  const id = `${prefix}${counter++}`;
  return prisma.user.create({
    data: {
      name: values.name === undefined ? `${role} ${id}` : values.name,
      email: values.email === undefined ? `${id}@example.com` : values.email,
      phone: values.phone === undefined ? `+2010${String(counter).padStart(8, '0')}` : values.phone,
      password_hash: values.passwordHash === undefined ? 'fixture-password-hash' : values.passwordHash,
      role,
      account_status: values.accountStatus || 'ACTIVE',
    },
  });
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
}

describe('account provisioning and one-time setup', () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({ userId: 'admin-fixture', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' });
    vi.mocked(setSessionCookie).mockClear();
    cookieStore.set.mockClear();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('allows Admin provisioning for Tutor and partial Student accounts only', async () => {
    const tutor = await createAdminAccount({ role: 'TUTOR', name: 'Tutor Provisioned', email: `${prefix}tutor@example.com`, phone: '+201011111111' });
    const student = await createAdminAccount({ role: 'STUDENT', name: 'Student Known Only', email: '', phone: '' });

    expect(tutor.role).toBe('TUTOR');
    expect(student.role).toBe('STUDENT');
    expect(createAccountSchema.safeParse({ role: 'ADMIN', name: 'Not allowed', email: `${prefix}admin@example.com`, phone: '+201022222222' }).success).toBe(false);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: student.id } });
    expect(stored.name).toBe('Student Known Only');
    expect(stored.email).toBeNull();
    expect(stored.phone).toBeNull();
    expect(stored.password_hash).toBeNull();
    expect(stored.account_status).toBe('PENDING_CREDENTIALS');

    const token = await prisma.accountSetupToken.findFirstOrThrow({ where: { user_id: student.id } });
    expect(token.token_hash).not.toBe(student.setupToken);
    expect(token.token_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects non-Admin provisioning before touching the database', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Forbidden: Insufficient privileges'));
    await expect(createAdminAccount({ role: 'STUDENT', name: 'Denied', email: '', phone: '' })).rejects.toThrow('Forbidden');
  });

  it('does not consume or strand a token when setup profile data is incomplete', async () => {
    const account = await createAdminAccount({ role: 'STUDENT', name: 'Known Name', email: '', phone: '' });
    await expect(completeAccountSetup({ token: account.setupToken, password: 'password123', name: '', email: '', phone: '' })).rejects.toThrow('Complete your name');

    const beforeRetry = await prisma.user.findUniqueOrThrow({ where: { id: account.id } });
    const tokenBeforeRetry = await prisma.accountSetupToken.findFirstOrThrow({ where: { user_id: account.id } });
    expect(beforeRetry.password_hash).toBeNull();
    expect(beforeRetry.account_status).toBe('PENDING_CREDENTIALS');
    expect(tokenBeforeRetry.consumed_at).toBeNull();

    const completed = await completeAccountSetup({ token: account.setupToken, password: 'password123', name: 'Known Name', email: `${prefix}completed@example.com`, phone: '+201033333333' });
    expect(completed.profileComplete).toBe(true);
    expect(completed.accountStatus).toBe('ACTIVE');
    expect(setSessionCookie).toHaveBeenCalledWith(expect.objectContaining({ userId: account.id, email: `${prefix}completed@example.com`, name: 'Known Name', role: 'STUDENT' }));

    const afterSetup = await prisma.user.findUniqueOrThrow({ where: { id: account.id } });
    const consumedToken = await prisma.accountSetupToken.findFirstOrThrow({ where: { user_id: account.id } });
    expect(afterSetup.password_hash).not.toBe('password123');
    expect(afterSetup.password_hash).toBeTruthy();
    expect(afterSetup.account_status).toBe('ACTIVE');
    expect(consumedToken.consumed_at).toBeTruthy();
    await expect(completeAccountSetup({ token: account.setupToken, password: 'password123', name: 'Known Name', email: `${prefix}completed@example.com`, phone: '+201033333333' })).rejects.toThrow('invalid or expired');
  });

  it('revokes prior setup tokens, enforces expiry, and rejects duplicate final contact data', async () => {
    const account = await createAdminAccount({ role: 'STUDENT', name: 'Reissue Student', email: '', phone: '' });
    const firstToken = account.setupToken;
    const second = await issueAdminAccountSetupLink(account.id);
    const tokens = await prisma.accountSetupToken.findMany({ where: { user_id: account.id }, orderBy: { created_at: 'asc' } });
    expect(tokens).toHaveLength(2);
    expect(tokens[0].consumed_at).toBeTruthy();
    expect(tokens[1].consumed_at).toBeNull();
    await expect(completeAccountSetup({ token: firstToken, password: 'password123', name: 'Reissue Student', email: `${prefix}old@example.com`, phone: '+201044444444' })).rejects.toThrow('invalid or expired');

    await prisma.accountSetupToken.updateMany({ where: { user_id: account.id, consumed_at: null }, data: { expires_at: new Date(0) } });
    await expect(completeAccountSetup({ token: second.setupToken, password: 'password123', name: 'Reissue Student', email: `${prefix}expired@example.com`, phone: '+201055555555' })).rejects.toThrow('invalid or expired');

    const duplicateOwner = await createUser('STUDENT', { email: `${prefix}duplicate@example.com`, phone: '+201066666666' });
    const duplicateTarget = await createAdminAccount({ role: 'STUDENT', name: 'Duplicate Target', email: '', phone: '' });
    await expect(completeAccountSetup({ token: duplicateTarget.setupToken, password: 'password123', name: 'Duplicate Target', email: duplicateOwner.email!, phone: '+201077777777' })).rejects.toThrow('already uses');
    const duplicateToken = await prisma.accountSetupToken.findFirstOrThrow({ where: { user_id: duplicateTarget.id } });
    expect(duplicateToken.consumed_at).toBeNull();
  });

  it('validates setup input without allowing raw password or token persistence', () => {
    expect(accountSetupSchema.safeParse({ token: 'short', password: 'short' }).success).toBe(false);
    expect(passwordResetSchema.safeParse({ token: 'short', password: 'short' }).success).toBe(false);
    expect(createAccountSchema.safeParse({ role: 'STUDENT', name: '', email: '', phone: '' }).success).toBe(false);
  });

  it('resets an active Tutor password without returning or changing profile data', async () => {
    const account = await createUser('TUTOR', { name: 'Reset Tutor', email: `${prefix}reset-tutor@example.com`, phone: '+201088888888', passwordHash: 'old-password-hash' });
    const issued = await issueAdminPasswordResetLink(account.id);
    const storedToken = await prisma.accountSetupToken.findFirstOrThrow({ where: { user_id: account.id, purpose: 'PASSWORD_RESET' } });

    expect(storedToken.token_hash).not.toBe(issued.resetToken);
    expect(storedToken.token_hash).toMatch(/^[a-f0-9]{64}$/);
    const result = await completePasswordReset({ token: issued.resetToken, password: 'new-password123' });
    expect(result).toEqual({ userId: account.id, role: 'TUTOR' });
    expect(result).not.toHaveProperty('passwordHash');
    expect(setSessionCookie).not.toHaveBeenCalled();
    const login = await authenticateUser({ identifier: account.email!, password: 'new-password123' });
    expect(login.success).toBe(true);
    expect(cookieStore.set).toHaveBeenCalled();

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: account.id } });
    expect(updated.password_hash).not.toBe('old-password-hash');
    expect(updated.name).toBe('Reset Tutor');
    expect(updated.email).toBe(`${prefix}reset-tutor@example.com`);
    expect(updated.phone).toBe('+201088888888');
    expect(updated.role).toBe('TUTOR');
    expect(updated.account_status).toBe('ACTIVE');
    expect(storedToken.consumed_at).toBeNull();
    const consumed = await prisma.accountSetupToken.findUniqueOrThrow({ where: { id: storedToken.id } });
    expect(consumed.consumed_at).toBeTruthy();
    await expect(completePasswordReset({ token: issued.resetToken, password: 'another-password123' })).rejects.toThrow('invalid or expired');
  });

  it('rejects non-Admin password reset initiation', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Forbidden: Insufficient privileges'));
    await expect(issueAdminPasswordResetLink('some-user-id')).rejects.toThrow('Forbidden');
  });

  it('keeps setup and password-reset purposes mutually exclusive', async () => {
    const active = await createUser('STUDENT', { email: `${prefix}active-purpose@example.com`, phone: '+201089999991', passwordHash: 'active-hash' });
    const reset = await issueAdminPasswordResetLink(active.id);
    await expect(completeAccountSetup({ token: reset.resetToken, password: 'password123', name: 'Changed', email: `${prefix}changed@example.com`, phone: '+201099999991' })).rejects.toThrow('invalid or expired');

    const pending = await createAdminAccount({ role: 'STUDENT', name: 'Pending Purpose', email: '', phone: '' });
    await expect(completePasswordReset({ token: pending.setupToken, password: 'password123' })).rejects.toThrow('invalid or expired');
    const pendingUser = await prisma.user.findUniqueOrThrow({ where: { id: pending.id } });
    expect(pendingUser.password_hash).toBeNull();
    expect(pendingUser.account_status).toBe('PENDING_CREDENTIALS');
  });

  it('revokes replacement reset tokens and rejects expired tokens generically', async () => {
    const account = await createUser('STUDENT', { email: `${prefix}replace-reset@example.com`, phone: '+201089999992', passwordHash: 'old-reset-hash' });
    const first = await issueAdminPasswordResetLink(account.id);
    const second = await issueAdminPasswordResetLink(account.id);
    const tokens = await prisma.accountSetupToken.findMany({ where: { user_id: account.id, purpose: 'PASSWORD_RESET' }, orderBy: { created_at: 'asc' } });
    expect(tokens).toHaveLength(2);
    expect(tokens[0].consumed_at).toBeTruthy();
    expect(tokens[1].consumed_at).toBeNull();
    await expect(completePasswordReset({ token: first.resetToken, password: 'password123' })).rejects.toThrow('invalid or expired');

    await prisma.accountSetupToken.update({ where: { id: tokens[1].id }, data: { expires_at: new Date(0) } });
    await expect(completePasswordReset({ token: second.resetToken, password: 'password123' })).rejects.toThrow('invalid or expired');
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: account.id } });
    expect(unchanged.password_hash).toBe('old-reset-hash');
  });

  it('atomically consumes a reset token once under concurrent use', async () => {
    const account = await createUser('STUDENT', { email: `${prefix}concurrent-reset@example.com`, phone: '+201089999993', passwordHash: 'concurrent-old-hash' });
    const issued = await issueAdminPasswordResetLink(account.id);
    const outcomes = await Promise.allSettled([
      completePasswordReset({ token: issued.resetToken, password: 'first-password123' }),
      completePasswordReset({ token: issued.resetToken, password: 'second-password123' }),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
    const token = await prisma.accountSetupToken.findFirstOrThrow({ where: { user_id: account.id, purpose: 'PASSWORD_RESET' } });
    expect(token.consumed_at).toBeTruthy();
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: account.id } });
    expect(updated.password_hash).not.toBe('concurrent-old-hash');
  });
});

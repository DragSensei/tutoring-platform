import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@/shared/server/session', () => ({ getSession: mocks.getSession }));

const { hasPortalAccess } = await import('@/app/(portal)/_components/protected-portal');

describe('protected portal route access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['ADMIN', 'TUTOR', 'STUDENT'] as const)('renders the %s portal for its matching role', async (role) => {
    mocks.getSession.mockResolvedValue({ userId: 'user-1', email: 'user@example.com', name: 'User', role });
    await expect(hasPortalAccess(role)).resolves.toBe(true);
  });

  it.each([
    ['ADMIN', 'TUTOR'], ['ADMIN', 'STUDENT'],
    ['TUTOR', 'ADMIN'], ['TUTOR', 'STUDENT'],
    ['STUDENT', 'ADMIN'], ['STUDENT', 'TUTOR'],
  ] as const)('hides the %s portal from a %s account', async (requiredRole, actualRole) => {
    mocks.getSession.mockResolvedValue({ userId: 'user-1', email: 'user@example.com', name: 'User', role: actualRole });
    await expect(hasPortalAccess(requiredRole)).resolves.toBe(false);
  });

  it('hides protected routes from unauthenticated visitors', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(hasPortalAccess('ADMIN')).resolves.toBe(false);
  });
});

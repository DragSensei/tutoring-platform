import { describe, expect, it } from 'vitest';
import { getRoleRedirectPath } from '@/features/auth/role-redirect';

describe('authenticated role destinations', () => {
  it.each([
    ['ADMIN', '/admin'],
    ['TUTOR', '/tutor/agenda'],
    ['STUDENT', '/student/dashboard'],
  ] as const)('routes %s to %s', (role, path) => {
    expect(getRoleRedirectPath(role)).toBe(path);
  });
});

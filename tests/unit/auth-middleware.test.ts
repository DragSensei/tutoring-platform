import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import { middleware } from '@/middleware';

const secret = new TextEncoder().encode('test-auth-secret-that-is-at-least-32-characters');

async function token(role: 'ADMIN' | 'TUTOR' | 'STUDENT') {
  return new SignJWT({ userId: `${role.toLowerCase()}-1`, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

function request(path: string, sessionToken?: string) {
  const req = new NextRequest(`http://localhost${path}`);
  if (sessionToken) req.cookies.set('tp_session_token', sessionToken);
  return req;
}

describe('protected portal middleware', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('AUTH_SECRET', 'test-auth-secret-that-is-at-least-32-characters');
  });

  it('rejects unauthenticated portal requests in development too', async () => {
    const response = await middleware(request('/admin'));
    expect(response?.headers.get('location')).toBe('http://localhost/login?from=%2Fadmin');
  });

  it('requires the exact role for each portal', async () => {
    const admin = await token('ADMIN');
    const tutor = await token('TUTOR');
    const student = await token('STUDENT');

    expect((await middleware(request('/admin', tutor)))?.headers.get('location')).toContain('admin_required');
    expect((await middleware(request('/tutor/agenda', admin)))?.headers.get('location')).toContain('tutor_required');
    expect((await middleware(request('/student/dashboard', admin)))?.headers.get('location')).toContain('student_required');
    expect((await middleware(request('/admin', admin)))?.status).toBe(200);
    expect((await middleware(request('/tutor/agenda', tutor)))?.status).toBe(200);
    expect((await middleware(request('/student/dashboard', student)))?.status).toBe(200);
  });
});

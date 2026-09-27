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

function request(path: string, sessionToken?: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  const req = new NextRequest(`http://localhost${path}`, {
    method: init.method ?? 'GET',
    headers: { accept: 'text/html', ...init.headers },
  });
  if (sessionToken) req.cookies.set('tp_session_token', sessionToken);
  return req;
}

describe('protected portal middleware', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('AUTH_SECRET', 'test-auth-secret-that-is-at-least-32-characters');
  });

  it('lets unauthenticated browser and RSC page navigation reach the layout 404 gate', async () => {
    const browserPage = await middleware(request('/admin'));
    const rscPage = await middleware(request('/student/dashboard', undefined, { headers: { accept: '*/*', rsc: '1' } }));
    expect(browserPage?.headers.get('x-middleware-next')).toBe('1');
    expect(rscPage?.headers.get('x-middleware-next')).toBe('1');
  });

  it('lets wrong-role UI navigation reach the layout and returns the canonical 404 there', async () => {
    const admin = await token('ADMIN');
    const tutor = await token('TUTOR');
    expect((await middleware(request('/tutor/agenda', admin)))?.headers.get('x-middleware-next')).toBe('1');
    expect((await middleware(request('/admin', tutor)))?.headers.get('x-middleware-next')).toBe('1');
  });

  it('keeps non-UI requests and server actions protected by the exact role', async () => {
    const admin = await token('ADMIN');
    const tutor = await token('TUTOR');
    const student = await token('STUDENT');

    const apiRequest = (path: string, roleToken?: string) => request(path, roleToken, { headers: { accept: 'application/json' } });
    const actionRequest = (path: string, roleToken?: string) => request(path, roleToken, { method: 'POST', headers: { accept: '*/*', 'next-action': 'server-action-id' } });
    expect((await middleware(apiRequest('/admin/data')))?.headers.get('location')).toContain('from=%2Fadmin%2Fdata');
    expect((await middleware(actionRequest('/admin/accounts', tutor)))?.headers.get('location')).toContain('admin_required');
    expect((await middleware(actionRequest('/tutor/attendance', admin)))?.headers.get('location')).toContain('tutor_required');
    expect((await middleware(actionRequest('/student/dashboard', admin)))?.headers.get('location')).toContain('student_required');
    expect((await middleware(actionRequest('/admin/accounts', admin)))?.headers.get('x-middleware-next')).toBe('1');
    expect((await middleware(actionRequest('/tutor/attendance', tutor)))?.headers.get('x-middleware-next')).toBe('1');
    expect((await middleware(actionRequest('/student/dashboard', student)))?.headers.get('x-middleware-next')).toBe('1');
  });
});

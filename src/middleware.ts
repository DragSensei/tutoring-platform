import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'tp_session_token';
const DEVELOPMENT_AUTH_SECRET = 'fallback-super-secret-key-that-is-at-least-32-chars!';

interface SessionPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'TUTOR' | 'STUDENT';
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only apply role protection to protected routes
  const isAdminRoute = pathname.startsWith('/admin');
  const isTutorRoute = pathname.startsWith('/tutor');
  const isStudentRoute = pathname.startsWith('/student');

  if (!isAdminRoute && !isTutorRoute && !isStudentRoute) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return redirectToLogin(req, pathname);
  }

  try {
    const configuredSecret = process.env.AUTH_SECRET?.trim();
    if (process.env.NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
      return redirectToLogin(req, pathname, 'auth_unavailable');
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(configuredSecret || DEVELOPMENT_AUTH_SECRET)
    );
    const role = (payload as unknown as SessionPayload).role;

    if (isAdminRoute && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login?error=admin_required', req.url));
    }

    if (isTutorRoute && role !== 'TUTOR') {
      return NextResponse.redirect(new URL('/login?error=tutor_required', req.url));
    }

    if (isStudentRoute && role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/login?error=student_required', req.url));
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

function redirectToLogin(req: NextRequest, pathname: string, error?: string) {
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', pathname);
  if (error) loginUrl.searchParams.set('error', error);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/tutor/:path*', '/student/:path*'],
};

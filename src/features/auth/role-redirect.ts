import type { Role } from '@/shared/types';

export function getRoleRedirectPath(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'TUTOR':
      return '/tutor/agenda';
    case 'STUDENT':
      return '/student/dashboard';
  }
}

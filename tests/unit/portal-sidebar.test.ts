import { describe, it, expect } from 'vitest';
import {
  isActivePortalRoute,
  getPortalSidebarAsideClasses,
  adminNavigation,
  tutorNavigation,
  studentNavigation,
} from '@/shared/components/portal-sidebar';

describe('Portal Sidebar Architectural Primitive', () => {
  describe('Route Matching Invariant (isActivePortalRoute)', () => {
    it('strictly matches /admin only when pathname is exact root', () => {
      expect(isActivePortalRoute('/admin', '/admin')).toBe(true);
      expect(isActivePortalRoute('/admin/gadwal', '/admin')).toBe(false);
      expect(isActivePortalRoute('/admin/wallets', '/admin')).toBe(false);
    });

    it('matches admin subroutes and nested paths correctly', () => {
      expect(isActivePortalRoute('/admin/gadwal', '/admin/gadwal')).toBe(true);
      expect(isActivePortalRoute('/admin/gadwal/new', '/admin/gadwal')).toBe(true);
      expect(isActivePortalRoute('/admin/wallets', '/admin/gadwal')).toBe(false);
      expect(isActivePortalRoute('/admin/mentors', '/admin/mentors')).toBe(true);
      expect(isActivePortalRoute('/admin/policies', '/admin/policies')).toBe(true);
      expect(isActivePortalRoute('/admin/mentors', '/admin/policies')).toBe(false);
    });

    it('matches tutor routes correctly without cross-route leakage', () => {
      expect(isActivePortalRoute('/tutor/agenda', '/tutor/agenda', '/tutor')).toBe(true);
      expect(isActivePortalRoute('/tutor/agenda/detail', '/tutor/agenda', '/tutor')).toBe(true);
      expect(isActivePortalRoute('/tutor/timetable', '/tutor/timetable', '/tutor')).toBe(true);
      expect(isActivePortalRoute('/tutor/history', '/tutor/history', '/tutor')).toBe(true);
      expect(isActivePortalRoute('/tutor/timetable', '/tutor/agenda', '/tutor')).toBe(false);
      expect(isActivePortalRoute('/tutor/history', '/tutor/timetable', '/tutor')).toBe(false);
    });

    it('matches student routes correctly without cross-route leakage', () => {
      expect(isActivePortalRoute('/student/dashboard', '/student/dashboard', '/student')).toBe(true);
      expect(isActivePortalRoute('/student/wallet', '/student/wallet', '/student')).toBe(true);
      expect(isActivePortalRoute('/student/dashboard', '/student/wallet', '/student')).toBe(false);
      expect(isActivePortalRoute('/student/wallet', '/student/dashboard', '/student')).toBe(false);
    });

    it('strictly returns false for placeholder, anchor, or empty items', () => {
      expect(isActivePortalRoute('/admin/gadwal', '#')).toBe(false);
      expect(isActivePortalRoute('/admin', '#')).toBe(false);
      expect(isActivePortalRoute('/admin/wallets', '')).toBe(false);
      expect(isActivePortalRoute('/admin/gadwal', '#tutors')).toBe(false);
    });
  });

  describe('Desktop Aside Viewport Invariant (getPortalSidebarAsideClasses)', () => {
    it('applies top-0 and full h-screen when hasGlobalHeader is false (Admin)', () => {
      const classes = getPortalSidebarAsideClasses({ hasGlobalHeader: false, isCollapsed: false });
      expect(classes).toContain('sticky top-0 h-screen');
      expect(classes).toContain('w-64');
      expect(classes).toContain('hidden md:flex');
      expect(classes).toContain('border-r border-stone-200/80 bg-white');
    });

    it('applies collapsed width w-18 when isCollapsed is true', () => {
      const classes = getPortalSidebarAsideClasses({ hasGlobalHeader: false, isCollapsed: true });
      expect(classes).toContain('w-18');
      expect(classes).not.toContain('w-64');
    });

    it('applies top-16 and h-[calc(100vh-4rem)] when hasGlobalHeader is true (Tutor / Student)', () => {
      const classes = getPortalSidebarAsideClasses({ hasGlobalHeader: true, isCollapsed: false });
      expect(classes).toContain('sticky top-16 h-[calc(100vh-4rem)]');
      expect(classes).toContain('w-64');
      expect(classes).toContain('hidden md:flex');
      expect(classes).toContain('border-r border-stone-200/80 bg-white');
    });
  });

  describe('Role Navigation Integrity', () => {
    it('maintains Admin navigation clusters, routes, and bottom action', () => {
      expect(adminNavigation.roleTitle).toBe('Big Hero Admin');
      expect(adminNavigation.portalRoot).toBe('/admin');
      expect(adminNavigation.hasGlobalHeader).toBe(false);
      expect(adminNavigation.bottomActionLabel).toBe('Public Site');
      expect(adminNavigation.bottomActionHref).toBe('/');
      expect(adminNavigation.clusters).toHaveLength(3);

      const clusterTitles = adminNavigation.clusters.map((c) => c.title);
      expect(clusterTitles).toEqual(['ACADEMY CORE', 'FINANCIALS', 'GOVERNANCE']);

      const allHrefs = adminNavigation.clusters.flatMap((c) => c.items.map((i) => i.href));
      expect(allHrefs).toEqual([
        '/admin',
        '/admin/gadwal',
        '/admin/accounts',
        '/admin/wallets',
        '/admin/mentors',
        '/admin/policies',
      ]);
    });

    it('maintains Tutor navigation without artificial clusters', () => {
      expect(tutorNavigation.roleTitle).toBe('Big Hero Tutor');
      expect(tutorNavigation.roleSubtitle).toBe('Faculty portal');
      expect(tutorNavigation.portalRoot).toBe('/tutor');
      expect(tutorNavigation.hasGlobalHeader).toBe(true);
      expect(tutorNavigation.bottomActionLabel).toBe('Public Site');
      expect(tutorNavigation.bottomActionHref).toBe('/');
      expect(tutorNavigation.clusters).toHaveLength(1);
      expect(tutorNavigation.clusters[0].title).toBeUndefined();

      const items = tutorNavigation.clusters[0].items;
      expect(items.map((i) => i.label)).toEqual(['Agenda', 'Timetable', 'History']);
      expect(items.map((i) => i.href)).toEqual(['/tutor/agenda', '/tutor/timetable', '/tutor/history']);
    });

    it('maintains Student navigation with real destinations only', () => {
      expect(studentNavigation.roleTitle).toBe('Big Hero Student');
      expect(studentNavigation.roleSubtitle).toBe('Student portal');
      expect(studentNavigation.portalRoot).toBe('/student');
      expect(studentNavigation.hasGlobalHeader).toBe(true);
      expect(studentNavigation.bottomActionLabel).toBe('Public Site');
      expect(studentNavigation.bottomActionHref).toBe('/');
      expect(studentNavigation.clusters).toHaveLength(1);
      expect(studentNavigation.clusters[0].title).toBeUndefined();

      const items = studentNavigation.clusters[0].items;
      expect(items.map((i) => i.label)).toEqual(['Dashboard', 'Wallet & Ledger']);
      expect(items.map((i) => i.href)).toEqual(['/student/dashboard', '/student/wallet']);
    });
  });
});

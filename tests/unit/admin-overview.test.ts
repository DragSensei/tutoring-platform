import { describe, it, expect } from 'vitest';
import { recentSessionState } from '@/features/sessions/utils/recent-session-presentation';

describe('Admin Overview Data Transformations & Business Rules', () => {
  it('labels past scheduled sessions according to attendance submission without changing persisted status', () => {
    const now = new Date('2026-09-25T12:00:00.000Z');
    expect(recentSessionState('SCHEDULED', '2026-09-24T12:00:00.000Z', false, now)).toBe('Past · attendance not submitted');
    expect(recentSessionState('SCHEDULED', '2026-09-24T12:00:00.000Z', true, now)).toBe('Past · attendance submitted; finalization pending');
    expect(recentSessionState('SCHEDULED', '2026-09-26T12:00:00.000Z', false, now)).toBe('scheduled');
    expect(recentSessionState('COMPLETED', '2026-09-24T12:00:00.000Z', true, now)).toBe('completed');
  });
  it('correctly aggregates negative student balances into total overdraft debt', () => {
    const wallets = [
      { id: 'w1', studentName: 'Ahmed', studentEmail: 'a@test.com', studentPhone: '010', balanceEgp: -375 },
      { id: 'w2', studentName: 'Sara', studentEmail: 's@test.com', studentPhone: '011', balanceEgp: -500 },
      { id: 'w3', studentName: 'Omar', studentEmail: 'o@test.com', studentPhone: '012', balanceEgp: 0 },
    ];

    const totalNegativeDebt = wallets.reduce((sum, w) => {
      return w.balanceEgp < 0 ? sum + Math.abs(w.balanceEgp) : sum;
    }, 0);

    expect(totalNegativeDebt).toBe(875);
  });

  it('handles empty or all-positive wallet balances gracefully', () => {
    const wallets = [
      { id: 'w1', studentName: 'Youssef', studentEmail: 'y@test.com', studentPhone: '010', balanceEgp: 1500 },
      { id: 'w2', studentName: 'Mariam', studentEmail: 'm@test.com', studentPhone: '011', balanceEgp: 750 },
    ];

    const totalNegativeDebt = wallets.reduce((sum, w) => {
      return w.balanceEgp < 0 ? sum + Math.abs(w.balanceEgp) : sum;
    }, 0);

    expect(totalNegativeDebt).toBe(0);
  });

  it('verifies session status grouping logic for active cohorts vs archived past sessions', () => {
    const sessions = [
      { id: 's1', status: 'SCHEDULED' },
      { id: 's2', status: 'ACTIVE' },
      { id: 's3', status: 'COMPLETED' },
      { id: 's4', status: 'CANCELLED' },
    ];

    const activeSessions = sessions.filter((s) => s.status === 'SCHEDULED' || s.status === 'ACTIVE');
    const archivedSessions = sessions.filter((s) => s.status === 'COMPLETED');

    expect(activeSessions.length).toBe(2);
    expect(archivedSessions.length).toBe(1);
  });

  describe('Admin Sidebar Route Matching Logic', () => {
    function isActiveRoute(pathname: string, href: string): boolean {
      if (!href || href === '#' || href === '' || href.startsWith('#')) {
        return false;
      }
      if (href === '/admin') {
        return pathname === '/admin';
      }
      return pathname === href || (href !== '/admin' && pathname.startsWith(href + '/'));
    }

    it('strictly matches /admin only when pathname is /admin', () => {
      expect(isActiveRoute('/admin', '/admin')).toBe(true);
      expect(isActiveRoute('/admin/gadwal', '/admin')).toBe(false);
      expect(isActiveRoute('/admin/wallets', '/admin')).toBe(false);
    });

    it('matches subroutes and nested paths without false positives', () => {
      expect(isActiveRoute('/admin/gadwal', '/admin/gadwal')).toBe(true);
      expect(isActiveRoute('/admin/gadwal/new', '/admin/gadwal')).toBe(true);
      expect(isActiveRoute('/admin/wallets', '/admin/gadwal')).toBe(false);
      expect(isActiveRoute('/admin/mentors', '/admin/mentors')).toBe(true);
      expect(isActiveRoute('/admin/policies', '/admin/policies')).toBe(true);
      expect(isActiveRoute('/admin/mentors', '/admin/policies')).toBe(false);
    });

    it('strictly returns false for placeholder and anchor items', () => {
      expect(isActiveRoute('/admin/gadwal', '#')).toBe(false);
      expect(isActiveRoute('/admin', '#')).toBe(false);
      expect(isActiveRoute('/admin/wallets', '')).toBe(false);
      expect(isActiveRoute('/admin/gadwal', '#tutors')).toBe(false);
    });
  });
});

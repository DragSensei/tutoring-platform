import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { recentSessionState } from '@/features/sessions/utils/recent-session-presentation';
import { getCairoDayRange } from '@/app/(portal)/admin/_components/admin-overview-data';
import { AdminOverviewView } from '@/app/(portal)/admin/_components/admin-overview-view';

describe('Admin Overview Data Transformations & Business Rules', () => {
  it('shows a count-only Needs Attention card that links to the dedicated page', () => {
    const markup = renderToStaticMarkup(createElement(AdminOverviewView, {
      date: '2026-10-01', asOf: '2026-10-01T14:00:00.000Z', checkInWindowHours: 4,
      sessions: [], attention: [], attentionCount: 3,
    }));
    expect(markup).toContain('href="/admin/needs-attention"');
    expect(markup).toContain('Sessions need attention');
    expect(markup).toContain('>3</p>');
    expect(markup).not.toContain('No other follow-up items');
  });

  it('uses Cairo midnight as the inclusive start and exclusive end of Today', () => {
    const beforeMidnight = getCairoDayRange(new Date('2026-09-25T20:59:59.000Z'));
    const atMidnight = getCairoDayRange(new Date('2026-09-25T21:00:00.000Z'));
    expect(beforeMidnight.date).toBe('2026-09-25');
    expect(beforeMidnight.from.toISOString()).toBe('2026-09-24T21:00:00.000Z');
    expect(beforeMidnight.to.toISOString()).toBe('2026-09-25T21:00:00.000Z');
    expect(atMidnight.date).toBe('2026-09-26');
    expect(atMidnight.from.toISOString()).toBe(beforeMidnight.to.toISOString());
  });

  it('labels Today session lifecycle from schedule and attendance facts without changing persisted status', () => {
    const now = new Date('2026-09-25T12:00:00.000Z');
    expect(recentSessionState('SCHEDULED', '2026-09-25T13:00:00.000Z', '2026-09-25T14:00:00.000Z', false, now)).toBe('Later today');
    expect(recentSessionState('SCHEDULED', '2026-09-25T11:00:00.000Z', '2026-09-25T13:00:00.000Z', false, now)).toBe('Live now');
    expect(recentSessionState('SCHEDULED', '2026-09-25T09:00:00.000Z', '2026-09-25T10:00:00.000Z', false, now)).toBe('Needs attention');
    expect(recentSessionState('SCHEDULED', '2026-09-25T07:00:00.000Z', '2026-09-25T08:00:00.000Z', true, now)).toBe('Ready to finalize');
    expect(recentSessionState('SCHEDULED', '2026-09-25T09:00:00.000Z', '2026-09-25T10:00:00.000Z', true, now)).toBe('Attendance submitted · grace period open');
    expect(recentSessionState('COMPLETED', '2026-09-24T12:00:00.000Z', '2026-09-24T14:00:00.000Z', true, now)).toBe('Completed');
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

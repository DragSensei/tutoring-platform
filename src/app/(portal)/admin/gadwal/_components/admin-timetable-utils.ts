import type { SessionStatus } from '@/shared/types';
import { classifySessionOccurrence } from '@/shared/utils/session-timing';

export type AdminTimetableCategory = 'UPCOMING' | 'ACTIVE' | 'NEEDS_ATTENTION' | 'COMPLETED' | 'CANCELLED';
export type AdminTimetableSession = { id: string; startTime: string; endTime: string; status: SessionStatus };
export type AdminTimetableGroups<T extends AdminTimetableSession> = Record<AdminTimetableCategory, T[]>;

export function classifyAdminTimetableSession(
  session: AdminTimetableSession,
  attentionIds: ReadonlySet<string>,
  now: Date,
): AdminTimetableCategory {
  if (session.status === 'CANCELLED') return 'CANCELLED';
  if (attentionIds.has(session.id)) return 'NEEDS_ATTENTION';
  const state = classifySessionOccurrence(session.startTime, session.endTime, now.getTime());
  return state === 'ACTIVE' ? 'ACTIVE' : state === 'COMPLETED' ? 'COMPLETED' : 'UPCOMING';
}

export function groupAdminTimetableSessions<T extends AdminTimetableSession>(
  sessions: T[],
  attentionIds: ReadonlySet<string>,
  now: Date,
): AdminTimetableGroups<T> {
  const groups: AdminTimetableGroups<T> = { UPCOMING: [], ACTIVE: [], NEEDS_ATTENTION: [], COMPLETED: [], CANCELLED: [] };
  for (const session of sessions) groups[classifyAdminTimetableSession(session, attentionIds, now)].push(session);
  for (const category of Object.keys(groups) as AdminTimetableCategory[]) {
    groups[category].sort((left, right) => {
      const direction = category === 'COMPLETED' || category === 'CANCELLED' ? -1 : 1;
      return direction * (Date.parse(left.startTime) - Date.parse(right.startTime));
    });
  }
  return groups;
}

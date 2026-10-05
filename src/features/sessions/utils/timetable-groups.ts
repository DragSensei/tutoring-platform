export interface TimetableOccurrence {
  id: string;
  title: string;
  sessionType: 'GROUP' | 'PRIVATE';
  startTime: string;
  endTime: string;
  seriesId?: string | null;
  seriesSchedule?: { weekday: number; startMinute: number; durationMinutes: number };
  seriesSchedules?: Array<{ weekday: number; startMinute: number; durationMinutes: number }>;
}

export interface TimetableSessionGroup<T extends TimetableOccurrence = TimetableOccurrence> {
  id: string;
  seriesId: string | null;
  title: string;
  sessionType: T['sessionType'];
  sessions: T[];
  seriesSchedule?: { weekday: number; startMinute: number; durationMinutes: number };
  seriesSchedules?: Array<{ weekday: number; startMinute: number; durationMinutes: number }>;
}

export function groupTimetableSessions<T extends TimetableOccurrence>(sessions: T[]): TimetableSessionGroup<T>[] {
  const groups = new Map<string, TimetableSessionGroup<T>>();
  for (const session of sessions) {
    const id = session.seriesId ? `series:${session.seriesId}` : `session:${session.id}`;
    const group = groups.get(id);
    if (group) {
      group.sessions.push(session);
      continue;
    }
    groups.set(id, {
      id,
      seriesId: session.seriesId ?? null,
      title: session.title,
      sessionType: session.sessionType,
      sessions: [session],
      ...(session.seriesSchedule ? { seriesSchedule: session.seriesSchedule } : {}),
      ...(session.seriesSchedules ? { seriesSchedules: session.seriesSchedules } : {}),
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      sessions: [...group.sessions].sort((left, right) => Date.parse(left.startTime) - Date.parse(right.startTime)),
    }))
    .sort((left, right) => Date.parse(left.sessions[0].startTime) - Date.parse(right.sessions[0].startTime));
}

export function compactTimetablePreview<T extends TimetableOccurrence>(sessions: T[]): T[] {
  return groupTimetableSessions(sessions).map((group) => group.sessions[0]);
}

export function formatSeriesSchedule(group: TimetableSessionGroup): string {
  if (!group.seriesId) return '';
  const { sessions, seriesSchedule } = group;
  if (group.seriesSchedules && group.seriesSchedules.length > 1) {
    const slots = [...group.seriesSchedules].sort((left, right) => left.weekday - right.weekday || left.startMinute - right.startMinute);
    return `Intensive · ${slots.map((slot) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.weekday]} ${clockFromMinutes(slot.startMinute)}–${clockFromMinutes(slot.startMinute + slot.durationMinutes)}`).join(' · ')}`;
  }
  if (!seriesSchedule) return `${formatWeekday(sessions[0].startTime)} · ${formatClock(sessions[0].startTime)}–${formatClock(sessions[0].endTime)}`;
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][seriesSchedule.weekday];
  const endMinute = seriesSchedule.startMinute + seriesSchedule.durationMinutes;
  return `${weekday ?? 'Weekly'}s · ${clockFromMinutes(seriesSchedule.startMinute)}–${clockFromMinutes(endMinute)}`;
}

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', weekday: 'long' }).format(new Date(date));
}

function formatClock(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(date));
}

function clockFromMinutes(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

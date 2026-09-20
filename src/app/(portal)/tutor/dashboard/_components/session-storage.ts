import type { GadwalSessionItem } from '@/features/sessions/types';
import type { LocalScheduleException } from '@/features/sessions/components/weekly-session-schedule';

const STORAGE_KEY = 'big_hero_tutor_sessions_v1';
const EXCEPTIONS_STORAGE_KEY = 'big_hero_tutor_schedule_exceptions_v1';

export function getStoredSessions(fallbackSessions: GadwalSessionItem[]): GadwalSessionItem[] {
  if (typeof window === 'undefined') return fallbackSessions;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallbackSessions;
    const parsed = JSON.parse(raw) as GadwalSessionItem[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fall back to server provided data on parse error
  }
  return fallbackSessions;
}

export function saveStoredSessions(sessions: GadwalSessionItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Fallback gracefully on storage limit or private browsing
  }
}

export function getStoredScheduleExceptions(): Record<string, LocalScheduleException> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(EXCEPTIONS_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStoredScheduleExceptions(exceptions: Record<string, LocalScheduleException>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EXCEPTIONS_STORAGE_KEY, JSON.stringify(exceptions));
  } catch {
    // Local schedule exceptions remain optional when browser storage is unavailable.
  }
}

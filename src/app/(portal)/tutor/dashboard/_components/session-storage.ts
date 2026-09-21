import type { LocalScheduleException } from '@/features/sessions/components/weekly-session-schedule';

const EXCEPTIONS_STORAGE_KEY = 'big_hero_tutor_schedule_exceptions_v1';

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

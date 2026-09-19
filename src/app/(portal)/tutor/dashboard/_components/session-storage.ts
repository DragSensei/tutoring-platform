import type { GadwalSessionItem } from '@/features/sessions/types';

const STORAGE_KEY = 'big_hero_tutor_sessions_v1';

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

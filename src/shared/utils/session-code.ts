/**
 * Formats deterministic academy session codes matching client specifications (e.g., "ON-P3-6:00-8:00").
 * Format: [BRANCH]-[TRACK]-[START_TIME]-[END_TIME]
 */

export function formatSessionTime12(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '0:00';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d);

  const hour = parts.find((p) => p.type === 'hour')?.value || '0';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';

  return `${hour}:${minute}`;
}

export function formatSessionCode(session: {
  title?: string;
  startTime: Date | string | number;
  endTime: Date | string | number;
}): string {
  const title = session.title || '';

  // 1. If title already has an explicit academy code, extract it
  const explicitMatch = title.match(/([A-Z]{2,3}-[A-Z0-9]+-\d{1,2}:\d{2}-\d{1,2}:\d{2})/);
  if (explicitMatch) return explicitMatch[1];

  // 2. Identify track abbreviation
  let trackCode = 'P3';
  if (/pictoblox/i.test(title)) {
    trackCode = 'P3';
  } else if (/electronics/i.test(title) || /arduino/i.test(title)) {
    trackCode = 'E1';
  } else if (/robotics.*2/i.test(title) || /sumo/i.test(title)) {
    trackCode = 'R2';
  } else if (/private/i.test(title) || /1-on-1/i.test(title)) {
    trackCode = 'PV-C';
  } else if (/python/i.test(title)) {
    trackCode = 'PY1';
  }

  const startStr = formatSessionTime12(session.startTime);
  const endStr = formatSessionTime12(session.endTime);

  return `ON-${trackCode}-${startStr}-${endStr}`;
}

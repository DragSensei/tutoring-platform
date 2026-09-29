import { describe, expect, it } from 'vitest';
import { canonicalSeries, canonicalStudents, canonicalTutors } from '../../prisma/seed-data';

const byKey = new Map(canonicalSeries.map((series) => [series.key, series]));

describe('canonical three-Tutor seed contract', () => {
  it('has one canonical account identity for each intended Tutor', () => {
    expect(canonicalTutors.map(({ name }) => name)).toEqual(['Omnia Samy', 'Ahmed Alaa', 'Omar Ashraf']);
    expect(new Set(canonicalTutors.map(({ key }) => key)).size).toBe(3);
    expect(canonicalTutors.every(({ phone }) => phone === null)).toBe(true);
  });

  it('keeps Omnia assignments separate and records the source-backed shorthand carefully', () => {
    const omnia = canonicalSeries.filter(({ tutor }) => tutor === 'omnia');
    expect(omnia.map(({ weekday, startMinute }) => `${weekday}:${startMinute}`)).toEqual([
      '4:1080', '0:1050', '5:1200', '6:1200', '6:600', '2:960', '5:930', '6:660', '3:840',
    ]);
    expect(byKey.get('omnia-sat10')?.studentKeys).toEqual(['youssef-ibrahim', 'student-12135347']);
    expect(byKey.get('omnia-wed14-p1')).toMatchObject({ title: 'P1L1 · Lego · Abdelrahman', weekday: 3, startMinute: 840 });
    expect(omnia.every((series) => !('count' in series))).toBe(true);
  });

  it('uses Ahmed Monday 16:30 and retains both Saturday assignments independently', () => {
    expect(byKey.get('ahmed-mon1630')).toMatchObject({ weekday: 1, startMinute: 990, durationMinutes: 120 });
    expect(canonicalSeries.some(({ tutor, weekday, startMinute }) => tutor === 'ahmed' && weekday === 1 && startMinute === 980)).toBe(false);
    expect(byKey.get('ahmed-sat17')?.studentKeys).toEqual(['adham']);
    expect(byKey.get('ahmed-sat18')?.studentKeys).toEqual(['mazen']);
  });

  it('keeps Omar Sunday and Wednesday without restoring Friday or inventing a roster', () => {
    const omar = canonicalSeries.filter(({ tutor }) => tutor === 'omar');
    expect(omar.map(({ weekday, startMinute }) => `${weekday}:${startMinute}`)).toEqual(['0:1140', '3:1080']);
    expect(byKey.get('omar-sun19')?.studentKeys).toEqual(['bassant']);
    expect(byKey.get('omar-wed18-unassigned')?.studentKeys).toEqual([]);
  });

  it('has unique series keys and participant mappings to known Students', () => {
    const knownStudents = new Set(canonicalStudents.map(({ key }) => key));
    expect(new Set(canonicalSeries.map(({ key }) => key)).size).toBe(canonicalSeries.length);
    for (const series of canonicalSeries) {
      expect(new Set(series.studentKeys).size).toBe(series.studentKeys.length);
      expect(series.studentKeys.every((key) => knownStudents.has(key))).toBe(true);
    }
  });
});

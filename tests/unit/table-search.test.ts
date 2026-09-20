import { describe, expect, it } from 'vitest';
import { matchesTableSearch } from '@/shared/utils/table-search';

describe('table search matching', () => {
  it('matches meaningful row values without regard to case', () => {
    expect(matchesTableSearch(['Karim Mostafa', 'GROUP', 'Scheduled'], 'karim')).toBe(true);
    expect(matchesTableSearch(['Karim Mostafa', 'GROUP', 'Scheduled'], 'group')).toBe(true);
  });

  it('treats an empty query as an unfiltered table', () => {
    expect(matchesTableSearch(['Any session'], '  ')).toBe(true);
  });

  it('does not match omitted values', () => {
    expect(matchesTableSearch(['Robotics', undefined], 'electronics')).toBe(false);
  });
});

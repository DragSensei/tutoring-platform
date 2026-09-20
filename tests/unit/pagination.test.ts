import { describe, expect, it } from 'vitest';
import { paginate, TABLE_PAGE_SIZE } from '@/shared/utils/pagination';

describe('table pagination', () => {
  it('uses the fixed twelve-row table page size', () => {
    expect(TABLE_PAGE_SIZE).toBe(12);
  });

  it('keeps an empty table on its only page', () => {
    expect(paginate([], 1)).toEqual({ page: 1, pageCount: 1, items: [] });
  });

  it('returns a partial first page without adding items', () => {
    const items = Array.from({ length: 11 }, (_, index) => index + 1);

    expect(paginate(items, 1)).toEqual({ page: 1, pageCount: 1, items });
  });

  it('splits more than twelve items into deterministic pages', () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);

    expect(paginate(items, 2)).toEqual({
      page: 2,
      pageCount: 3,
      items: Array.from({ length: 12 }, (_, index) => index + 13),
    });
  });

  it('clamps invalid page requests to the available bounds', () => {
    const items = Array.from({ length: 13 }, (_, index) => index + 1);

    expect(paginate(items, 0).page).toBe(1);
    expect(paginate(items, 99)).toEqual({ page: 2, pageCount: 2, items: [13] });
  });
});

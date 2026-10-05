import { describe, expect, it, vi } from 'vitest';
import { collectPrismaPages } from '@/shared/lib/prisma-pagination';

describe('Prisma cursor pagination', () => {
  it('collects every page and advances from the last record id', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => ({ id: `row-${index + 1}` }));
    const loadPage = vi.fn(async (cursorId: string | undefined) =>
      cursorId ? [{ id: 'row-201' }] : firstPage,
    );

    const records = await collectPrismaPages(loadPage);

    expect(records).toHaveLength(201);
    expect(loadPage.mock.calls).toEqual([[undefined], ['row-200']]);
  });

  it('stops if a full page repeats its cursor', async () => {
    const repeatedPage = Array.from({ length: 200 }, (_, index) => ({ id: `row-${index + 1}` }));
    const loadPage = vi.fn(async () => repeatedPage);

    await expect(collectPrismaPages(loadPage)).rejects.toThrow('Prisma page did not advance its cursor');
    expect(loadPage).toHaveBeenCalledTimes(2);
  });
});

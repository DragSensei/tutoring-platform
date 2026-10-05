const PRISMA_PAGE_SIZE = 200;

export async function collectPrismaPages<T extends { id: string }>(
  loadPage: (cursorId: string | undefined) => Promise<T[]>,
): Promise<T[]> {
  const records: T[] = [];
  let cursorId: string | undefined;

  while (true) {
    const page = await loadPage(cursorId);
    records.push(...page);
    if (page.length < PRISMA_PAGE_SIZE) return records;

    const nextCursor = page[page.length - 1]?.id;
    if (!nextCursor || nextCursor === cursorId) {
      throw new Error('Prisma page did not advance its cursor');
    }
    cursorId = nextCursor;
  }
}

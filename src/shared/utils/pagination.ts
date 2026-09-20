export const TABLE_PAGE_SIZE = 12; // Fixed product requirement: every table shows twelve rows per page.

export interface PaginatedItems<T> {
  page: number;
  pageCount: number;
  items: T[];
}

export function paginate<T>(items: T[], page: number, pageSize = TABLE_PAGE_SIZE): PaginatedItems<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = (currentPage - 1) * pageSize;

  return { page: currentPage, pageCount, items: items.slice(start, start + pageSize) };
}

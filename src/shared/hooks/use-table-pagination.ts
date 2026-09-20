'use client';

import * as React from 'react';
import { paginate, TABLE_PAGE_SIZE } from '@/shared/utils/pagination';

export function useTablePagination<T>(items: T[]) {
  const [requestedPage, setPage] = React.useState(1);
  const result = paginate(items, requestedPage);

  React.useEffect(() => {
    if (requestedPage !== result.page) setPage(result.page);
  }, [requestedPage, result.page]);

  return { ...result, pageSize: TABLE_PAGE_SIZE, setPage };
}

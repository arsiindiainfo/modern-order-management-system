export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Every Pattern A list procedure (§6.3/§22) returns `TotalItems` via
 * `COUNT(*) OVER()` alongside each row in one result set. This strips that
 * column back off and builds the {data, meta} shape the response
 * envelope's isPaginatedShape() check already recognizes.
 */
export function toPaginatedResult<T extends { TotalItems: number }>(
  rows: T[],
  page: number,
  pageSize: number,
): PaginatedResult<Omit<T, 'TotalItems'>> {
  const totalItems = rows[0]?.TotalItems ?? 0;
  const data = rows.map((row) => {
    const rest = { ...row };
    delete (rest as Partial<T>).TotalItems;
    return rest;
  });
  return {
    data,
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

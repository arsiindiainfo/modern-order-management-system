import { Injectable, PipeTransform } from '@nestjs/common';

export interface PaginationQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * The ParsePaginationPipe named in the plan's §4 folder structure. Clamps
 * page/pageSize (§22 — larger values are clamped, not rejected) and passes
 * sortBy/sortDir/search through untouched. Sortable-column allow-listing
 * happens inside each stored procedure's CASE WHEN @SortBy = '...' branches
 * (§22) — an unrecognized column is silently ignored there, so there is no
 * separate allow-list to keep in sync here.
 */
@Injectable()
export class ParsePaginationPipe implements PipeTransform {
  transform(query: Record<string, string | undefined>): PaginationQuery {
    const page = Math.max(1, parseSafeInt(query.page, 1));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseSafeInt(query.pageSize, DEFAULT_PAGE_SIZE)),
    );
    const sortDir =
      query.sortDir === 'asc'
        ? 'asc'
        : query.sortDir === 'desc'
          ? 'desc'
          : undefined;

    return {
      ...query,
      page,
      pageSize,
      sortDir,
    };
  }
}

function parseSafeInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

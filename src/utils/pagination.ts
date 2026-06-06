/**
 * Shared pagination helpers, reusable across every domain.
 *
 * Mirrors the implementation in ekoru-marketplace
 * (`src/common/utils/pagination.ts`) so the `{ nodes, pageInfo }` connection
 * shape and behavior stay identical across services. Any resolver can return
 * the output of `createPaginatedResponse` directly.
 *
 * Typical usage in a service:
 *
 *   const { skip, take } = calculatePrismaParams(page, pageSize);
 *   const [items, totalCount] = await Promise.all([
 *     this.prisma.model.findMany({ where, skip, take }),
 *     this.prisma.model.count({ where }),
 *   ]);
 *   return createPaginatedResponse(items, totalCount, page, pageSize);
 */

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  nodes: T[];
  pageInfo: PageInfo;
}

/**
 * Builds the `pageInfo` block for a paginated result. `page` is clamped to a
 * minimum of 1. Cursors carry the current page number (as a string) when there
 * are results, otherwise `null` — page-number pagination kept in a Relay-shaped
 * envelope.
 */
export function calculatePagination(
  totalCount: number,
  page: number = 1,
  pageSize: number = 10,
): PageInfo {
  const currentPage = Math.max(1, page);
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startCursor = totalCount > 0 ? currentPage.toString() : null;
  const endCursor = totalCount > 0 ? currentPage.toString() : null;

  return {
    hasNextPage,
    hasPreviousPage,
    startCursor,
    endCursor,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
  };
}

/**
 * Translates a page/pageSize into Prisma's `skip`/`take`. `page` is clamped to
 * a minimum of 1, so callers can pass raw input safely.
 */
export function calculatePrismaParams(page: number = 1, pageSize: number = 10) {
  const currentPage = Math.max(1, page);
  const skip = (currentPage - 1) * pageSize;
  const take = pageSize;

  return { skip, take };
}

/**
 * Wraps a list of items into the standard `{ nodes, pageInfo }` connection
 * shape consumed by every `*Connection` GraphQL type.
 */
export function createPaginatedResponse<T>(
  items: T[],
  totalCount: number,
  page: number = 1,
  pageSize: number = 10,
): PaginatedResponse<T> {
  return {
    nodes: items,
    pageInfo: calculatePagination(totalCount, page, pageSize),
  };
}

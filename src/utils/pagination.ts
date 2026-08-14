export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const parsePagination = (query: { page?: unknown; limit?: unknown }): PaginationParams => {
  const page = Math.max(1, Math.trunc(Number(query.page)) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(Number(query.limit)) || DEFAULT_LIMIT));
  return { page, limit };
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

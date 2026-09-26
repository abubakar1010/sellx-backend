import type {
    CursorPaginationParams,
    OffsetPaginationParams,
} from '@/core/types/pagination.types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const parseOffsetPagination = (query: Record<string, unknown>): OffsetPaginationParams => {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const limit = Math.max(
        1,
        Math.min(MAX_LIMIT, Number(query.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT),
    );
    const sort = typeof query.sort === 'string' ? query.sort : '-createdAt';

    return { page, limit, sort };
};

export const parseCursorPagination = (query: Record<string, unknown>): CursorPaginationParams => {
    const limit = Math.max(
        1,
        Math.min(MAX_LIMIT, Number(query.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT),
    );
    const sort = typeof query.sort === 'string' ? query.sort : '-createdAt';
    const cursor = typeof query.cursor === 'string' ? query.cursor : undefined;

    return { cursor, limit, sort };
};

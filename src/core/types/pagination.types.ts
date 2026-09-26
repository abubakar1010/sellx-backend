// ── Offset-based (tables, dashboards) ─────────────────
export interface OffsetPaginationParams {
    page: number;
    limit: number;
    sort: string;
}

export interface OffsetPaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface OffsetPaginationResult<T> {
    data: T[];
    meta: OffsetPaginationMeta;
}

// ── Cursor-based (feeds, infinite scroll) ─────────────
export interface CursorPaginationParams {
    cursor?: string;
    limit: number;
    sort: string;
}

export interface CursorPaginationMeta {
    hasNext: boolean;
    nextCursor: string | null;
    limit: number;
}

export interface CursorPaginationResult<T> {
    data: T[];
    meta: CursorPaginationMeta;
}

import type {
    CursorPaginationParams,
    CursorPaginationResult,
    OffsetPaginationParams,
    OffsetPaginationResult,
} from '../types/pagination.types';

export interface RepositoryQueryOptions {
    signal?: AbortSignal;
}

export interface RepositoryWriteOptions extends RepositoryQueryOptions {
    session?: unknown;
}

export interface IBaseRepository<TDocument> {
    findById(id: string, options?: RepositoryQueryOptions): Promise<TDocument | null>;
    findOne(
        filter: Record<string, unknown>,
        options?: RepositoryQueryOptions,
    ): Promise<TDocument | null>;
    create(data: Partial<TDocument>, options?: RepositoryWriteOptions): Promise<TDocument>;
    updateById(
        id: string,
        data: Partial<TDocument>,
        options?: RepositoryWriteOptions,
    ): Promise<TDocument | null>;
    deleteById(id: string, options?: RepositoryWriteOptions): Promise<boolean>;
    find(filter: Record<string, unknown>, options?: RepositoryQueryOptions): Promise<TDocument[]>;
    count(filter: Record<string, unknown>, options?: RepositoryQueryOptions): Promise<number>;
    paginateOffset(
        filter: Record<string, unknown>,
        params: OffsetPaginationParams,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<TDocument>>;
    paginateCursor(
        filter: Record<string, unknown>,
        params: CursorPaginationParams,
        options?: RepositoryQueryOptions,
    ): Promise<CursorPaginationResult<TDocument>>;
}

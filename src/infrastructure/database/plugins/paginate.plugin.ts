import mongoose, { type Document, type Model, type Schema } from 'mongoose';

import type {
    CursorPaginationParams,
    CursorPaginationResult,
    OffsetPaginationParams,
    OffsetPaginationResult,
} from '@/core/types/pagination.types';

const MAX_LIMIT = 100;

const toSafeLimit = (limit: number): number => Math.max(1, Math.min(MAX_LIMIT, limit));

const parseSort = (sort: string): Record<string, 1 | -1> => {
    if (!sort) {
        return { createdAt: -1 };
    }

    if (sort.startsWith('-')) {
        return { [sort.slice(1)]: -1 };
    }

    return { [sort]: 1 };
};

export interface PaginateModel<TDocument extends Document> extends Model<TDocument> {
    paginateOffset(
        filter: Record<string, unknown>,
        params: OffsetPaginationParams,
    ): Promise<OffsetPaginationResult<TDocument>>;
    paginateCursor(
        filter: Record<string, unknown>,
        params: CursorPaginationParams,
    ): Promise<CursorPaginationResult<TDocument>>;
}

export const paginatePlugin = <TDocument extends Document>(schema: Schema<TDocument>): void => {
    schema.statics.paginateOffset = async function paginateOffset(
        filter: Record<string, unknown>,
        params: OffsetPaginationParams,
    ): Promise<OffsetPaginationResult<TDocument>> {
        const page = Math.max(1, params.page);
        const limit = toSafeLimit(params.limit);
        const skip = (page - 1) * limit;
        const sort = parseSort(params.sort);

        const [total, docs] = await Promise.all([
            this.countDocuments(filter),
            this.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limit));

        return {
            data: docs,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    };

    schema.statics.paginateCursor = async function paginateCursor(
        filter: Record<string, unknown>,
        params: CursorPaginationParams,
    ): Promise<CursorPaginationResult<TDocument>> {
        const limit = toSafeLimit(params.limit);
        const sort = parseSort(params.sort || '-createdAt');
        const sortField = Object.keys(sort)[0] || '_id';
        const sortDirection = (Object.values(sort)[0] as 1 | -1 | undefined) ?? -1;
        const query: Record<string, unknown> = { ...filter };

        if (params.cursor) {
            if (sortField === '_id' && mongoose.isValidObjectId(params.cursor)) {
                const cursorObjectId = new mongoose.Types.ObjectId(params.cursor);
                query._id = sortDirection === 1 ? { $gt: cursorObjectId } : { $lt: cursorObjectId };
            } else {
                query[sortField] =
                    sortDirection === 1 ? { $gt: params.cursor } : { $lt: params.cursor };
            }
        }

        const docs = await this.find(query)
            .sort(sort)
            .limit(limit + 1)
            .lean();

        const hasNext = docs.length > limit;
        const data = hasNext ? docs.slice(0, limit) : docs;
        const last = data.at(-1) as Record<string, unknown> | undefined;

        let nextCursor: string | null = null;
        if (hasNext && last) {
            const value = last[sortField] ?? last._id;
            nextCursor = value ? String(value) : null;
        }

        return {
            data,
            meta: {
                hasNext,
                nextCursor,
                limit,
            },
        };
    };
};

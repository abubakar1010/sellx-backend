import type { ClientSession, Document } from 'mongoose';

import type {
    IBaseRepository,
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import type {
    CursorPaginationParams,
    CursorPaginationResult,
    OffsetPaginationParams,
    OffsetPaginationResult,
} from '@/core/types/pagination.types';
import type { PaginateModel } from './plugins/paginate.plugin';

const createAbortError = (): Error => {
    const error = new Error('Operation aborted.');
    error.name = 'AbortError';
    return error;
};

const withAbort = async <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) {
        return promise;
    }

    if (signal.aborted) {
        throw createAbortError();
    }

    return new Promise<T>((resolve, reject) => {
        const abortHandler = (): void => reject(createAbortError());
        signal.addEventListener('abort', abortHandler, { once: true });

        promise
            .then(resolve)
            .catch(reject)
            .finally(() => signal.removeEventListener('abort', abortHandler));
    });
};

const resolveSession = (
    options?: RepositoryWriteOptions,
): { session?: ClientSession } | undefined => {
    if (!options?.session) {
        return undefined;
    }
    return { session: options.session as ClientSession };
};

export class BaseMongooseRepository<
    TDocument extends Document,
> implements IBaseRepository<TDocument> {
    constructor(protected readonly model: PaginateModel<TDocument>) {}

    async findById(id: string, options?: RepositoryQueryOptions): Promise<TDocument | null> {
        return withAbort(this.model.findById(id).lean<TDocument>(), options?.signal);
    }

    async findByIdWithPopulate(id: string, populate: string): Promise<TDocument | null> {
        return this.model.findById(id).populate(populate);
    }

    async findOneWithPopulate(
        filter: Record<string, unknown>,
        populate: string,
    ): Promise<TDocument | null> {
        return this.model.findOne(filter).populate(populate);
    }

    async findOne(
        filter: Record<string, unknown>,
        options?: RepositoryQueryOptions,
    ): Promise<TDocument | null> {
        return withAbort(
            this.model.findOne(filter as Record<string, unknown>).lean<TDocument>(),
            options?.signal,
        );
    }

    async create(data: Partial<TDocument>, options?: RepositoryWriteOptions): Promise<TDocument> {
        const operation = (async (): Promise<TDocument> => {
            const document = new this.model(data as Record<string, unknown>);
            await document.save(resolveSession(options));
            return document.toJSON() as TDocument;
        })();

        return withAbort(operation, options?.signal);
    }

    async updateById(
        id: string,
        data: Partial<TDocument>,
        options?: RepositoryWriteOptions,
    ): Promise<TDocument | null> {
        const operation = this.model
            .findByIdAndUpdate(id, data, {
                new: true,
                runValidators: true,
                ...resolveSession(options),
            })
            .lean<TDocument>();

        return withAbort(operation, options?.signal);
    }

    async deleteById(id: string, options?: RepositoryWriteOptions): Promise<boolean> {
        const operation = this.model.findByIdAndDelete(id, resolveSession(options));
        const result = await withAbort(operation, options?.signal);
        return result !== null;
    }

    async find(
        filter: Record<string, unknown>,
        options?: RepositoryQueryOptions,
    ): Promise<TDocument[]> {
        const operation = this.model.find(filter as Record<string, unknown>).lean<TDocument[]>();
        return withAbort(operation, options?.signal);
    }

    async count(
        filter: Record<string, unknown>,
        options?: RepositoryQueryOptions,
    ): Promise<number> {
        const operation = this.model.countDocuments(filter as Record<string, unknown>);
        return withAbort(operation, options?.signal);
    }

    async paginateOffset(
        filter: Record<string, unknown>,
        params: OffsetPaginationParams,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<TDocument>> {
        const operation = this.model.paginateOffset(filter as Record<string, unknown>, params);
        return withAbort(operation, options?.signal);
    }

    async paginateCursor(
        filter: Record<string, unknown>,
        params: CursorPaginationParams,
        options?: RepositoryQueryOptions,
    ): Promise<CursorPaginationResult<TDocument>> {
        const operation = this.model.paginateCursor(filter as Record<string, unknown>, params);
        return withAbort(operation, options?.signal);
    }
}

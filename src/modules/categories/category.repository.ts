// src/modules/category/category.repository.ts
import type { ClientSession } from 'mongoose';

import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import type {
    OffsetPaginationParams,
    OffsetPaginationResult,
} from '@/core/types/pagination.types';
import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';
import type { ICategoryDocument } from './category.interface';
import { CategoryModel } from './category.model';

const createAbortError = (): Error => {
    const abortError = new Error('Operation aborted.');
    abortError.name = 'AbortError';
    return abortError;
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

export class CategoryRepository extends BaseMongooseRepository<ICategoryDocument> {
    constructor() {
        super(CategoryModel);
    }

    async findById(
        id: string,
        options?: RepositoryQueryOptions,
    ): Promise<ICategoryDocument | null> {
        const operation = this.model.findOne({ _id: id }).lean<ICategoryDocument>();
        return withAbort(operation as Promise<ICategoryDocument | null>, options?.signal);
    }

    async findOne(
        filter: Record<string, unknown>,
        options?: RepositoryQueryOptions,
    ): Promise<ICategoryDocument | null> {
        const operation = this.model.findOne(filter).lean<ICategoryDocument>();
        return withAbort(operation as Promise<ICategoryDocument | null>, options?.signal);
    }

    async find(
        filter: Record<string, unknown>,
        options?: RepositoryQueryOptions,
    ): Promise<ICategoryDocument[]> {
        const operation = this.model.find(filter).lean<ICategoryDocument[]>();
        return withAbort(operation as Promise<ICategoryDocument[]>, options?.signal);
    }

    async count(
        filter: Record<string, unknown>,
        options?: RepositoryQueryOptions,
    ): Promise<number> {
        const operation = this.model.countDocuments(filter);
        return withAbort(operation as Promise<number>, options?.signal);
    }

    async updateById(
        id: string,
        data: Partial<ICategoryDocument>,
        options?: RepositoryWriteOptions,
    ): Promise<ICategoryDocument | null> {
        const operation = this.model
            .findOneAndUpdate({ _id: id }, data, {
                new: true,
                runValidators: true,
                ...resolveSession(options),
            })
            .lean<ICategoryDocument>();

        return withAbort(operation as Promise<ICategoryDocument | null>, options?.signal);
    }

    async paginateOffset(
        filter: Record<string, unknown>,
        params: OffsetPaginationParams,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<ICategoryDocument>> {
        const paginateOperation = this.model.paginateOffset(filter, {
            page: params.page,
            limit: params.limit,
            sort: params.sort,
        });

        return withAbort(paginateOperation, options?.signal);
    }

    async existsBySlug(
        slug: string,
        options?: RepositoryQueryOptions & { excludeId?: string },
    ): Promise<boolean> {
        const filter: Record<string, unknown> = { slug: slug.toLowerCase() };
        if (options?.excludeId) {
            filter._id = { $ne: options.excludeId };
        }
        const count = await this.count(filter, options);
        return count > 0;
    }

    async existsByTitle(
        title: string,
        options?: RepositoryQueryOptions & { excludeId?: string },
    ): Promise<boolean> {
        const filter: Record<string, unknown> = {
            title: { $regex: new RegExp(`^${title}$`, 'i') },
        };
        if (options?.excludeId) {
            filter._id = { $ne: options.excludeId };
        }
        const count = await this.count(filter, options);
        return count > 0;
    }
}

export const categoryRepository = new CategoryRepository();

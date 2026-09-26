import type { RepositoryQueryOptions, RepositoryWriteOptions } from '@/core/interfaces/repository.interface';
import type { OffsetPaginationParams, OffsetPaginationResult } from '@/core/types/pagination.types';
import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';
import type { ISavedSearchDocument } from './saved-search.interface';
import { SavedSearchModel } from './saved-search.model';
import { Types } from 'mongoose';

export class SavedSearchRepository extends BaseMongooseRepository<ISavedSearchDocument> {
    constructor() {
        super(SavedSearchModel);
    }

    async findByUserPaginated(
        userId: string,
        params: OffsetPaginationParams,
        category?: string,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<ISavedSearchDocument>> {
        const filter: Record<string, unknown> = { user: userId };
        if (category) filter.category = category;
        return this.paginateOffset(filter, params, options);
    }

    async deleteByIdAndUser(
        id: string,
        userId: string,
        options?: RepositoryWriteOptions,
    ): Promise<boolean> {
        const result = await SavedSearchModel.deleteOne(
            { _id: id, user: userId },
            options?.session ? { session: options.session as any } : {},
        );
        return result.deletedCount > 0;
    }

    async existsByUserAndText(userId: string, text: string): Promise<ISavedSearchDocument | null> {
        const doc = await SavedSearchModel.findOne({ user: userId, text }).lean();
        return doc;
    }
}

export const savedSearchRepository = new SavedSearchRepository();

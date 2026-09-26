import type { RepositoryQueryOptions, RepositoryWriteOptions } from '@/core/interfaces/repository.interface';
import type { OffsetPaginationParams, OffsetPaginationResult } from '@/core/types/pagination.types';
import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';
import type { IStoryDocument, IStoryView } from './story.interface';
import { StoryModel } from './story.model';

const withActive = (filter: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...filter,
    isDeleted: false,
    expiresAt: { $gt: new Date() },
});

export class StoryRepository extends BaseMongooseRepository<IStoryDocument> {
    constructor() {
        super(StoryModel);
    }

    async findActivePaginated(
        filter: Record<string, unknown>,
        params: OffsetPaginationParams,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<IStoryDocument>> {
        const operation = StoryModel.paginateOffset(
            withActive(filter),
            params,
        );
        return operation as Promise<OffsetPaginationResult<IStoryDocument>>;
    }

    async findAllActiveGrouped(
        filter: Record<string, unknown>,
        params: OffsetPaginationParams,
    ): Promise<OffsetPaginationResult<IStoryDocument>> {
        const finalFilter = withActive(filter);
        const page = Math.max(1, params.page);
        const limit = Math.max(1, Math.min(100, params.limit));
        const skip = (page - 1) * limit;
        const sort = params.sort || '-createdAt';

        const [total, docs] = await Promise.all([
            StoryModel.countDocuments(finalFilter),
            StoryModel.find(finalFilter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('user', 'firstName lastName avatarUrl')
                .populate('store', 'name logo')
                .populate('product', 'title media price currency')
                .lean(),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limit));

        return {
            data: docs as IStoryDocument[],
            meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        };
    }

    async findByIds(ids: string[]): Promise<IStoryDocument[]> {
        return StoryModel.find({ _id: { $in: ids } })
            .populate('user', 'firstName lastName avatarUrl')
            .populate('store', 'name logo')
            .populate('product', 'title media price currency')
            .lean() as Promise<IStoryDocument[]>;
    }

    async findActiveById(id: string): Promise<IStoryDocument | null> {
        return StoryModel.findOne(withActive({ _id: id }))
            .populate('user', 'firstName lastName avatarUrl')
            .populate('store', 'name logo')
            .populate('product', 'title media price currency')
            .lean<IStoryDocument>();
    }

    async addView(
        storyId: string,
        userId: string,
        options?: RepositoryWriteOptions,
    ): Promise<void> {
        const session = (options as any)?.session;

        await StoryModel.updateOne(
            { _id: storyId, 'views.user': { $ne: userId } },
            {
                $push: { views: { user: userId, viewedAt: new Date() } },
                $inc: { viewCount: 1 },
            },
            session ? { session } : {},
        );
    }

    async softDelete(id: string, userId: string): Promise<boolean> {
        const result = await StoryModel.updateOne(
            { _id: id, user: userId, isDeleted: false },
            {
                $set: { isDeleted: true, deletedAt: new Date() },
            },
        );
        return result.modifiedCount > 0;
    }
}

export const storyRepository = new StoryRepository();

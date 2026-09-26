import type { ClientSession, PipelineStage } from 'mongoose';

import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import type { OffsetPaginationParams, OffsetPaginationResult } from '@/core/types/pagination.types';
import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';
import type { IStoreDocument } from './store.interface';
import { StoreModel } from './store.model';

export class StoreRepository extends BaseMongooseRepository<IStoreDocument> {
    constructor() {
        super(StoreModel);
    }

    async findByUser(userId: string, options?: RepositoryQueryOptions) {
        const op = this.model.findOne({ user: userId, isActive: true });
        return op as Promise<IStoreDocument | null>;
    }

    async findByUserWithCategories(userId: string, options?: RepositoryQueryOptions) {
        const op = this.model
            .findOne({ user: userId, isActive: true })
            .populate('category', 'title slug');
        return op as Promise<IStoreDocument | null>;
    }

    async findBySlug(slug: string, options?: RepositoryQueryOptions) {
        const op = this.model.findOne({ slug, isActive: true }).lean();
        return op as Promise<IStoreDocument | null>;
    }

    async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
        const filter: Record<string, unknown> = { slug: slug.toLowerCase() };
        if (excludeId) filter._id = { $ne: excludeId };
        const count = await this.model.countDocuments(filter);
        return count > 0;
    }

    async existsByName(name: string, userId: string, excludeId?: string): Promise<boolean> {
        const filter: Record<string, unknown> = {
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            user: userId,
        };
        if (excludeId) filter._id = { $ne: excludeId };
        const count = await this.model.countDocuments(filter);
        return count > 0;
    }

    async incrementProductCount(storeId: string, increment: number = 1) {
        await this.model.updateOne({ _id: storeId }, { $inc: { totalProducts: increment } });
    }

    async incrementFollowerCount(storeId: string) {
        await this.model.updateOne({ _id: storeId }, { $inc: { followerCount: 1 } });
    }

    async decrementFollowerCount(storeId: string) {
        await this.model.updateOne({ _id: storeId }, { $inc: { followerCount: -1 } });
    }

    async paginateActive(
        params: { page: number; limit: number },
        options?: RepositoryQueryOptions,
    ) {
        const filter: any = { isActive: true, status: 'active' };
        const pipeline: PipelineStage[] = [
            { $match: filter },
            { $sort: { totalProducts: -1, followerCount: -1, createdAt: -1 } },
            { $skip: (params.page - 1) * params.limit },
            { $limit: params.limit },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        ];
        const [data, total] = await Promise.all([
            this.model.aggregate(pipeline).exec(),
            this.model.countDocuments(filter),
        ]);
        return { data: data as any, total, page: params.page, limit: params.limit };
    }

    async paginateByUser(
        userId: string,
        params: OffsetPaginationParams,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<IStoreDocument>> {
        const filter = { user: userId, isActive: true };
        return this.paginateOffset(filter, params, options);
    }

    async unsetFields(storeId: string, fields: string[]) {
        if (fields.length === 0) return;
        const unsetDoc: Record<string, string> = {};
        for (const field of fields) unsetDoc[field] = '';
        await this.model.updateOne({ _id: storeId }, { $unset: unsetDoc });
    }

    async cleanupDailyStats(storeId: string) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        await this.model.updateOne(
            { _id: storeId },
            { $pull: { dailyStats: { date: { $lt: thirtyDaysAgo } } } },
        );
    }

    async incrementViews(storeId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        today.setMilliseconds(0);

        const result = await this.model.updateOne(
            { _id: storeId, 'dailyStats.date': today },
            { $inc: { totalViews: 1, 'dailyStats.$.views': 1 } },
        );

        if (result.modifiedCount === 0) {
            await this.model.updateOne(
                { _id: storeId },
                {
                    $inc: { totalViews: 1 },
                    $push: { dailyStats: { date: today, views: 1, clicks: 0 } },
                },
            );
        }
    }

    async incrementClicks(storeId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        today.setMilliseconds(0);

        const result = await this.model.updateOne(
            { _id: storeId, 'dailyStats.date': today },
            { $inc: { totalClicks: 1, 'dailyStats.$.clicks': 1 } },
        );

        if (result.modifiedCount === 0) {
            await this.model.updateOne(
                { _id: storeId },
                {
                    $inc: { totalClicks: 1 },
                    $push: { dailyStats: { date: today, views: 0, clicks: 1 } },
                },
            );
        }
    }
}

export const storeRepository = new StoreRepository();

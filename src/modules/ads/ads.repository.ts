import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';
import type { RepositoryQueryOptions } from '@/core/interfaces/repository.interface';
import type { OffsetPaginationResult } from '@/core/types/pagination.types';
import type { IAdCampaignDocument } from './ads.interface';
import { AdCampaignModel } from './ads.model';

export class AdCampaignRepository extends BaseMongooseRepository<IAdCampaignDocument> {
    constructor() {
        super(AdCampaignModel);
    }

    async paginateByStore(
        storeId: string,
        filter: Record<string, unknown>,
        page: number,
        limit: number,
    ): Promise<OffsetPaginationResult<IAdCampaignDocument>> {
        const skip = (page - 1) * limit;
        const queryFilter = { ...filter, store: storeId };

        const [total, data] = await Promise.all([
            this.model.countDocuments(queryFilter),
            this.model
                .find(queryFilter)
                .sort('-createdAt')
                .skip(skip)
                .limit(limit),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limit));
        return {
            data: data as IAdCampaignDocument[],
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }

    async paginatePublic(
        filter: Record<string, unknown>,
        page: number,
        limit: number,
        sort: string,
    ): Promise<OffsetPaginationResult<IAdCampaignDocument>> {
        const skip = (page - 1) * limit;

        const [total, data] = await Promise.all([
            this.model.countDocuments(filter),
            this.model
                .find(filter)
                .populate('store', 'name slug logo')
                .sort(sort)
                .skip(skip)
                .limit(limit),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limit));
        return {
            data: data as IAdCampaignDocument[],
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
}

export const adCampaignRepository = new AdCampaignRepository();

import { NotFoundError, BadRequestError, ForbiddenError } from '@/core/errors';
import { AdPackageModel } from './ads.model';
import { adCampaignRepository } from './ads.repository';
import { storeRepository } from '../stores/store.repository';
import type {
    CreateAdCampaignBody,
    UpdateAdCampaignBody,
    PublicAdsQuery,
    ListAdsQuery,
} from './ads.validation';
import type { IAdCampaignDocument } from './ads.interface';

export class AdService {
    async listPackages() {
        return AdPackageModel.find({ isActive: true }).sort('durationDays');
    }

    async createAdCampaign(
        userId: string,
        payload: CreateAdCampaignBody,
    ): Promise<IAdCampaignDocument> {
        const store = await storeRepository.findByUser(userId);
        if (!store) throw new BadRequestError('No store found');

        const pkg = await AdPackageModel.findById(payload.packageId).lean();
        if (!pkg) throw new NotFoundError('Ad package not found', 'PACKAGE_NOT_FOUND');

        const now = new Date();
        const endDate = new Date(now.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);

        const ad = await adCampaignRepository.create({
            store: store._id as any,
            thumbnail: payload.thumbnail,
            destination: payload.destination,
            adTitle: payload.adTitle,
            description: payload.description,
            durationDays: pkg.durationDays,
            adType: pkg.adType,
            price: pkg.price,
            startDate: now,
            endDate,
            isActive: true,
        });

        return ad;
    }

    async listMyAds(userId: string, query: ListAdsQuery) {
        const store = await storeRepository.findByUser(userId);
        if (!store) throw new BadRequestError('No store found');

        const filter: Record<string, unknown> = {};
        if (query.adType) filter.adType = query.adType;

        return adCampaignRepository.paginateByStore(
            String(store._id),
            filter,
            query.page,
            query.limit,
        );
    }

    async updateAdCampaign(adId: string, userId: string, payload: UpdateAdCampaignBody) {
        const ad = await adCampaignRepository.findById(adId);
        if (!ad) throw new NotFoundError('Ad campaign not found', 'AD_NOT_FOUND');

        const store = await storeRepository.findByUser(userId);
        if (!store || String((ad as any).store) !== String(store._id)) {
            throw new ForbiddenError('Not authorized to update this ad');
        }

        const updated = await adCampaignRepository.updateById(adId, payload as any);
        if (!updated) throw new NotFoundError('Ad campaign not found', 'AD_NOT_FOUND');
        return updated;
    }

    async deleteAdCampaign(adId: string, userId: string) {
        const ad = await adCampaignRepository.findById(adId);
        if (!ad) throw new NotFoundError('Ad campaign not found', 'AD_NOT_FOUND');

        const store = await storeRepository.findByUser(userId);
        if (!store || String((ad as any).store) !== String(store._id)) {
            throw new ForbiddenError('Not authorized to delete this ad');
        }

        await adCampaignRepository.deleteById(adId);
    }

    async listPublicAds(query: PublicAdsQuery) {
        const filter: Record<string, unknown> = {
            isActive: true,
            endDate: { $gte: new Date() },
        };
        if (query.adType) filter.adType = query.adType;

        const sortField = query.sort?.startsWith('-') ? query.sort : `-${query.sort}`;

        return adCampaignRepository.paginatePublic(filter, query.page, query.limit, sortField);
    }
}

export const adService = new AdService();

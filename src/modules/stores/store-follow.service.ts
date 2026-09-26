import { NotFoundError } from '@core/errors';
import { StoreFollowModel } from './store-follow.model';
import { storeRepository } from './store.repository';

export class StoreFollowService {
    async toggleFollow(userId: string, storeId: string): Promise<boolean> {
        const store = await storeRepository.findById(storeId);
        if (!store) throw new NotFoundError('Store not found', 'STORE_NOT_FOUND');

        const existing = await StoreFollowModel.findOne({
            user: userId as any,
            store: storeId as any,
        });
        if (existing) {
            await StoreFollowModel.deleteOne({ _id: existing._id as any });
            await storeRepository.decrementFollowerCount(storeId);
            return false;
        }

        await StoreFollowModel.create([{ user: userId as any, store: storeId as any }]);
        await storeRepository.incrementFollowerCount(storeId);
        return true;
    }

    async isFollowing(userId: string, storeId: string): Promise<boolean> {
        const exists = await StoreFollowModel.exists({
            user: userId as any,
            store: storeId as any,
        });
        return !!exists;
    }

    async getFollowerCount(storeId: string): Promise<number> {
        return StoreFollowModel.countDocuments({ store: storeId as any });
    }
}

export const storeFollowService = new StoreFollowService();
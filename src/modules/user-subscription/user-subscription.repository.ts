import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';

import type { IUserSubscriptionDocument } from './user-subscription.interface';
import { UserSubscriptionModel } from './user-subscription.model';

export class UserSubscriptionRepository extends BaseMongooseRepository<IUserSubscriptionDocument> {
    constructor() {
        super(UserSubscriptionModel);
    }

    async findActiveByUserAndStore(
        userId: string,
        storeId: string,
    ): Promise<IUserSubscriptionDocument | null> {
        return UserSubscriptionModel.findOne({
            user: userId,
            store: storeId,
            status: 'active',
            endDate: { $gt: new Date() },
        }).lean<IUserSubscriptionDocument>();
    }

    async findActiveByUser(userId: string): Promise<IUserSubscriptionDocument[]> {
        return UserSubscriptionModel.find({
            user: userId,
            status: 'active',
            endDate: { $gt: new Date() },
        })
            .sort({ createdAt: -1 })
            .lean() as Promise<IUserSubscriptionDocument[]>;
    }

    /**
     * Atomically consume a listing slot from a subscription.
     * Handles unlimited listings (maxListings === -1) via $or guard.
     */
    async consumeListingSlot(
        subscriptionId: string,
        userId: string,
        count: number,
    ): Promise<IUserSubscriptionDocument | null> {
        return UserSubscriptionModel.findOneAndUpdate(
            {
                _id: subscriptionId,
                user: userId,
                status: 'active',
                endDate: { $gt: new Date() },
                $or: [
                    { 'planSnapshot.maxListings': -1 },
                    {
                        $expr: {
                            $lte: [
                                { $add: ['$listingsUsed', count] },
                                '$planSnapshot.maxListings',
                            ],
                        },
                    },
                ],
            },
            { $inc: { listingsUsed: count } },
            { new: true },
        ).lean<IUserSubscriptionDocument>();
    }

    async expireOverdue(): Promise<number> {
        const result = await UserSubscriptionModel.updateMany(
            { status: 'active', endDate: { $lte: new Date() }, autoRenew: false },
            { status: 'expired' },
        );
        return result.modifiedCount;
    }

    async findExpiredForRenewal(): Promise<IUserSubscriptionDocument[]> {
        return UserSubscriptionModel.find({
            status: 'active',
            endDate: { $lte: new Date() },
            autoRenew: true,
        }).lean() as Promise<IUserSubscriptionDocument[]>;
    }
}

export const userSubscriptionRepository = new UserSubscriptionRepository();

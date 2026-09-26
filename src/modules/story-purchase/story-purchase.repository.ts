import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';
import type { IStoryPurchaseDocument } from './story-purchase.interface';
import { StoryPurchaseModel } from './story-purchase.model';

export class StoryPurchaseRepository extends BaseMongooseRepository<IStoryPurchaseDocument> {
    constructor() {
        super(StoryPurchaseModel);
    }

    async findActiveByUser(userId: string): Promise<IStoryPurchaseDocument[]> {
        return StoryPurchaseModel.find({
            user: userId,
            status: 'active',
            expiresAt: { $gt: new Date() },
        })
            .sort({ createdAt: -1 })
            .lean() as Promise<IStoryPurchaseDocument[]>;
    }

    /**
     * Atomically consume story slots from a purchase.
     * Uses a conditional update to prevent over-consumption.
     * Returns the updated document, or null if the guard fails
     * (wrong user, insufficient slots, not active, or expired).
     */
    async consumeStorySlots(
        purchaseId: string,
        userId: string,
        count: number,
    ): Promise<IStoryPurchaseDocument | null> {
        return StoryPurchaseModel.findOneAndUpdate(
            {
                _id: purchaseId,
                user: userId,
                status: 'active',
                expiresAt: { $gt: new Date() },
                $expr: {
                    $lte: [
                        { $add: ['$storiesUsed', count] },
                        '$packageSnapshot.maxStories',
                    ],
                },
            },
            { $inc: { storiesUsed: count } },
            { new: true },
        ).lean<IStoryPurchaseDocument>();
    }

    async markExhausted(purchaseId: string): Promise<void> {
        await StoryPurchaseModel.updateOne(
            { _id: purchaseId },
            { status: 'exhausted' },
        );
    }

    async expireOverdue(): Promise<number> {
        const result = await StoryPurchaseModel.updateMany(
            { status: 'active', expiresAt: { $lte: new Date() } },
            { status: 'expired' },
        );
        return result.modifiedCount;
    }
}

export const storyPurchaseRepository = new StoryPurchaseRepository();

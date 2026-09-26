import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';
import type { IListingPurchaseDocument } from './listing-purchase.interface';
import { ListingPurchaseModel } from './listing-purchase.model';

export class ListingPurchaseRepository extends BaseMongooseRepository<IListingPurchaseDocument> {
    constructor() {
        super(ListingPurchaseModel);
    }

    async findActiveByUser(userId: string): Promise<IListingPurchaseDocument[]> {
        return ListingPurchaseModel.find({
            user: userId,
            status: 'active',
            expiresAt: { $gt: new Date() },
        })
            .sort({ createdAt: -1 })
            .lean() as Promise<IListingPurchaseDocument[]>;
    }

    async findActiveByUserAndCategory(
        userId: string,
        categoryId: string,
    ): Promise<IListingPurchaseDocument[]> {
        return ListingPurchaseModel.find({
            user: userId,
            category: categoryId,
            status: 'active',
            expiresAt: { $gt: new Date() },
        })
            .sort({ createdAt: -1 })
            .lean() as Promise<IListingPurchaseDocument[]>;
    }

    /**
     * Atomically consume a listing slot from a purchase.
     * Returns the updated document, or null if the guard fails.
     */
    async consumeListingSlot(
        purchaseId: string,
        userId: string,
        count: number,
    ): Promise<IListingPurchaseDocument | null> {
        return ListingPurchaseModel.findOneAndUpdate(
            {
                _id: purchaseId,
                user: userId,
                status: 'active',
                expiresAt: { $gt: new Date() },
                $expr: {
                    $lte: [
                        { $add: ['$listingsUsed', count] },
                        '$packageSnapshot.maxListings',
                    ],
                },
            },
            { $inc: { listingsUsed: count } },
            { new: true },
        ).lean<IListingPurchaseDocument>();
    }

    async markExhausted(purchaseId: string): Promise<void> {
        await ListingPurchaseModel.updateOne(
            { _id: purchaseId },
            { status: 'exhausted' },
        );
    }

    async expireOverdue(): Promise<number> {
        const result = await ListingPurchaseModel.updateMany(
            { status: 'active', expiresAt: { $lte: new Date() } },
            { status: 'expired' },
        );
        return result.modifiedCount;
    }
}

export const listingPurchaseRepository = new ListingPurchaseRepository();

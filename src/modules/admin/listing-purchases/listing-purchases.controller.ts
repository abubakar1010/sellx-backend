import type { Request, Response } from 'express';
import { z } from 'zod';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { ListingPurchaseModel } from '@/modules/listing-purchase/listing-purchase.model';

const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(['active', 'exhausted', 'expired']).optional(),
    userId: z.string().optional(),
    category: z.string().optional(),
});

export const adminListingPurchasesController = {
    list: catchAsync(async (req: Request, res: Response) => {
        const query = querySchema.parse(req.query);
        const filter: Record<string, unknown> = {};

        if (query.status) filter.status = query.status;
        if (query.userId) filter.user = query.userId;
        if (query.category) filter.category = query.category;

        const page = Math.max(1, query.page);
        const limit = Math.min(50, Math.max(1, query.limit));
        const skip = (page - 1) * limit;

        const [total, docs] = await Promise.all([
            ListingPurchaseModel.countDocuments(filter),
            ListingPurchaseModel.find(filter)
                .populate('user', 'firstName lastName email avatarUrl')
                .populate('store', 'name logo')
                .populate('category', 'title slug')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const items = docs.map((d: any) => ({
            id: d._id?.toString() ?? d.id,
            user: d.user
                ? {
                      id: d.user._id?.toString() ?? d.user.id,
                      firstName: d.user.firstName ?? '',
                      lastName: d.user.lastName ?? '',
                      email: d.user.email ?? '',
                      avatarUrl: d.user.avatarUrl,
                  }
                : null,
            store: d.store
                ? {
                      id: d.store._id?.toString() ?? d.store.id,
                      name: d.store.name ?? '',
                      logo: d.store.logo,
                  }
                : null,
            category: d.category
                ? {
                      id: d.category._id?.toString() ?? d.category.id,
                      title: d.category.title ?? '',
                      slug: d.category.slug ?? '',
                  }
                : null,
            packageSnapshot: d.packageSnapshot,
            listingsUsed: d.listingsUsed ?? 0,
            listingsRemaining: Math.max(
                0,
                (d.packageSnapshot?.maxListings ?? 0) - (d.listingsUsed ?? 0),
            ),
            status: d.status,
            purchasedAt: d.purchasedAt,
            expiresAt: d.expiresAt,
            createdAt: d.createdAt,
        }));

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listing purchases fetched successfully.',
            data: {
                items,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit) || 1,
                },
            },
        });
    }),

    stats: catchAsync(async (_req: Request, res: Response) => {
        const now = new Date();

        const [totalPurchases, activePurchases, exhaustedPurchases, expiredPurchases, revenueAgg] =
            await Promise.all([
                ListingPurchaseModel.countDocuments(),
                ListingPurchaseModel.countDocuments({
                    status: 'active',
                    expiresAt: { $gt: now },
                }),
                ListingPurchaseModel.countDocuments({ status: 'exhausted' }),
                ListingPurchaseModel.countDocuments({ status: 'expired' }),
                ListingPurchaseModel.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: '$packageSnapshot.price' },
                            totalListingsUsed: { $sum: '$listingsUsed' },
                        },
                    },
                ]),
            ]);

        const stats = revenueAgg[0] ?? { totalRevenue: 0, totalListingsUsed: 0 };

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listing purchase stats fetched successfully.',
            data: {
                totalPurchases,
                activePurchases,
                exhaustedPurchases,
                expiredPurchases,
                totalRevenue: stats.totalRevenue ?? 0,
                totalListingsUsed: stats.totalListingsUsed ?? 0,
            },
        });
    }),
};

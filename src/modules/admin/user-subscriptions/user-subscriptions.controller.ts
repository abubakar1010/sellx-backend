import type { Request, Response } from 'express';
import { z } from 'zod';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { UserSubscriptionModel } from '@/modules/user-subscription/user-subscription.model';
import { StoreModel } from '@/modules/stores/store.model';
import { objectIdParamSchema } from '@/modules/user/user.validation';

const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(['active', 'expired', 'cancelled']).optional(),
    userId: z.string().optional(),
    subscriptionId: z.string().optional(),
});

export const adminUserSubscriptionsController = {
    list: catchAsync(async (req: Request, res: Response) => {
        const query = querySchema.parse(req.query);
        const filter: Record<string, unknown> = {};

        if (query.status) filter.status = query.status;
        if (query.userId) filter.user = query.userId;
        if (query.subscriptionId) filter.subscription = query.subscriptionId;

        const page = Math.max(1, query.page);
        const limit = Math.min(50, Math.max(1, query.limit));
        const skip = (page - 1) * limit;

        const [total, docs] = await Promise.all([
            UserSubscriptionModel.countDocuments(filter),
            UserSubscriptionModel.find(filter)
                .populate('user', 'firstName lastName email avatarUrl')
                .populate('store', 'name logo slug storeType')
                .populate('subscription', 'name billingType price')
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
                      storeType: d.store.storeType ?? 'regular',
                  }
                : null,
            plan: d.subscription
                ? {
                      id: d.subscription._id?.toString() ?? d.subscription.id,
                      name: d.subscription.name ?? '',
                      billingType: d.subscription.billingType,
                      price: d.subscription.price,
                  }
                : null,
            planSnapshot: d.planSnapshot,
            listingsUsed: d.listingsUsed ?? 0,
            listingsRemaining:
                d.planSnapshot?.maxListings === -1
                    ? -1
                    : Math.max(0, (d.planSnapshot?.maxListings ?? 0) - (d.listingsUsed ?? 0)),
            status: d.status,
            startDate: d.startDate,
            endDate: d.endDate,
            autoRenew: d.autoRenew,
            cancelledAt: d.cancelledAt,
            createdAt: d.createdAt,
        }));

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'User subscriptions fetched successfully.',
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

        const [totalSubscriptions, activeSubscriptions, expiredSubscriptions, cancelledSubscriptions, revenueAgg] =
            await Promise.all([
                UserSubscriptionModel.countDocuments(),
                UserSubscriptionModel.countDocuments({
                    status: 'active',
                    endDate: { $gt: now },
                }),
                UserSubscriptionModel.countDocuments({ status: 'expired' }),
                UserSubscriptionModel.countDocuments({ status: 'cancelled' }),
                UserSubscriptionModel.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: '$planSnapshot.price' },
                            totalListingsUsed: { $sum: '$listingsUsed' },
                        },
                    },
                ]),
            ]);

        const stats = revenueAgg[0] ?? { totalRevenue: 0, totalListingsUsed: 0 };

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Subscription stats fetched successfully.',
            data: {
                totalSubscriptions,
                activeSubscriptions,
                expiredSubscriptions,
                cancelledSubscriptions,
                totalRevenue: stats.totalRevenue ?? 0,
                totalListingsUsed: stats.totalListingsUsed ?? 0,
            },
        });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);

        const sub = await UserSubscriptionModel.findById(id)
            .populate('user', 'firstName lastName email avatarUrl')
            .populate('store', 'name logo slug storeType')
            .populate('subscription', 'name billingType price')
            .populate('paymentTransaction')
            .lean();

        if (!sub) throw new NotFoundError('Subscription not found');

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Subscription fetched successfully.',
            data: sub,
        });
    }),

    cancel: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);

        const sub = await UserSubscriptionModel.findById(id).lean();
        if (!sub) throw new NotFoundError('Subscription not found');
        if (sub.status !== 'active') throw new BadRequestError('Subscription is not active');

        await UserSubscriptionModel.updateOne(
            { _id: id },
            { status: 'cancelled', cancelledAt: new Date(), autoRenew: false },
        );

        const hasOtherActive = await UserSubscriptionModel.findOne({
            store: sub.store,
            status: 'active',
            endDate: { $gt: new Date() },
            _id: { $ne: id },
        });
        if (!hasOtherActive) {
            await StoreModel.updateOne({ _id: sub.store }, { storeType: 'regular' });
        }

        const updated = await UserSubscriptionModel.findById(id)
            .populate('user', 'firstName lastName email avatarUrl')
            .populate('store', 'name logo slug storeType')
            .lean();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Subscription cancelled successfully.',
            data: updated,
        });
    }),
};

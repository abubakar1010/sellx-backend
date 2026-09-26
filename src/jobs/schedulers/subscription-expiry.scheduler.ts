import mongoose from 'mongoose';

import { logger } from '@/infrastructure/logger/winston.logger';
import { userSubscriptionRepository } from '@/modules/user-subscription/user-subscription.repository';
import { UserSubscriptionModel } from '@/modules/user-subscription/user-subscription.model';
import { StoreModel } from '@/modules/stores/store.model';

let timer: NodeJS.Timeout | null = null;
const INTERVAL_MS = 60 * 60 * 1000; // every hour

export const processSubscriptionExpiry = async (): Promise<number> => {
    if (mongoose.connection.readyState !== 1) {
        logger.debug('Subscription expiry scheduler skipped: database is not connected');
        return 0;
    }

    const now = new Date();

    // 1. Expire non-auto-renew subscriptions (applies to both Stripe and non-Stripe)
    const expiredCount = await userSubscriptionRepository.expireOverdue();

    // Note: Auto-renewal for Stripe-managed subscriptions is handled by Stripe
    // via the invoice.paid webhook. This scheduler only handles expiry and store reversion.

    // 2. Revert stores with no remaining active subscriptions to 'regular'
    if (expiredCount > 0) {
        const recentlyExpired = await UserSubscriptionModel.find({
            status: 'expired',
            updatedAt: { $gte: new Date(now.getTime() - INTERVAL_MS) },
        })
            .select('store')
            .lean();

        const storeIds = [...new Set(recentlyExpired.map((s) => String(s.store)))];

        for (const storeId of storeIds) {
            const hasActive = await UserSubscriptionModel.findOne({
                store: storeId,
                status: 'active',
                endDate: { $gt: now },
            });
            if (!hasActive) {
                await StoreModel.updateOne({ _id: storeId }, { storeType: 'regular' });
            }
        }
    }

    if (expiredCount > 0) {
        logger.info('Subscription expiry sweep completed', { expiredCount });
    } else {
        logger.debug('Subscription expiry scheduler tick');
    }

    return expiredCount;
};

export const startSubscriptionExpiryScheduler = (): void => {
    if (timer) {
        return;
    }

    timer = setInterval(() => {
        void processSubscriptionExpiry().catch((error) => {
            logger.error('Subscription expiry sweep failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        });
    }, INTERVAL_MS);
};

export const stopSubscriptionExpiryScheduler = (): void => {
    if (!timer) {
        return;
    }
    clearInterval(timer);
    timer = null;
};

import mongoose from 'mongoose';

import { logger } from '@/infrastructure/logger/winston.logger';
import { storyPurchaseRepository } from '@/modules/story-purchase/story-purchase.repository';

let timer: NodeJS.Timeout | null = null;
const INTERVAL_MS = 60 * 60 * 1000; // every hour

export const expireOverduePurchases = async (): Promise<number> => {
    if (mongoose.connection.readyState !== 1) {
        logger.debug('Story purchase expiry scheduler skipped: database is not connected');
        return 0;
    }

    const count = await storyPurchaseRepository.expireOverdue();

    if (count > 0) {
        logger.info('Story purchase expiry sweep completed', { expiredCount: count });
    } else {
        logger.debug('Story purchase expiry scheduler tick');
    }

    return count;
};

export const startStoryPurchaseExpiryScheduler = (): void => {
    if (timer) {
        return;
    }

    timer = setInterval(() => {
        void expireOverduePurchases().catch((error) => {
            logger.error('Story purchase expiry sweep failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        });
    }, INTERVAL_MS);
};

export const stopStoryPurchaseExpiryScheduler = (): void => {
    if (!timer) {
        return;
    }
    clearInterval(timer);
    timer = null;
};

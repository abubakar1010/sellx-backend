import mongoose from 'mongoose';

import { logger } from '@/infrastructure/logger/winston.logger';
import { listingPurchaseRepository } from '@/modules/listing-purchase/listing-purchase.repository';

let timer: NodeJS.Timeout | null = null;
const INTERVAL_MS = 60 * 60 * 1000; // every hour

export const expireOverdueListingPurchases = async (): Promise<number> => {
    if (mongoose.connection.readyState !== 1) {
        logger.debug('Listing purchase expiry scheduler skipped: database is not connected');
        return 0;
    }

    const count = await listingPurchaseRepository.expireOverdue();

    if (count > 0) {
        logger.info('Listing purchase expiry sweep completed', { expiredCount: count });
    } else {
        logger.debug('Listing purchase expiry scheduler tick');
    }

    return count;
};

export const startListingPurchaseExpiryScheduler = (): void => {
    if (timer) {
        return;
    }

    timer = setInterval(() => {
        void expireOverdueListingPurchases().catch((error) => {
            logger.error('Listing purchase expiry sweep failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        });
    }, INTERVAL_MS);
};

export const stopListingPurchaseExpiryScheduler = (): void => {
    if (!timer) {
        return;
    }
    clearInterval(timer);
    timer = null;
};

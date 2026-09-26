import mongoose from 'mongoose';

import { logger } from '@/infrastructure/logger/winston.logger';
import { Product } from '@/modules/products/products.model';
import { ProductStatus } from '@/modules/products/product.enum';

let timer: NodeJS.Timeout | null = null;
const INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

export const expireOverdueListings = async (): Promise<number> => {
    if (mongoose.connection.readyState !== 1) {
        logger.debug('Listing expiry scheduler skipped: database is not connected');
        return 0;
    }

    const result = await Product.updateMany(
        {
            status: ProductStatus.ACTIVE,
            listingExpiresAt: { $ne: null, $lte: new Date() },
        },
        { status: ProductStatus.EXPIRED },
    );

    if (result.modifiedCount > 0) {
        logger.info('Listing expiry sweep completed', { expiredCount: result.modifiedCount });
    } else {
        logger.debug('Listing expiry scheduler tick');
    }

    return result.modifiedCount;
};

export const startListingExpiryScheduler = (): void => {
    if (timer) {
        return;
    }

    timer = setInterval(() => {
        void expireOverdueListings().catch((error) => {
            logger.error('Listing expiry sweep failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        });
    }, INTERVAL_MS);
};

export const stopListingExpiryScheduler = (): void => {
    if (!timer) {
        return;
    }
    clearInterval(timer);
    timer = null;
};

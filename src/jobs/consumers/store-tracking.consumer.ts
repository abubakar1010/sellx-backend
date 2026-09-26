import { Worker } from 'bullmq';
import type { Job } from 'bullmq';

import { QUEUE_NAMES } from '../queues';
import type { StoreTrackingJobData } from '../types/store-tracking.job';
import { bullRedisConnection } from '@/infrastructure/queue/bull.connection';
import { logger } from '@/infrastructure/logger/winston.logger';
import { storeRepository } from '@/modules/stores/store.repository';

const processStoreTrackingJob = async (job: Job<StoreTrackingJobData>): Promise<void> => {
    const { storeId, type } = job.data;

    if (type === 'view') {
        await storeRepository.incrementViews(storeId);
    } else if (type === 'click') {
        await storeRepository.incrementClicks(storeId);
    }

    await storeRepository.cleanupDailyStats(storeId);
};

export const storeTrackingWorker = new Worker<StoreTrackingJobData>(
    QUEUE_NAMES.STORE_TRACKING,
    processStoreTrackingJob,
    {
        connection: bullRedisConnection as any,
        concurrency: 10,
    },
);

storeTrackingWorker.on('failed', (job, error) => {
    logger.error('Store tracking job failed', {
        jobId: job?.id,
        storeId: job?.data.storeId,
        type: job?.data.type,
        error: error.message,
    });
});

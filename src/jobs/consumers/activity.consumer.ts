import { Worker } from 'bullmq';
import type { Job } from 'bullmq';

import { QUEUE_NAMES } from '../queues';
import { logger } from '@/infrastructure/logger/winston.logger';
import { bullRedisConnection } from '@/infrastructure/queue/bull.connection';
import type { ActivityJobData } from '../types/activity.job';
import { activityService } from '@/modules/admin/activity/activity.service';

const processActivityJob = async (job: Job<ActivityJobData>): Promise<void> => {
    logger.info('Processing activity job', {
        jobId: job.id,
        activityType: job.data.activityType,
    });

    await activityService.logActivity(job.data);
};

export const activityWorker = new Worker<ActivityJobData>(
    QUEUE_NAMES.ACTIVITY,
    processActivityJob,
    {
        connection: bullRedisConnection as any,
        concurrency: 10,
    },
);

activityWorker.on('failed', (job, error) => {
    logger.error('Activity job failed', {
        jobId: job?.id,
        activityType: job?.data?.activityType,
        error: error.message,
    });
});

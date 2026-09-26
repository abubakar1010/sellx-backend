import type { JobsOptions } from 'bullmq';

import { getStoreTrackingQueue } from '../queues';
import type { StoreTrackingJobData } from '../types/store-tracking.job';
import type { BulkJob, IQueueProducer, JobOptions } from '@/core/interfaces/queue.interface';

const toJobsOptions = (options?: JobOptions): JobsOptions | undefined => {
    if (!options) return undefined;
    return {
        delay: options.delay,
        attempts: options.attempts,
        backoff: options.backoff,
        removeOnComplete: options.removeOnComplete,
        removeOnFail: options.removeOnFail,
        priority: options.priority,
    };
};

export class StoreTrackingProducer implements IQueueProducer<StoreTrackingJobData> {
    async addJob(name: string, data: StoreTrackingJobData, options?: JobOptions): Promise<void> {
        await getStoreTrackingQueue().add(name as any, data, toJobsOptions(options));
    }

    async addBulk(jobs: BulkJob<StoreTrackingJobData>[]): Promise<void> {
        await getStoreTrackingQueue().addBulk(
            jobs.map((job) => ({
                name: job.name as any,
                data: job.data,
                opts: toJobsOptions(job.options),
            })),
        );
    }
}

export const storeTrackingProducer = new StoreTrackingProducer();

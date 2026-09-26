import type { JobsOptions } from 'bullmq';

import { enqueueInBackground } from './background';
import { getActivityQueue } from '../queues';
import type { ActivityJobData } from '../types/activity.job';
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

export class ActivityProducer implements IQueueProducer<ActivityJobData> {
    async addJob(name: string, data: ActivityJobData, options?: JobOptions): Promise<void> {
        await getActivityQueue().add(name as any, data, toJobsOptions(options));
    }

    async addBulk(jobs: BulkJob<ActivityJobData>[]): Promise<void> {
        await getActivityQueue().addBulk(
            jobs.map((job) => ({
                name: job.name as any,
                data: job.data,
                opts: toJobsOptions(job.options),
            })),
        );
    }
}

export const activityProducer = new ActivityProducer();

export const addActivityJob = (data: ActivityJobData): void => {
    enqueueInBackground(
        `activity:${data.activityType}`,
        activityProducer.addJob(data.activityType, data),
    );
};

import type { JobsOptions } from 'bullmq';

import { getNotificationQueue } from '../queues';
import type { NotificationJobData } from '../types/notification.job';
import type { BulkJob, IQueueProducer, JobOptions } from '@/core/interfaces/queue.interface';

const toJobsOptions = (options?: JobOptions): JobsOptions | undefined => {
    if (!options) {
        return undefined;
    }
    return {
        delay: options.delay,
        attempts: options.attempts,
        backoff: options.backoff,
        removeOnComplete: options.removeOnComplete,
        removeOnFail: options.removeOnFail,
        priority: options.priority,
    };
};

export class NotificationProducer implements IQueueProducer<NotificationJobData> {
    async addJob(name: string, data: NotificationJobData, options?: JobOptions): Promise<void> {
        await getNotificationQueue().add(name as any, data, toJobsOptions(options));
    }

    async addBulk(jobs: BulkJob<NotificationJobData>[]): Promise<void> {
        await getNotificationQueue().addBulk(
            jobs.map((job) => ({
                name: job.name as any,
                data: job.data,
                opts: toJobsOptions(job.options),
            })),
        );
    }
}

export const notificationProducer = new NotificationProducer();

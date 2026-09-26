import type { JobsOptions } from 'bullmq';

import { getEmailQueue } from '../queues';
import type { EmailJobData } from '../types/email.job';
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

export class EmailProducer implements IQueueProducer<EmailJobData> {
    async addJob(name: string, data: EmailJobData, options?: JobOptions): Promise<void> {
        await getEmailQueue().add(name as any, data, toJobsOptions(options));
    }

    async addBulk(jobs: BulkJob<EmailJobData>[]): Promise<void> {
        await getEmailQueue().addBulk(
            jobs.map((job) => ({
                name: job.name as any,
                data: job.data,
                opts: toJobsOptions(job.options),
            })),
        );
    }
}

export const emailProducer = new EmailProducer();

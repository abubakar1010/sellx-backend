import { Worker } from 'bullmq';
import type { Job } from 'bullmq';

import { logger } from '../../infrastructure/logger/winston.logger';
import { mailService } from '../../infrastructure/mail/mail.service';
import { bullRedisConnection } from '../../infrastructure/queue/bull.connection';
import { QUEUE_NAMES } from '../queues';
import type { EmailJobData } from '../types/email.job';

const processEmailJob = async (job: Job<EmailJobData>): Promise<void> => {
    await mailService.send({
        to: job.data.to,
        subject: job.data.subject,
        template: job.data.template,
        context: job.data.context,
    });
};

export const emailWorker = new Worker<EmailJobData>(QUEUE_NAMES.EMAIL, processEmailJob, {
    connection: bullRedisConnection as any,
    concurrency: 5,
});

emailWorker.on('failed', (job, error) => {
    logger.error('Email job failed', {
        jobId: job?.id,
        error: error.message,
    });
});

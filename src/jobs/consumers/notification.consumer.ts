import { Worker } from 'bullmq';
import type { Job } from 'bullmq';


import { QUEUE_NAMES } from '../queues';
import { logger } from '@/infrastructure/logger/winston.logger';
import { emitNotificationCreated } from '@/infrastructure/realtime';
import type { NotificationJobData } from '../types/notification.job';
import { bullRedisConnection } from '@/infrastructure/queue/bull.connection';
import { notificationService } from '@/modules/notification/notification.service';
import { serializeNotification } from '@/modules/notification/notification.serializer';

const processNotificationJob = async (job: Job<NotificationJobData>): Promise<void> => {
    logger.info('Processing notification job', {
        jobId: job.id,
        name: job.name,
        userId: job.data.userId,
    });

    const notification = await notificationService.createNotification({
        userId: job.data.userId,
        title: job.data.title,
        message: job.data.message,
        type: job.data.type as 'info' | 'success' | 'warning' | 'error' | undefined,
        metadata: job.data.metadata,
    });
    const serialized = serializeNotification(notification);
    const dispatched = emitNotificationCreated(job.data.userId, serialized);

    if (!dispatched) {
        logger.debug('Realtime notification dispatch skipped because socket server is not ready', {
            userId: job.data.userId,
            jobId: job.id,
            notificationId: serialized.id,
        });
    }
};

export const notificationWorker = new Worker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATION,
    processNotificationJob,
    {
        connection: bullRedisConnection as any,
        concurrency: 10,
    },
);

notificationWorker.on('failed', (job, error) => {
    logger.error('Notification job failed', {
        jobId: job?.id,
        error: error.message,
    });
});

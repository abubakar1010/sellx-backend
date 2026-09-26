import { Queue, Worker, Job } from 'bullmq';
import { logger } from '../logger/winston.logger';
import { UserModel } from '@/modules/user/user.model';
import { bullRedisConnection, closeQueueSafely, logQueueErrors } from './bull.connection';
import { sendPushNotification } from '../push-notification';

export interface PushNotificationJobData {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
}

const QUEUE_NAME = 'push-notifications';

export const pushNotificationQueue = new Queue(QUEUE_NAME, {
    connection: bullRedisConnection as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            age: 3600,
            count: 1000,
        },
        removeOnFail: {
            age: 24 * 3600,
        },
    },
});

export const pushNotificationWorker = new Worker(
    QUEUE_NAME,
    async (job: Job<PushNotificationJobData>) => {
        const { userId, title, body, data } = job.data;

        const user = await UserModel.findById(userId).lean();
        if (!user || !user.notificationToken) {
            logger.info('Skipping push notification — user not found or no token', {
                userId,
            });
            return { success: false, reason: 'no_token_or_user' };
        }

        const success = await sendPushNotification({
            token: user.notificationToken,
            title,
            body,
            data,
        });

        return { success, userId };
    },
    {
        connection: bullRedisConnection as any,
        concurrency: 5,
    },
);

logQueueErrors(pushNotificationQueue);
logQueueErrors(pushNotificationWorker);

pushNotificationWorker.on('completed', (job) => {
    logger.info('Push notification job completed', {
        jobId: job.id,
        result: job.returnvalue,
    });
});

pushNotificationWorker.on('failed', (job, error) => {
    logger.error('Push notification job failed', {
        jobId: job?.id,
        userId: job?.data?.userId,
        error: error.message,
    });
});

export const enqueuePushNotification = async (data: PushNotificationJobData): Promise<void> => {
    await pushNotificationQueue.add('send-push', data, {
        jobId: `${data.userId}-${Date.now()}`,
    });
};

export const closePushNotificationQueue = async (): Promise<void> => {
    await closeQueueSafely(pushNotificationWorker);
    await closeQueueSafely(pushNotificationQueue);
};

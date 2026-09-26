import { Queue } from 'bullmq';

import type { EmailJobData } from './types/email.job';
import type { NotificationJobData } from './types/notification.job';
import type { StoreTrackingJobData } from './types/store-tracking.job';
import type { ActivityJobData } from './types/activity.job';
import {
    bullRedisConnection,
    closeQueueSafely,
    logQueueErrors,
} from '@/infrastructure/queue/bull.connection';

export const QUEUE_NAMES = {
    EMAIL: 'EMAIL_QUEUE',
    NOTIFICATION: 'NOTIFICATION_QUEUE',
    STORE_TRACKING: 'STORE_TRACKING_QUEUE',
    ACTIVITY: 'ACTIVITY_QUEUE',
} as const;

const defaultQueueOptions = {
    connection: bullRedisConnection as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: 1000,
        removeOnFail: 500,
    },
};

/** One entry per queue actually built. The value type is erased because the four differ. */
const queues = new Map<string, Queue>();

/**
 * The queue for a name, built the first time a job is actually enqueued.
 *
 * These used to be four module-level `new Queue(...)` calls, which meant that importing any
 * service that emits an activity event — `user.service.ts`, for one — opened a Redis connection
 * as a side effect of the import. In production that is merely early; under jest, where Redis is
 * not running, BullMQ's inner `RedisConnection` emits an `error` that `QueueBase` does not
 * forward, Node turns the unhandled event into `ERR_UNHANDLED_ERROR`, and the whole test process
 * dies before reporting a single result.
 *
 * Building them on first use keeps production behaviour identical — the first `add()` pays the
 * connection cost that the import used to — while a test that never enqueues anything never
 * touches Redis at all.
 */
const getQueue = <T>(name: string): Queue<T, unknown, string> => {
    let queue = queues.get(name);

    if (!queue) {
        queue = new Queue(name, defaultQueueOptions);
        logQueueErrors(queue);
        queues.set(name, queue);
    }

    return queue as Queue<T, unknown, string>;
};

export const getEmailQueue = (): Queue<EmailJobData, unknown, string> =>
    getQueue<EmailJobData>(QUEUE_NAMES.EMAIL);

export const getNotificationQueue = (): Queue<NotificationJobData, unknown, string> =>
    getQueue<NotificationJobData>(QUEUE_NAMES.NOTIFICATION);

export const getStoreTrackingQueue = (): Queue<StoreTrackingJobData, unknown, string> =>
    getQueue<StoreTrackingJobData>(QUEUE_NAMES.STORE_TRACKING);

export const getActivityQueue = (): Queue<ActivityJobData, unknown, string> =>
    getQueue<ActivityJobData>(QUEUE_NAMES.ACTIVITY);

/**
 * Closes whichever queues were actually built.
 *
 * A queue puts commands on the shared ioredis connection, so it has to settle before
 * `closeBullConnection()` pulls that connection out from under it.
 */
export const closeQueues = async (): Promise<void> => {
    await Promise.all([...queues.values()].map((queue) => closeQueueSafely(queue)));
    queues.clear();
};

import { logger } from '@/infrastructure/logger/winston.logger';

/**
 * Enqueues a job without waiting for it, and without letting a queue failure escape.
 *
 * These jobs are all telemetry — an activity row, a store view counter — so a Redis outage must
 * degrade them to a log line, not take the request with it. An uncaught `void producer.addJob()`
 * is an unhandled promise rejection, which terminates the Node process by default.
 */
export const enqueueInBackground = (label: string, job: Promise<void>): void => {
    void job.catch((error: unknown) => {
        logger.error('Background job could not be queued', {
            job: label,
            error: error instanceof Error ? error.message : String(error),
        });
    });
};

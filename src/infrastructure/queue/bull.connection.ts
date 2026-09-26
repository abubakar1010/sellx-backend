import type { EventEmitter } from 'node:events';

import IORedis from 'ioredis';

import { config } from '@/config';
import { logger } from '../logger/winston.logger';

export const bullRedisConnection = new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy: (attempts) => {
        if (config.isTest || attempts > 3) {
            return null;
        }
        return Math.min(500 * attempts, 2000);
    },
});

bullRedisConnection.on('connect', () => {
    logger.info('BullMQ Redis connecting');
});

bullRedisConnection.on('ready', () => {
    logger.info('BullMQ Redis ready');
});

bullRedisConnection.on('error', (error) => {
    logger.error('BullMQ Redis error', { error: error.message });
});

/**
 * Logs the connection errors a queue or worker would otherwise crash on.
 *
 * BullMQ's `QueueBase` forwards its inner `RedisConnection`'s `close` event but not its `error`
 * event, so a Redis error — including the ordinary one raised while shutting the connection
 * down — reaches an EventEmitter with nothing listening, and Node turns that into
 * `ERR_UNHANDLED_ERROR` and exits. Listening on the queue itself is not enough; the inner
 * connection is the emitter, and it is `protected`, hence the cast.
 *
 * Call this on every `Queue` and `Worker` at construction.
 */
export const logQueueErrors = (queue: { name: string } & EventEmitter): void => {
    const onError = (error: Error): void => {
        logger.error('Queue connection error', { queue: queue.name, error: error.message });
    };

    queue.on('error', onError);
    (queue as unknown as { connection?: EventEmitter }).connection?.on('error', onError);
};

/**
 * Closes a queue or worker and keeps its connection from crashing the process afterwards.
 *
 * `close()` strips the listeners `logQueueErrors` attached, but the connection can still emit a
 * late `error` as the socket tears down — reliably so when Redis was never reachable, which is
 * every test run. An `error` event with nothing listening ends the Node process, so the guard is
 * re-attached on the way out.
 */
export const closeQueueSafely = async (queue: { name: string; close: () => Promise<void> } & EventEmitter): Promise<void> => {
    const connection = (queue as unknown as { connection?: EventEmitter }).connection;

    try {
        await queue.close();
    } catch (error) {
        logger.error('Queue did not close cleanly', {
            queue: queue.name,
            error: error instanceof Error ? error.message : String(error),
        });
    } finally {
        connection?.on('error', () => undefined);
    }
};

export const closeBullConnection = async (): Promise<void> => {
    if (bullRedisConnection.status === 'end' || bullRedisConnection.status === 'wait') {
        return;
    }

    try {
        if (bullRedisConnection.status === 'ready' || bullRedisConnection.status === 'connect') {
            await bullRedisConnection.quit();
            return;
        }
        
        await new Promise<void>((resolve) => {
            bullRedisConnection.once('end', resolve);
            bullRedisConnection.disconnect(false);
        });
    } catch {
        await new Promise<void>((resolve) => {
            bullRedisConnection.once('end', resolve);
            bullRedisConnection.disconnect(false);
        });
    }
};

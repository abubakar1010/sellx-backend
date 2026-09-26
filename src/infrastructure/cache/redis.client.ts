import { createClient } from 'redis';

import { config } from '@/config';
import { logger } from '../logger/winston.logger';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let isConnecting = false;

const createRedisClient = (): RedisClient => {
    const redisClient = createClient({
        socket: {
            host: config.redis.host,
            port: config.redis.port,
            reconnectStrategy: (retries) => {
                if (retries > 10) {
                    return new Error('Redis reconnect retries exhausted.');
                }
                return Math.min(1000 * 2 ** retries, 30_000);
            },
            connectTimeout: config.redis.connectTimeoutMs,
            keepAlive: true,
            keepAliveInitialDelay: config.redis.keepAliveMs,
        },
        password: config.redis.password,
        database: config.redis.db,
    });

    redisClient.on('connect', () => logger.info('Redis connecting'));
    redisClient.on('ready', () => logger.info('Redis ready'));
    redisClient.on('reconnecting', () => logger.warn('Redis reconnecting'));
    redisClient.on('error', (error) =>
        logger.error('Redis client error', {
            error: error.message,
        }),
    );
    redisClient.on('end', () => logger.warn('Redis connection closed'));

    return redisClient;
};

export const getRedisClient = (): RedisClient => {
    if (!client) {
        client = createRedisClient();
    }
    return client;
};

export const connectRedis = async (): Promise<void> => {
    const redisClient = getRedisClient();
    if (redisClient.isReady || isConnecting) {
        return;
    }

    isConnecting = true;
    try {
        await redisClient.connect();
    } finally {
        isConnecting = false;
    }
};

export const disconnectRedis = async (): Promise<void> => {
    if (!client) {
        return;
    }

    if (client.isOpen) {
        await client.quit();
    }

    client = null;
};

const createAbortError = (): Error => {
    const error = new Error('Redis command aborted.');
    error.name = 'AbortError';
    return error;
};

export const runRedisCommand = async <T>(
    operation: Promise<T>,
    options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<T> => {
    const timeoutMs = options?.timeoutMs ?? config.redis.commandTimeoutMs;
    let timeoutHandle: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<T>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(`Redis command timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
    });

    const signalPromise = new Promise<T>((_resolve, reject) => {
        const signal = options?.signal;
        if (!signal) {
            return;
        }
        if (signal.aborted) {
            reject(createAbortError());
            return;
        }
        const abortHandler = (): void => reject(createAbortError());
        signal.addEventListener('abort', abortHandler, { once: true });
        operation
            .finally(() => signal.removeEventListener('abort', abortHandler))
            .catch(() => undefined);
    });

    try {
        return await Promise.race([operation, timeoutPromise, signalPromise]);
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
};

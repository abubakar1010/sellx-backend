import mongoose from 'mongoose';

import { config } from '@/config';
import { logger } from '../logger/winston.logger';

const createAbortError = (): Error => {
    const error = new Error('Operation aborted.');
    error.name = 'AbortError';
    return error;
};

const withAbort = async <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) {
        return promise;
    }

    if (signal.aborted) {
        throw createAbortError();
    }

    return new Promise<T>((resolve, reject) => {
        const abortHandler = (): void => reject(createAbortError());
        signal.addEventListener('abort', abortHandler, { once: true });

        promise
            .then(resolve)
            .catch(reject)
            .finally(() => {
                signal.removeEventListener('abort', abortHandler);
            });
    });
};

let listenersRegistered = false;

const registerConnectionListeners = (): void => {
    if (listenersRegistered) {
        return;
    }

    listenersRegistered = true;
    mongoose.connection.on('error', (error) => {
        logger.error('MongoDB runtime error', { error: error.message });
    });

    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
    });
};

export const connectDatabase = async (signal?: AbortSignal): Promise<void> => {
    await withAbort(
        mongoose.connect(config.db.uri, {
            autoIndex: !config.isProduction,
            minPoolSize: config.db.minPoolSize,
            maxPoolSize: config.db.maxPoolSize,
            serverSelectionTimeoutMS: config.db.serverSelectionTimeoutMs,
            socketTimeoutMS: config.db.socketTimeoutMs,
            retryWrites: true,
            w: 'majority',
        }),
        signal,
    );

    registerConnectionListeners();
    logger.info('MongoDB connected successfully');
};

export const disconnectDatabase = async (): Promise<void> => {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
};

import mongoose from 'mongoose';

import { logger } from '../logger/winston.logger';

interface TransactionOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
}

const createAbortError = (): Error => {
    const error = new Error('Transaction aborted by signal.');
    error.name = 'AbortError';
    return error;
};

const withAbortAndTimeout = async <T>(
    task: Promise<T>,
    options?: TransactionOptions,
): Promise<T> => {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    let timeoutHandle: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<T>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(`Transaction timed out after ${timeoutMs}ms.`));
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
        task.finally(() => signal.removeEventListener('abort', abortHandler)).catch(
            () => undefined,
        );
    });

    try {
        return await Promise.race([task, timeoutPromise, signalPromise]);
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
};

export const withTransaction = async <T>(
    fn: (session: mongoose.ClientSession) => Promise<T>,
    options?: TransactionOptions,
): Promise<T> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const result = await withAbortAndTimeout(fn(session), options);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        logger.error('Transaction rolled back', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    } finally {
        await session.endSession();
    }
};

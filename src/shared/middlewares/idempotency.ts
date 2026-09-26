import type { RequestHandler } from 'express';

import { ConflictError } from '@/core/errors';
import { logger } from '@/infrastructure/logger/winston.logger';
import { getRedisClient, runRedisCommand } from '@/infrastructure/cache/redis.client';

const WRITABLE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const IDEMPOTENCY_HEADER = 'x-idempotency-key';

export const idempotency = (ttlSeconds = 60): RequestHandler => {
    return async (req, res, next): Promise<void> => {
        if (!WRITABLE_METHODS.has(req.method)) {
            next();
            return;
        }

        const key = req.header(IDEMPOTENCY_HEADER);
        if (!key) {
            next();
            return;
        }

        const lockKey = `idempotency:${req.method}:${req.originalUrl}:${key}`;

        try {
            const result = await runRedisCommand(
                getRedisClient().set(lockKey, '1', {
                    EX: ttlSeconds,
                    NX: true,
                }),
            );

            if (result !== 'OK') {
                throw new ConflictError(
                    'Duplicate request detected for this idempotency key.',
                    'DUPLICATE_REQUEST',
                );
            }

            res.on('finish', () => {
                if (res.statusCode >= 500) {
                    void runRedisCommand(getRedisClient().del(lockKey)).catch(() => undefined);
                }
            });

            next();
        } catch (error) {
            if (error instanceof ConflictError) {
                next(error);
                return;
            }

            logger.warn('Idempotency middleware bypassed due to cache error', {
                error: error instanceof Error ? error.message : String(error),
            });
            next();
        }
    };
};

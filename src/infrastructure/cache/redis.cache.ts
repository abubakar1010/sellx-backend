import { getRedisClient, runRedisCommand } from './redis.client';
import type { CacheOperationOptions, ICacheService } from '@/core/interfaces/cache.interface';

export class RedisCacheService implements ICacheService {
    private get client() {
        return getRedisClient();
    }

    async get<T = unknown>(key: string, options?: CacheOperationOptions): Promise<T | null> {
        const raw = await runRedisCommand(this.client.get(key), options);
        if (raw === null) {
            return null;
        }

        try {
            return JSON.parse(raw) as T;
        } catch {
            return raw as T;
        }
    }

    async set(
        key: string,
        value: unknown,
        ttlSeconds?: number,
        options?: CacheOperationOptions,
    ): Promise<void> {
        const payload = JSON.stringify(value);

        if (ttlSeconds && ttlSeconds > 0) {
            await runRedisCommand(this.client.set(key, payload, { EX: ttlSeconds }), options);
            return;
        }

        await runRedisCommand(this.client.set(key, payload), options);
    }

    async del(key: string, options?: CacheOperationOptions): Promise<void> {
        await runRedisCommand(this.client.del(key), options);
    }

    async delByPattern(pattern: string, options?: CacheOperationOptions): Promise<void> {
        let cursor = '0';

        do {
            const result = await runRedisCommand(
                this.client.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100,
                }),
                options,
            );

            cursor = result.cursor;
            const keys = result.keys;
            if (keys.length > 0) {
                await runRedisCommand(this.client.del(keys), options);
            }
        } while (cursor !== '0');
    }

    async exists(key: string, options?: CacheOperationOptions): Promise<boolean> {
        const result = await runRedisCommand(this.client.exists(key), options);
        return result === 1;
    }

    async increment(key: string, options?: CacheOperationOptions): Promise<number> {
        return runRedisCommand(this.client.incr(key), options);
    }

    async expire(key: string, ttlSeconds: number, options?: CacheOperationOptions): Promise<void> {
        await runRedisCommand(this.client.expire(key, ttlSeconds), options);
    }
}

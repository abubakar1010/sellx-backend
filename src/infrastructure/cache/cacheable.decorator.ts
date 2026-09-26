import type { ICacheService } from '@/core/interfaces/cache.interface';

interface CacheableOptions<TArgs extends unknown[]> {
    key: (...args: TArgs) => string;
    ttlSeconds?: number;
    cacheService: ICacheService;
}

export const cacheable = <TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    options: CacheableOptions<TArgs>,
): ((...args: TArgs) => Promise<TResult>) => {
    return async (...args: TArgs): Promise<TResult> => {
        const cacheKey = options.key(...args);
        const cached = await options.cacheService.get<TResult>(cacheKey);

        if (cached !== null) {
            return cached;
        }

        const result = await fn(...args);
        await options.cacheService.set(cacheKey, result, options.ttlSeconds);
        return result;
    };
};

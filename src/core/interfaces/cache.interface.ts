export interface CacheOperationOptions {
    signal?: AbortSignal;
}

export interface ICacheService {
    get<T = unknown>(key: string, options?: CacheOperationOptions): Promise<T | null>;
    set(
        key: string,
        value: unknown,
        ttlSeconds?: number,
        options?: CacheOperationOptions,
    ): Promise<void>;
    del(key: string, options?: CacheOperationOptions): Promise<void>;
    delByPattern(pattern: string, options?: CacheOperationOptions): Promise<void>;
    exists(key: string, options?: CacheOperationOptions): Promise<boolean>;
    increment(key: string, options?: CacheOperationOptions): Promise<number>;
    expire(key: string, ttlSeconds: number, options?: CacheOperationOptions): Promise<void>;
}

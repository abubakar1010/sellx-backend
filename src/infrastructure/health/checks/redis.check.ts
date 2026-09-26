import { performance } from 'node:perf_hooks';

import type { HealthCheckResult, IHealthCheck } from '@/core/interfaces/health.interface';
import { getRedisClient, runRedisCommand } from '../../cache/redis.client';

export class RedisHealthCheck implements IHealthCheck {
    readonly name = 'redis';

    async run(signal?: AbortSignal): Promise<HealthCheckResult> {
        const startedAt = performance.now();
        try {
            const pong = await runRedisCommand(getRedisClient().ping(), {
                signal,
                timeoutMs: 1000,
            });

            return {
                status: pong === 'PONG' ? 'ok' : 'degraded',
                latencyMs: Number((performance.now() - startedAt).toFixed(2)),
                details: { pong },
            };
        } catch (error) {
            return {
                status: 'down',
                latencyMs: Number((performance.now() - startedAt).toFixed(2)),
                details: {
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
}

import { performance } from 'node:perf_hooks';

import { bullRedisConnection } from '../../queue/bull.connection';
import type { HealthCheckResult, IHealthCheck } from '@/core/interfaces/health.interface';

export class QueueHealthCheck implements IHealthCheck {
    readonly name = 'queue';

    async run(signal?: AbortSignal): Promise<HealthCheckResult> {
        const startedAt = performance.now();

        if (signal?.aborted) {
            return {
                status: 'down',
                latencyMs: 0,
                details: { reason: 'aborted' },
            };
        }

        try {
            const pong = await bullRedisConnection.ping();
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

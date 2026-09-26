import mongoose from 'mongoose';
import { performance } from 'node:perf_hooks';

import type { HealthCheckResult, IHealthCheck } from '@/core/interfaces/health.interface';

export class MongoHealthCheck implements IHealthCheck {
    readonly name = 'mongo';

    async run(signal?: AbortSignal): Promise<HealthCheckResult> {
        const startedAt = performance.now();

        if (signal?.aborted) {
            return {
                status: 'down',
                latencyMs: 0,
                details: { reason: 'aborted' },
            };
        }

        const statusMap: Record<number, 'down' | 'ok'> = {
            0: 'down',
            1: 'ok',
            2: 'down',
            3: 'down',
            99: 'down',
        };

        const readyState = mongoose.connection.readyState;
        const status = statusMap[readyState] ?? 'down';

        return {
            status,
            latencyMs: Number((performance.now() - startedAt).toFixed(2)),
            details: { readyState },
        };
    }
}

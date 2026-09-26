import type {
    HealthCheckResult,
    HealthReport,
    IHealthCheck,
    IHealthService,
} from '@/core/interfaces/health.interface';

import { MongoHealthCheck } from './checks/mongo.check';
import { QueueHealthCheck } from './checks/queue.check';
import { RedisHealthCheck } from './checks/redis.check';

const resolveOverallStatus = (
    checks: Record<string, HealthCheckResult>,
): HealthReport['status'] => {
    const statuses = Object.values(checks).map((check) => check.status);
    if (statuses.includes('down')) {
        return 'down';
    }
    if (statuses.includes('degraded')) {
        return 'degraded';
    }
    return 'ok';
};

export class HealthService implements IHealthService {
    private readonly checks: IHealthCheck[];

    constructor(checks?: IHealthCheck[]) {
        this.checks = checks ?? [
            new MongoHealthCheck(),
            new RedisHealthCheck(),
            new QueueHealthCheck(),
        ];
    }

    async check(signal?: AbortSignal): Promise<HealthReport> {
        const checkResults = await Promise.all(
            this.checks.map(async (check) => [check.name, await check.run(signal)] as const),
        );

        const checks = Object.fromEntries(checkResults);
        return {
            status: resolveOverallStatus(checks),
            timestamp: new Date().toISOString(),
            checks,
        };
    }
}

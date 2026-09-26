export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthCheckResult {
    status: HealthStatus;
    latencyMs: number;
    details?: Record<string, unknown>;
}

export interface IHealthCheck {
    readonly name: string;
    run(signal?: AbortSignal): Promise<HealthCheckResult>;
}

export interface HealthReport {
    status: HealthStatus;
    timestamp: string;
    checks: Record<string, HealthCheckResult>;
}

export interface IHealthService {
    check(signal?: AbortSignal): Promise<HealthReport>;
}

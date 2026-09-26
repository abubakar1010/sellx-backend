import { TOKENS } from './tokens';
import { container } from './container';
import { logger } from '../logger/winston.logger';
import { RedisCacheService } from '../cache/redis.cache';
import { HealthService } from '../health/health.service';

let isRegistered = false;

export const registerDependencies = (): void => {
    if (isRegistered) {
        return;
    }

    container.registerSingleton(TOKENS.LOGGER, logger);
    container.registerSingleton(TOKENS.CACHE_SERVICE, new RedisCacheService());
    container.registerSingleton(TOKENS.HEALTH_SERVICE, new HealthService());

    isRegistered = true;
};

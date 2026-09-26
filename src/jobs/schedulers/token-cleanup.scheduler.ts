import { logger } from '@/infrastructure/logger/winston.logger';

let timer: NodeJS.Timeout | null = null;

export const startTokenCleanupScheduler = (): void => {
    if (timer) {
        return;
    }

    timer = setInterval(
        () => {
            logger.debug('Token cleanup scheduler tick');
            // MongoDB TTL index handles token expiration automatically.
        },
        60 * 60 * 1000,
    );
};

export const stopTokenCleanupScheduler = (): void => {
    if (!timer) {
        return;
    }
    clearInterval(timer);
    timer = null;
};

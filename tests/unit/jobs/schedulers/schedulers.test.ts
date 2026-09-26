import { logger } from '../../../../src/infrastructure/logger/winston.logger';
import {
    startInactiveUsersScheduler,
    stopInactiveUsersScheduler,
} from '../../../../src/jobs/schedulers/inactive-users.scheduler';
import {
    startTokenCleanupScheduler,
    stopTokenCleanupScheduler,
} from '../../../../src/jobs/schedulers/token-cleanup.scheduler';

describe('Schedulers', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        stopTokenCleanupScheduler();
        stopInactiveUsersScheduler();
    });

    afterEach(() => {
        stopTokenCleanupScheduler();
        stopInactiveUsersScheduler();
        jest.useRealTimers();
    });

    it('token cleanup scheduler starts once and stops', () => {
        const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => undefined);

        startTokenCleanupScheduler();
        startTokenCleanupScheduler();
        jest.advanceTimersByTime(60 * 60 * 1000);
        expect(debugSpy).toHaveBeenCalledTimes(1);

        stopTokenCleanupScheduler();
        jest.advanceTimersByTime(60 * 60 * 1000);
        expect(debugSpy).toHaveBeenCalledTimes(1);
    });

    it('inactive users scheduler starts once and stops', () => {
        const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => undefined);

        startInactiveUsersScheduler();
        startInactiveUsersScheduler();
        jest.advanceTimersByTime(24 * 60 * 60 * 1000);
        expect(debugSpy).toHaveBeenCalledTimes(1);

        stopInactiveUsersScheduler();
        jest.advanceTimersByTime(24 * 60 * 60 * 1000);
        expect(debugSpy).toHaveBeenCalledTimes(1);
    });
});

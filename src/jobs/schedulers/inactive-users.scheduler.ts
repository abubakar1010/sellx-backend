import mongoose from 'mongoose';

import { ROLES } from '@/core/constants/roles';
import { UserModel } from '@/modules/user/user.model';
import { USER_STATUS } from '@/modules/user/user.constants';
import { logger } from '@/infrastructure/logger/winston.logger';

let timer: NodeJS.Timeout | null = null;
const INACTIVE_USERS_INTERVAL_MS = 24 * 60 * 60 * 1000;
const INACTIVE_THRESHOLD_DAYS = 90;

export const sweepInactiveUsers = async (): Promise<number> => {
    if (mongoose.connection.readyState !== 1) {
        logger.debug('Inactive users scheduler skipped: database is not connected');
        return 0;
    }

    const threshold = new Date(Date.now() - INACTIVE_THRESHOLD_DAYS * INACTIVE_USERS_INTERVAL_MS);
    const result = await UserModel.updateMany(
        {
            status: USER_STATUS.ACTIVE,
            role: { $nin: [ROLES.SUPER_ADMIN] },
            $or: [
                { lastLoginAt: { $lt: threshold } },
                { lastLoginAt: { $exists: false }, createdAt: { $lt: threshold } },
            ],
        },
        { $set: { status: USER_STATUS.INACTIVE } },
    );

    if (result.modifiedCount > 0) {
        logger.info('Inactive users sweep completed', {
            threshold: threshold.toISOString(),
            modifiedCount: result.modifiedCount,
        });
    } else {
        logger.debug('Inactive users scheduler tick');
    }

    return result.modifiedCount;
};

export const startInactiveUsersScheduler = (): void => {
    if (timer) {
        return;
    }

    timer = setInterval(() => {
        void sweepInactiveUsers().catch((error) => {
            logger.error('Inactive users sweep failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        });
    }, INACTIVE_USERS_INTERVAL_MS);
};

export const stopInactiveUsersScheduler = (): void => {
    if (!timer) {
        return;
    }
    clearInterval(timer);
    timer = null;
};

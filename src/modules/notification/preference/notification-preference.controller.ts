import { UnauthorizedError } from '@/core/errors';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { notificationPreferenceService } from './notification-preference.service';

const getUserId = (userId?: string): string => {
    if (!userId) throw new UnauthorizedError('Authentication required');
    return userId;
};

export const notificationPreferenceController = {
    get: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const preference = await notificationPreferenceService.getPreferences(userId, {
            signal: req.signal,
        });
        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Notification preferences fetched successfully',
            data: preference,
        });
    }),

    update: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const preference = await notificationPreferenceService.updatePreferences(userId, req.body, {
            signal: req.signal,
        });
        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Notification preferences updated successfully',
            data: preference,
        });
    }),
};

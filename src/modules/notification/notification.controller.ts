import type { RequestHandler } from 'express';

import { UnauthorizedError } from '@/core/errors';
import { MESSAGES } from '@/core/constants/messages';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { logger } from '@/infrastructure/logger/winston.logger';
import { emitNotificationCreated } from '@/infrastructure/realtime';
import { sendResponse } from '@/shared/utils/sendResponse';
import { notificationService } from './notification.service';
import { parseOffsetPagination } from '@/shared/utils/pagination';
import { serializeNotification, serializeNotifications } from './notification.serializer';

const getCurrentUserId = (userId?: string): string => {
    if (!userId) {
        throw new UnauthorizedError('Authentication required.', 'AUTH_REQUIRED');
    }
    return userId;
};

const createNotification: RequestHandler = catchAsync(async (req, res) => {
    const notification = await notificationService.createNotification(req.body, {
        signal: req.signal,
    });
    const serialized = serializeNotification(notification);
    const dispatched = emitNotificationCreated(notification.userId, serialized);

    if (!dispatched) {
        logger.debug('Realtime notification dispatch skipped because socket server is not ready', {
            userId: notification.userId,
            notificationId: serialized.id,
        });
    }

    return sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGES.GENERAL.CREATED,
        data: serialized,
    });
});

const listMine: RequestHandler = catchAsync(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    const pagination = parseOffsetPagination(req.query as Record<string, unknown>);

    let isRead: boolean | undefined;
    if (typeof req.query.isRead === 'boolean') {
        isRead = req.query.isRead;
    } else if (req.query.isRead === 'true') {
        isRead = true;
    } else if (req.query.isRead === 'false') {
        isRead = false;
    }

    const result = await notificationService.listUserNotifications(userId, { isRead }, pagination, {
        signal: req.signal,
    });

    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.NOTIFICATION.FETCHED,
        data: serializeNotifications(result.data),
        meta: result.meta as unknown as Record<string, unknown>,
    });
});

const markRead: RequestHandler = catchAsync(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    const notificationId = typeof req.params.id === 'string' ? req.params.id : '';
    const updated = await notificationService.markAsRead(notificationId, userId, {
        signal: req.signal,
    });

    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.NOTIFICATION.MARKED_READ,
        data: serializeNotification(updated),
    });
});

const markAllRead: RequestHandler = catchAsync(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    const updatedCount = await notificationService.markAllAsRead(userId, {
        signal: req.signal,
    });

    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.NOTIFICATION.ALL_MARKED_READ,
        data: { updatedCount },
    });
});

const unreadCount: RequestHandler = catchAsync(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    const count = await notificationService.getUnreadCount(userId, {
        signal: req.signal,
    });

    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.NOTIFICATION.UNREAD_COUNT,
        data: { count },
    });
});

const testBroadcastPush: RequestHandler = catchAsync(async (req, res) => {
    const { title, body } = req.body;
    const result = await notificationService.broadcastPushNotification(title, body, undefined, {
        signal: req.signal,
    });

    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Push notification broadcast completed',
        data: result,
    });
});

const broadcastToAll: RequestHandler = catchAsync(async (req, res) => {
    const { title, message, type, metadata } = req.body;
    const result = await notificationService.broadcastToAllUsers(title, message, type, metadata, {
        signal: req.signal,
    });

    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Notification broadcast completed',
        data: result,
    });
});

export const notificationController = {
    createNotification,
    listMine,
    markRead,
    markAllRead,
    unreadCount,
    testBroadcastPush,
    broadcastToAll,
};

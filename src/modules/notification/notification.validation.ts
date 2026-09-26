import { z } from 'zod';

import { NOTIFICATION_TYPES } from './notification.constants';

const objectIdRegex = /^[a-f\d]{24}$/i;

const notificationTypeValues = [
    NOTIFICATION_TYPES.INFO,
    NOTIFICATION_TYPES.SUCCESS,
    NOTIFICATION_TYPES.WARNING,
    NOTIFICATION_TYPES.ERROR,
] as const;

export const createNotificationBodySchema = z.object({
    userId: z.string().regex(objectIdRegex, 'Invalid user id.'),
    title: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(1000),
    type: z.enum(notificationTypeValues).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export const notificationIdParamSchema = z.object({
    id: z.string().regex(objectIdRegex, 'Invalid notification id.'),
});

export const listNotificationsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort: z.string().optional(),
    isRead: z
        .string()
        .optional()
        .transform((value) => {
            if (value === 'true') {
                return true;
            }
            if (value === 'false') {
                return false;
            }
            return undefined;
        }),
});

export const testPushNotificationBodySchema = z.object({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(500),
});

export const broadcastNotificationBodySchema = z.object({
    title: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(1000),
    type: z.enum(['info', 'success', 'warning', 'error']).optional().default('info'),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

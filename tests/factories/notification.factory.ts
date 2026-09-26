import { NOTIFICATION_TYPES } from '../../src/modules/notification/notification.constants';
import type { INotificationDocument } from '../../src/modules/notification/notification.interface';

type NotificationOverrides = Partial<INotificationDocument> & { id?: string };

export const buildNotification = (overrides: NotificationOverrides = {}): INotificationDocument => {
    const now = new Date();
    return {
        id: overrides.id ?? '507f1f77bcf86cd799439099',
        userId: overrides.userId ?? '507f1f77bcf86cd799439011',
        title: overrides.title ?? 'Welcome',
        message: overrides.message ?? 'Welcome to the app',
        type: overrides.type ?? NOTIFICATION_TYPES.INFO,
        isRead: overrides.isRead ?? false,
        readAt: overrides.readAt,
        metadata: overrides.metadata,
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? now,
    } as INotificationDocument;
};

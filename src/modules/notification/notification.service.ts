import { NotFoundError } from '@/core/errors';
import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import { MESSAGES } from '@/core/constants/messages';
import { NOTIFICATION_TYPES } from './notification.constants';
import type { CreateNotificationInput, INotificationDocument } from './notification.interface';
import { notificationRepository, type NotificationRepository } from './notification.repository';
import type { OffsetPaginationParams, OffsetPaginationResult } from '@/core/types/pagination.types';
import { sendMulticastPushNotifications } from '@/infrastructure/push-notification';
import { emitNotificationCreated } from '@/infrastructure/realtime';
import { UserModel } from '@/modules/user/user.model';
import { logger } from '@/infrastructure/logger/winston.logger';

interface NotificationListFilters {
    isRead?: boolean;
}

export class NotificationService {
    constructor(private readonly repository: NotificationRepository = notificationRepository) {}

    async createNotification(
        payload: CreateNotificationInput,
        options?: RepositoryWriteOptions,
    ): Promise<INotificationDocument> {
        return this.repository.create(
            {
                userId: payload.userId,
                title: payload.title,
                message: payload.message,
                type: payload.type ?? NOTIFICATION_TYPES.INFO,
                isRead: false,
                metadata: payload.metadata,
            } as Partial<INotificationDocument>,
            options,
        );
    }

    async listUserNotifications(
        userId: string,
        filters: NotificationListFilters,
        pagination: OffsetPaginationParams,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<INotificationDocument>> {
        const query: Record<string, unknown> = { userId };
        if (typeof filters.isRead === 'boolean') {
            query.isRead = filters.isRead;
        }
        return this.repository.paginateOffset(query, pagination, options);
    }

    async markAsRead(
        notificationId: string,
        userId: string,
        options?: RepositoryWriteOptions,
    ): Promise<INotificationDocument> {
        const updated = await this.repository.markRead(notificationId, userId, options);
        if (!updated) {
            throw new NotFoundError(MESSAGES.GENERAL.NOT_FOUND, 'NOTIFICATION_NOT_FOUND');
        }
        return updated;
    }

    async markAllAsRead(userId: string, options?: RepositoryWriteOptions): Promise<number> {
        return this.repository.markAllRead(userId, options);
    }

    async getUnreadCount(userId: string, options?: RepositoryQueryOptions): Promise<number> {
        return this.repository.countUnread(userId, options);
    }

    async broadcastPushNotification(
        title: string,
        body: string,
        data?: Record<string, string>,
        options?: RepositoryWriteOptions,
    ): Promise<{
        totalUsers: number;
        usersWithToken: number;
        successCount: number;
        failureCount: number;
    }> {
        const users = await UserModel.find({
            notificationToken: { $exists: true, $ne: '' },
        })
            .select('notificationToken')
            .lean();

        const tokens = users
            .map((u) => u.notificationToken)
            .filter((t): t is string => !!t);

        if (tokens.length === 0) {
            return {
                totalUsers: users.length,
                usersWithToken: 0,
                successCount: 0,
                failureCount: 0,
            };
        }

        const result = await sendMulticastPushNotifications(tokens, title, body, data);

        return {
            totalUsers: users.length,
            usersWithToken: tokens.length,
            successCount: result.successCount,
            failureCount: result.failureCount,
        };
    }

    async broadcastToAllUsers(
        title: string,
        message: string,
        type?: string,
        metadata?: Record<string, unknown>,
        options?: RepositoryWriteOptions,
    ): Promise<{
        totalUsers: number;
        notificationsCreated: number;
        pushSuccess: number;
        pushFailure: number;
    }> {
        const users = await UserModel.find({ isDeleted: false })
            .select('_id notificationToken')
            .lean();

        const tokens = users
            .map((u) => u.notificationToken)
            .filter((t): t is string => !!t && t !== '');

        const notifications = users.map((user) => ({
            userId: user._id.toString(),
            title,
            message,
            type: type ?? NOTIFICATION_TYPES.INFO,
            isRead: false,
            metadata,
        }));

        const created = await this.repository.createMany(notifications as any, options);

        for (const user of users) {
            emitNotificationCreated(user._id.toString(), {
                id: 'broadcast',
                title,
                message,
                type: type ?? NOTIFICATION_TYPES.INFO,
                isRead: false,
                metadata,
                createdAt: new Date(),
            });
        }

        let pushResult = { successCount: 0, failureCount: 0 };
        if (tokens.length > 0) {
            pushResult = await sendMulticastPushNotifications(tokens, title, message, metadata as Record<string, string>);
        }

        return {
            totalUsers: users.length,
            notificationsCreated: notifications.length,
            pushSuccess: pushResult.successCount,
            pushFailure: pushResult.failureCount,
        };
    }
}

export const notificationService = new NotificationService();

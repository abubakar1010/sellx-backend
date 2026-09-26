import type { SerializerFn } from '@/core/types/serializer.types';

import type { INotificationDocument } from './notification.interface';

export interface NotificationResponseDto {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    readAt?: Date;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
}

const resolveId = (item: INotificationDocument): string => {
    const candidate = (item as unknown as { id?: string; _id?: unknown }).id;
    if (candidate) {
        return candidate;
    }
    const fallback = (item as unknown as { _id?: unknown })._id;
    return fallback ? String(fallback) : '';
};

export const serializeNotification: SerializerFn<INotificationDocument, NotificationResponseDto> = (
    item,
) => {
    const response: NotificationResponseDto = {
        id: resolveId(item),
        title: item.title,
        message: item.message,
        type: item.type,
        isRead: item.isRead,
    };

    if (item.readAt) {
        response.readAt = item.readAt;
    }
    if (item.metadata) {
        response.metadata = item.metadata;
    }
    if (item.createdAt) {
        response.createdAt = item.createdAt;
    }

    return response;
};

export const serializeNotifications = (
    items: INotificationDocument[],
): NotificationResponseDto[] => {
    return items.map(serializeNotification);
};

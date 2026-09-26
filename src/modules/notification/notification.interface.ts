import type { Document } from 'mongoose';

import type { NotificationType } from './notification.constants';

export interface INotification {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    readAt?: Date;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface INotificationDocument extends INotification, Document {
    id: string;
}

export interface CreateNotificationInput {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    metadata?: Record<string, unknown>;
}

import mongoose, { Schema } from 'mongoose';

import {
    paginatePlugin,
    type PaginateModel,
} from '@/infrastructure/database/plugins/paginate.plugin';
import { toJSONPlugin } from '@/infrastructure/database/plugins/toJSON.plugin';
import { NOTIFICATION_TYPES } from './notification.constants';
import type { INotificationDocument } from './notification.interface';

const notificationSchema = new Schema<INotificationDocument>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
        type: {
            type: String,
            enum: Object.values(NOTIFICATION_TYPES),
            default: NOTIFICATION_TYPES.INFO,
            index: true,
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    },
);

notificationSchema.plugin(toJSONPlugin);
notificationSchema.plugin(paginatePlugin);
notificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<
    INotificationDocument,
    PaginateModel<INotificationDocument>
>('Notification', notificationSchema, 'notifications');

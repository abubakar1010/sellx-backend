import mongoose, { Schema } from 'mongoose';
import { paginatePlugin, type PaginateModel } from '@/infrastructure/database/plugins/paginate.plugin';
import { toJSONPlugin } from '@/infrastructure/database/plugins/toJSON.plugin';
import type { INotificationPreferenceDocument } from './notification-preference.interface';

const notificationPreferenceSchema = new Schema<INotificationPreferenceDocument>(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        messages: {
            type: Boolean,
            default: true,
        },
        savedSearches: {
            type: Boolean,
            default: true,
        },
        favorites: {
            type: Boolean,
            default: true,
        },
        myListings: {
            type: Boolean,
            default: true,
        },
        emailNotifications: {
            type: Boolean,
            default: true,
        },
        general: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: 'notificationpreferences',
    },
);

notificationPreferenceSchema.plugin(toJSONPlugin);
notificationPreferenceSchema.plugin(paginatePlugin);

export const NotificationPreferenceModel = mongoose.model<
    INotificationPreferenceDocument,
    PaginateModel<INotificationPreferenceDocument>
>('NotificationPreference', notificationPreferenceSchema, 'notificationpreferences');

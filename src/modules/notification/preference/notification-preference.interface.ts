import type { Document } from 'mongoose';

export interface INotificationPreference {
    userId: string;
    messages: boolean;
    savedSearches: boolean;
    favorites: boolean;
    myListings: boolean;
    emailNotifications: boolean;
    general: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface INotificationPreferenceDocument extends INotificationPreference, Document {
    id: string;
}

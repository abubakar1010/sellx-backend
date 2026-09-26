import type { RepositoryWriteOptions } from '@/core/interfaces/repository.interface';
import type { INotificationPreference, INotificationPreferenceDocument } from './notification-preference.interface';
import { notificationPreferenceRepository, NotificationPreferenceRepository } from './notification-preference.repository';

const DEFAULT_PREFERENCES: INotificationPreference = {
    userId: '',
    messages: true,
    savedSearches: true,
    favorites: true,
    myListings: true,
    emailNotifications: true,
    general: true,
};

export class NotificationPreferenceService {
    constructor(
        private readonly repository: NotificationPreferenceRepository = notificationPreferenceRepository,
    ) {}

    async getPreferences(
        userId: string,
        options?: RepositoryWriteOptions,
    ): Promise<INotificationPreferenceDocument> {
        let prefs = await this.repository.findByUserId(userId);
        if (!prefs) {
            prefs = await this.repository.create(
                { ...DEFAULT_PREFERENCES, userId } as Partial<INotificationPreferenceDocument>,
                options,
            );
        }
        return prefs;
    }

    async updatePreferences(
        userId: string,
        data: Partial<INotificationPreference>,
        options?: RepositoryWriteOptions,
    ): Promise<INotificationPreferenceDocument> {
        return this.repository.upsertByUserId(userId, data, options);
    }

    async createDefaultPreferences(
        userId: string,
        options?: RepositoryWriteOptions,
    ): Promise<INotificationPreferenceDocument> {
        return this.repository.create(
            { ...DEFAULT_PREFERENCES, userId } as Partial<INotificationPreferenceDocument>,
            options,
        );
    }
}

export const notificationPreferenceService = new NotificationPreferenceService();

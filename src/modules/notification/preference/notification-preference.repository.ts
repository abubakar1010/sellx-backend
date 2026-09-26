import type { RepositoryQueryOptions, RepositoryWriteOptions } from '@/core/interfaces/repository.interface';
import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';
import type { INotificationPreference, INotificationPreferenceDocument } from './notification-preference.interface';
import { NotificationPreferenceModel } from './notification-preference.model';

export class NotificationPreferenceRepository extends BaseMongooseRepository<INotificationPreferenceDocument> {
    constructor() {
        super(NotificationPreferenceModel);
    }

    async findByUserId(userId: string, options?: RepositoryQueryOptions): Promise<INotificationPreferenceDocument | null> {
        return this.findOne({ userId } as Partial<INotificationPreferenceDocument>, options);
    }

    async upsertByUserId(
        userId: string,
        data: Partial<INotificationPreference>,
        options?: RepositoryWriteOptions,
    ): Promise<INotificationPreferenceDocument> {
        const doc = await NotificationPreferenceModel.findOneAndUpdate(
            { userId },
            { $set: { ...data, userId } },
            { new: true, upsert: true, ...(options?.session ? { session: options.session as any } : {}) },
        ).lean<INotificationPreferenceDocument>();
        return doc;
    }
}

export const notificationPreferenceRepository = new NotificationPreferenceRepository();

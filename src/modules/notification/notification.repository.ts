import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import { NotificationModel } from './notification.model';
import type { INotificationDocument } from './notification.interface';
import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';

const withAbort = async <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) {
        return promise;
    }

    if (signal.aborted) {
        const error = new Error('Operation aborted.');
        error.name = 'AbortError';
        throw error;
    }

    return new Promise<T>((resolve, reject) => {
        const abortHandler = (): void => {
            const error = new Error('Operation aborted.');
            error.name = 'AbortError';
            reject(error);
        };
        signal.addEventListener('abort', abortHandler, { once: true });
        promise
            .then(resolve)
            .catch(reject)
            .finally(() => signal.removeEventListener('abort', abortHandler));
    });
};

export class NotificationRepository extends BaseMongooseRepository<INotificationDocument> {
    constructor() {
        super(NotificationModel);
    }

    async countUnread(userId: string, options?: RepositoryQueryOptions): Promise<number> {
        const operation = this.model.countDocuments({ userId, isRead: false });
        return withAbort(operation, options?.signal);
    }

    async markRead(
        notificationId: string,
        userId: string,
        options?: RepositoryWriteOptions,
    ): Promise<INotificationDocument | null> {
        const operation = this.model
            .findOneAndUpdate(
                { _id: notificationId, userId },
                { $set: { isRead: true, readAt: new Date() } },
                { new: true },
            )
            .lean<INotificationDocument>();
        return withAbort(operation as Promise<INotificationDocument | null>, options?.signal);
    }

    async markAllRead(userId: string, options?: RepositoryWriteOptions): Promise<number> {
        const operation = this.model.updateMany(
            { userId, isRead: false },
            { $set: { isRead: true, readAt: new Date() } },
        );
        const result = await withAbort(operation, options?.signal);
        return result.modifiedCount ?? 0;
    }

    async createMany(
        payloads: Array<Partial<INotificationDocument>>,
        options?: RepositoryWriteOptions,
    ): Promise<number> {
        const operation = this.model.insertMany(payloads, { ordered: false });
        const docs = await withAbort(operation, options?.signal);
        return docs.length;
    }
}

export const notificationRepository = new NotificationRepository();
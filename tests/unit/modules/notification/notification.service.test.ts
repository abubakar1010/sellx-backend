import { NotFoundError } from '../../../../src/core/errors';
import { NOTIFICATION_TYPES } from '../../../../src/modules/notification/notification.constants';
import type { NotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { NotificationService } from '../../../../src/modules/notification/notification.service';
import { buildNotification } from '../../../factories/notification.factory';

const createRepositoryMock = (): jest.Mocked<Partial<NotificationRepository>> => {
    return {
        create: jest.fn(),
        paginateOffset: jest.fn(),
        markRead: jest.fn(),
        markAllRead: jest.fn(),
        countUnread: jest.fn(),
    };
};

describe('NotificationService', () => {
    it('creates notification with INFO type by default', async () => {
        const repository = createRepositoryMock();
        (repository.create as jest.Mock).mockImplementation(async (payload) =>
            buildNotification(payload),
        );
        const service = new NotificationService(repository as NotificationRepository);

        await service.createNotification({
            userId: '507f1f77bcf86cd799439011',
            title: 'Hello',
            message: 'Welcome',
        });

        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                type: NOTIFICATION_TYPES.INFO,
                isRead: false,
            }),
            undefined,
        );
    });

    it('passes isRead filter when listing', async () => {
        const repository = createRepositoryMock();
        (repository.paginateOffset as jest.Mock).mockResolvedValue({
            data: [],
            meta: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        });
        const service = new NotificationService(repository as NotificationRepository);

        await service.listUserNotifications(
            '507f1f77bcf86cd799439011',
            { isRead: true },
            { page: 1, limit: 20, sort: '-createdAt' },
        );

        expect(repository.paginateOffset).toHaveBeenCalledWith(
            { userId: '507f1f77bcf86cd799439011', isRead: true },
            { page: 1, limit: 20, sort: '-createdAt' },
            undefined,
        );
    });

    it('throws NotFoundError when markAsRead target does not exist', async () => {
        const repository = createRepositoryMock();
        (repository.markRead as jest.Mock).mockResolvedValue(null);
        const service = new NotificationService(repository as NotificationRepository);

        await expect(
            service.markAsRead('507f1f77bcf86cd799439099', '507f1f77bcf86cd799439011'),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});

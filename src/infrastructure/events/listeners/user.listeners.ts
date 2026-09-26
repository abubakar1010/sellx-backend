import { logger } from '../../logger/winston.logger';
import type { IEventBus } from '@/core/interfaces/event-bus.interface';
import { notificationProducer } from '@/jobs/producers/notification.producer';

interface UserRegisteredPayload {
    userId: string;
    email: string;
    name: string;
}

export const registerUserListeners = (bus: IEventBus): void => {
    bus.on<UserRegisteredPayload>('user:registered', async (payload) => {
        logger.info('User registered event received', { ...payload });

        // Send notification to admin about new user registration
        await notificationProducer.addJob('admin-new-user', {
            userId: '',
            title: 'New User Registration',
            message: `A new user has registered: ${payload.name} (${payload.email})`,
            type: 'info',
            metadata: {
                userId: payload.userId,
                email: payload.email,
                name: payload.name,
            },
        });
    });
};

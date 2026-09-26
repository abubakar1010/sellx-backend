import { config } from '@/config';
import { UserModel } from '@/modules/user/user.model';
import { NotificationModel } from '@/modules/notification/notification.model';
import { NOTIFICATION_TYPES } from '@/modules/notification/notification.constants';
import { logger } from '@/infrastructure/logger/winston.logger';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';

const sampleNotifications = [
    {
        title: 'Welcome to SellX!',
        message: 'Thank you for joining our marketplace. Start exploring amazing products today.',
        type: NOTIFICATION_TYPES.SUCCESS,
    },
    {
        title: 'New Product Available',
        message: 'A new iPhone 15 Pro Max has been listed near your location. Check it out!',
        type: NOTIFICATION_TYPES.INFO,
    },
    {
        title: 'Price Drop Alert',
        message: 'A product you favorited has dropped in price by 15%. Don\'t miss this deal!',
        type: NOTIFICATION_TYPES.WARNING,
    },
    {
        title: 'Deal Request Received',
        message: 'A buyer has requested a deal agreement for your listed product. Review and respond.',
        type: NOTIFICATION_TYPES.INFO,
    },
    {
        title: 'Payment Successful',
        message: 'Your payment of $299.99 has been processed successfully. Order #12345.',
        type: NOTIFICATION_TYPES.SUCCESS,
    },
    {
        title: 'Account Security Alert',
        message: 'We detected a new login to your account from a different device. If this wasn\'t you, please secure your account.',
        type: NOTIFICATION_TYPES.ERROR,
    },
    {
        title: 'Product Sold',
        message: 'Congratulations! Your listed product has been sold. Check your dashboard for details.',
        type: NOTIFICATION_TYPES.SUCCESS,
    },
    {
        title: 'Review Reminder',
        message: 'You recently purchased a product. Please leave a review to help other buyers.',
        type: NOTIFICATION_TYPES.INFO,
    },
    {
        title: 'System Maintenance',
        message: 'We\'ll be performing scheduled maintenance on Sunday from 2-4 AM. Services may be temporarily unavailable.',
        type: NOTIFICATION_TYPES.WARNING,
    },
    {
        title: 'New Message',
        message: 'You have a new message from a buyer regarding your product listing.',
        type: NOTIFICATION_TYPES.INFO,
    },
];

export const seedNotifications = async (): Promise<void> => {
    await connectDatabase();

    try {
        const user = await UserModel.findOne({ email: 'john.doe@example.com' });
        if (!user) {
            logger.error('User not found', { email: 'john.doe@example.com' });
            return;
        }

        const existingCount = await NotificationModel.countDocuments({ userId: user._id.toString() });
        if (existingCount > 0) {
            logger.info('User already has notifications, skipping', {
                userId: user._id,
                existingCount,
            });
            return;
        }

        const notifications = sampleNotifications.map((n, index) => ({
            userId: user._id,
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: index < 3,
            readAt: index < 3 ? new Date() : null,
            createdAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)),
        }));

        await NotificationModel.insertMany(notifications);

        logger.info('✅ Sample notifications created', {
            userId: user._id,
            email: user.email,
            count: notifications.length,
        });
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedNotifications()
        .then(() => {
            logger.info('🎉 Notification seed completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Notification seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}

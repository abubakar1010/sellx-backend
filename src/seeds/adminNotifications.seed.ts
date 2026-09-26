import { Types } from 'mongoose';
import { config } from '@/config';
import { ROLES } from '@/core/constants/roles';
import { CURRENCY } from '@/core/constants/currency';
import { UserModel } from '@/modules/user/user.model';
import { NotificationModel } from '@/modules/notification/notification.model';
import { NOTIFICATION_TYPES } from '@/modules/notification/notification.constants';
import { ActivityModel } from '@/modules/admin/activity/activity.model';
import { ACTIVITY_TYPES } from '@/modules/admin/activity/activity.interface';
import { logger } from '@/infrastructure/logger/winston.logger';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';

const adminNotifications = [
    {
        title: 'New User Registered',
        message: 'A new user has joined the platform. Verify their account details.',
        type: NOTIFICATION_TYPES.INFO,
        metadata: { actionUrl: '/admin/users' },
    },
    {
        title: 'Store Approval Pending',
        message: 'A store "TechZone" is pending your approval. Review their documents.',
        type: NOTIFICATION_TYPES.WARNING,
        metadata: { storeId: 'store_001' },
    },
    {
        title: 'Flagged Listing Alert',
        message: 'A product listing has been flagged for inappropriate content. Take action.',
        type: NOTIFICATION_TYPES.ERROR,
        metadata: { listingId: 'listing_001' },
    },
    {
        title: 'Payment Received',
        message: 'Subscription payment of $49.99 received from user "john.doe@example.com".',
        type: NOTIFICATION_TYPES.SUCCESS,
        metadata: { userId: 'user_001', amount: 49.99 },
    },
    {
        title: 'System Update Available',
        message: 'A new system update v2.5.0 is available. Schedule maintenance to apply.',
        type: NOTIFICATION_TYPES.INFO,
        metadata: { version: '2.5.0' },
    },
    {
        title: 'Store Rejected',
        message: 'Store "SecondHandShop" was rejected due to incomplete documentation.',
        type: NOTIFICATION_TYPES.WARNING,
        metadata: { storeId: 'store_002' },
    },
    {
        title: 'Subscription Cancelled',
        message: 'User "jane@example.com" has cancelled their premium subscription.',
        type: NOTIFICATION_TYPES.ERROR,
        metadata: { userId: 'user_002' },
    },
    {
        title: 'Daily Report Ready',
        message: 'Your daily platform report is ready. View key metrics and insights.',
        type: NOTIFICATION_TYPES.INFO,
        metadata: { reportDate: new Date().toISOString() },
    },
    {
        title: 'New Review Reported',
        message: 'A review has been reported for violating community guidelines. Review it.',
        type: NOTIFICATION_TYPES.WARNING,
        metadata: { reviewId: 'review_001' },
    },
    {
        title: 'Store Approved',
        message: 'Store "FashionHub" has been approved and is now live on the platform.',
        type: NOTIFICATION_TYPES.SUCCESS,
        metadata: { storeId: 'store_003' },
    },
    {
        title: 'High Traffic Alert',
        message: 'Platform is experiencing higher than normal traffic. Monitor performance.',
        type: NOTIFICATION_TYPES.WARNING,
        metadata: { trafficPercentile: 95 },
    },
    {
        title: 'Bulk User Import Complete',
        message: 'Successfully imported 150 users from the CSV upload.',
        type: NOTIFICATION_TYPES.SUCCESS,
        metadata: { count: 150 },
    },
];

const adminActivities = [
    {
        activityType: 'user_registered' as const,
        message: 'New user "john.doe@example.com" registered on the platform.',
        targetType: 'user',
        targetId: 'user_001',
        metadata: { email: 'john.doe@example.com' },
    },
    {
        activityType: 'store_created' as const,
        message: 'Store "TechZone" was created by user "mike@example.com".',
        targetType: 'store',
        targetId: 'store_001',
        metadata: { storeName: 'TechZone' },
    },
    {
        activityType: 'store_approved' as const,
        message: 'Admin approved store "TechZone" after document verification.',
        targetType: 'store',
        targetId: 'store_001',
        metadata: { adminAction: true },
    },
    {
        activityType: 'store_rejected' as const,
        message: 'Store "SecondHandShop" was rejected due to incomplete documentation.',
        targetType: 'store',
        targetId: 'store_002',
        metadata: { reason: 'Incomplete documentation' },
    },
    {
        activityType: 'listing_created' as const,
        message: 'New listing "iPhone 15 Pro Max" created by user "alice@example.com".',
        targetType: 'listing',
        targetId: 'listing_001',
        metadata: { title: 'iPhone 15 Pro Max' },
    },
    {
        activityType: 'listing_approved' as const,
        message: 'Listing "iPhone 15 Pro Max" was approved and published.',
        targetType: 'listing',
        targetId: 'listing_001',
        metadata: { adminAction: true },
    },
    {
        activityType: 'listing_rejected' as const,
        message: 'Listing "Vintage Watch" was rejected for policy violation.',
        targetType: 'listing',
        targetId: 'listing_002',
        metadata: { reason: 'Policy violation' },
    },
    {
        activityType: 'listing_flagged' as const,
        message: 'Listing "Suspicious Item" was automatically flagged by the system.',
        targetType: 'listing',
        targetId: 'listing_003',
        metadata: { flagReason: 'Suspicious content' },
    },
    {
        activityType: 'payment_received' as const,
        message: 'Subscription payment of $49.99 received from "john.doe@example.com".',
        targetType: 'payment',
        targetId: 'payment_001',
        metadata: { amount: 509, currency: CURRENCY },
    },
    {
        activityType: 'subscription_renewed' as const,
        message: 'Subscription for "jane@example.com" was auto-renewed for another month.',
        targetType: 'subscription',
        targetId: 'sub_001',
        metadata: { plan: 'Premium' },
    },
    {
        activityType: 'subscription_cancelled' as const,
        message: 'User "jane@example.com" cancelled their premium subscription.',
        targetType: 'subscription',
        targetId: 'sub_001',
        metadata: { cancelledBy: 'user' },
    },
    {
        activityType: 'admin_action' as const,
        message: 'Admin updated platform settings: notification preferences.',
        targetType: 'settings',
        targetId: null,
        metadata: { setting: 'notification_preferences' },
    },
    {
        activityType: 'admin_action' as const,
        message: 'Admin removed flagged listing "Inappropriate Content".',
        targetType: 'listing',
        targetId: 'listing_004',
        metadata: { action: 'removed' },
    },
    {
        activityType: 'system_event' as const,
        message: 'Scheduled database backup completed successfully.',
        targetType: 'system',
        metadata: { backupSize: '2.4GB', duration: '45s' },
    },
    {
        activityType: 'system_event' as const,
        message: 'System cache was cleared during scheduled maintenance.',
        targetType: 'system',
        metadata: { cacheType: 'redis', freedMemory: '512MB' },
    },
];

export const seedAdminNotifications = async (): Promise<void> => {
    await connectDatabase();

    try {
        const admin = await UserModel.findOne({ role: ROLES.SUPER_ADMIN }).sort({ createdAt: 1 });
        if (!admin) {
            logger.error('Admin user not found. Run seed:super-admin first.');
            return;
        }

        const existingNotificationCount = await NotificationModel.countDocuments({
            userId: admin._id.toString(),
        });
        const existingActivityCount = await ActivityModel.countDocuments({
            actorId: admin._id,
        });

        if (existingNotificationCount > 0 || existingActivityCount > 0) {
            logger.info('Admin already has notifications and/or activities, skipping', {
                notificationCount: existingNotificationCount,
                activityCount: existingActivityCount,
            });
            return;
        }

        // Create notifications
        const notifications = adminNotifications.map((n, index) => ({
            userId: admin._id.toString(),
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: index < adminNotifications.length / 2,
            readAt: index < adminNotifications.length / 2 ? new Date() : null,
            metadata: n.metadata,
            createdAt: new Date(Date.now() - ((adminNotifications.length - index) * 24 * 60 * 60 * 1000)),
        }));

        await NotificationModel.insertMany(notifications);
        logger.info('Admin notifications created', {
            userId: admin._id.toString(),
            count: notifications.length,
        });

        // Create activities
        const activities = adminActivities.map((a, index) => ({
            actorId: admin._id,
            actorType: 'admin' as const,
            activityType: a.activityType,
            message: a.message,
            targetType: a.targetType,
            targetId: a.targetId ?? undefined,
            metadata: a.metadata,
            createdAt: new Date(Date.now() - ((adminActivities.length - index) * 12 * 60 * 60 * 1000)),
        }));

        await ActivityModel.insertMany(activities);
        logger.info('Admin activities created', {
            actorId: admin._id.toString(),
            count: activities.length,
        });

        logger.info('Admin notifications and activities seeded successfully', {
            email: admin.email,
            notifications: notifications.length,
            activities: activities.length,
        });
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedAdminNotifications()
        .then(() => {
            logger.info('Admin notifications & activities seed completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Admin notifications & activities seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}

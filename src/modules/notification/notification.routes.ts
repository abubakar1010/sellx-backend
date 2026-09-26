import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { notificationController } from './notification.controller';
import {
    createNotificationBodySchema,
    listNotificationsQuerySchema,
    notificationIdParamSchema,
    testPushNotificationBodySchema,
    broadcastNotificationBodySchema,
} from './notification.validation';
import notificationPreferenceRoutes from './preference/notification-preference.routes';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: listNotificationsQuerySchema }), notificationController.listMine);
router.patch(
    '/:id/read',
    validate({ params: notificationIdParamSchema }),
    notificationController.markRead,
);
router.patch('/read-all', notificationController.markAllRead);
router.get('/unread-count', notificationController.unreadCount);

router.post(
    '/',
    validate({ body: createNotificationBodySchema }),
    notificationController.createNotification,
);
router.post(
    '/test-broadcast-push',
    validate({ body: testPushNotificationBodySchema }),
    notificationController.testBroadcastPush,
);
router.post(
    '/broadcast',
    validate({ body: broadcastNotificationBodySchema }),
    notificationController.broadcastToAll,
);
router.use('/preferences', notificationPreferenceRoutes);

export default router;

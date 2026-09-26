import { Router } from 'express';
import { adminNotificationsController } from './notifications.controller';

const router = Router();

router.get('/', adminNotificationsController.list);
router.patch('/:id/read', adminNotificationsController.markAsRead);

export default router;

import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { notificationPreferenceController } from './notification-preference.controller';
import { updateNotificationPreferenceBodySchema } from './notification-preference.validation';

const router = Router();

router.use(authenticate);

router.get('/', notificationPreferenceController.get);
router.put(
    '/',
    validate({ body: updateNotificationPreferenceBodySchema }),
    notificationPreferenceController.update,
);

export default router;

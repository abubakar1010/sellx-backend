import { Router } from 'express';

import { validate } from '@/shared/middlewares/validate';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { adminUserSubscriptionsController } from './user-subscriptions.controller';

const router = Router();

router.get('/', adminUserSubscriptionsController.list);
router.get('/stats', adminUserSubscriptionsController.stats);
router.get('/:id', validate({ params: objectIdParamSchema }), adminUserSubscriptionsController.getById);
router.patch('/:id/cancel', validate({ params: objectIdParamSchema }), adminUserSubscriptionsController.cancel);

export default router;

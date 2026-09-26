import { Router } from 'express';

import { authenticate } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { userSubscriptionController } from './user-subscription.controller';
import {
    createUserSubscriptionBodySchema,
    listUserSubscriptionsQuerySchema,
    cancelUserSubscriptionBodySchema,
} from './user-subscription.validation';
import { objectIdParamSchema } from '@/modules/user/user.validation';

const router = Router();

router.use(authenticate);

router.post(
    '/',
    validate({ body: createUserSubscriptionBodySchema }),
    userSubscriptionController.subscribe,
);
router.get('/my', userSubscriptionController.getMy);
router.get(
    '/',
    validate({ query: listUserSubscriptionsQuerySchema }),
    userSubscriptionController.list,
);
router.get(
    '/:id',
    validate({ params: objectIdParamSchema }),
    userSubscriptionController.getById,
);
router.patch(
    '/:id/cancel',
    validate({ params: objectIdParamSchema, body: cancelUserSubscriptionBodySchema }),
    userSubscriptionController.cancel,
);
router.post(
    '/:id/renew',
    validate({ params: objectIdParamSchema }),
    userSubscriptionController.renew,
);

export default router;

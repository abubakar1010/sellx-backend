import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { adminSubscriptionsController } from './subscriptions.controller';

const router = Router();

router.get('/', adminSubscriptionsController.list);
router.get('/:id', validate({ params: objectIdParamSchema }), adminSubscriptionsController.getById);
router.post('/', adminSubscriptionsController.create);
router.patch('/:id', validate({ params: objectIdParamSchema }), adminSubscriptionsController.update);
router.delete('/:id', validate({ params: objectIdParamSchema }), adminSubscriptionsController.delete);
router.patch('/:id/toggle-status', validate({ params: objectIdParamSchema }), adminSubscriptionsController.toggleStatus);

export default router;

import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { adminCouponController } from './coupon.controller';

const router = Router();

router.get('/', adminCouponController.list);
router.get('/stats', adminCouponController.stats);
router.get('/:id', validate({ params: objectIdParamSchema }), adminCouponController.getById);
router.post('/', adminCouponController.create);
router.patch('/:id', validate({ params: objectIdParamSchema }), adminCouponController.update);
router.delete('/:id', validate({ params: objectIdParamSchema }), adminCouponController.delete);
router.patch('/:id/toggle-status', validate({ params: objectIdParamSchema }), adminCouponController.toggleStatus);

export default router;

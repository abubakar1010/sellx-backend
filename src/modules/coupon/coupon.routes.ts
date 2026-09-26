import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { couponController } from './coupon.controller';
import { validateCouponQuerySchema } from './coupon.validation';

const router = Router();

router.get('/validate', validate({ query: validateCouponQuerySchema }), couponController.validate);

export default router;

import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { adminUsersController } from './users.controller';
import { userProductsQuerySchema } from './users.validation';

const router = Router();

router.get('/', adminUsersController.list);
router.get('/stats', adminUsersController.stats);
router.patch('/:id/toggle-status', validate({ params: objectIdParamSchema }), adminUsersController.toggleStatus);
router.get('/:id/products', validate({ params: objectIdParamSchema, query: userProductsQuerySchema }), adminUsersController.listProducts);
router.get('/:id', validate({ params: objectIdParamSchema }), adminUsersController.detail);

export default router;

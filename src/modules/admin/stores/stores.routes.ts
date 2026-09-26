import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { adminStoresController } from './stores.controller';
import { storeProductsQuerySchema } from './stores.validation';

const router = Router();

router.get('/', adminStoresController.list);
router.get('/stats', adminStoresController.stats);
router.get('/:id/products', validate({ params: objectIdParamSchema, query: storeProductsQuerySchema }), adminStoresController.listProducts);
router.get('/:id/ads', validate({ params: objectIdParamSchema }), adminStoresController.listAds);
router.get('/:id/payments', validate({ params: objectIdParamSchema }), adminStoresController.listPayments);
router.get('/:id', validate({ params: objectIdParamSchema }), adminStoresController.detail);
router.patch('/:id/toggle-status', validate({ params: objectIdParamSchema }), adminStoresController.toggleStatus);

export default router;

import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { adminListingsController } from './listings.controller';
import { adminListingsQuerySchema } from './listings.validation';
import { productController } from '@/modules/products/product.controller';

const router = Router();

router.get('/overview', adminListingsController.overview);
router.get('/:id', productController.getListingDetail);
router.get('/', validate({ query: adminListingsQuerySchema }), adminListingsController.list);
router.patch(
    '/:id/status',
    validate({ params: objectIdParamSchema }),
    adminListingsController.updateStatus,
);
router.delete(
    '/:id',
    validate({ params: objectIdParamSchema }),
    adminListingsController.deleteProduct,
);

export default router;

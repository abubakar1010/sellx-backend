import { Router } from 'express';

import { authenticate, optionalAuth } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { storeController } from './store.controller';
import { storeFollowController } from './store-follow.controller';
import {
    createStoreBodySchema,
    updateStoreBodySchema,
    storeReviewsQuerySchema,
    storeProductsQuerySchema,
} from './store.validation';
import { uploadFields } from '@/shared/middlewares/upload';
import { parseFormData } from '@/shared/middlewares/parseFormData';
import { objectIdParamSchema } from '../user/user.validation';

const router = Router();

router.get('/', storeController.listStores);
router.get('/by-slug/:slug', optionalAuth, storeController.getStoreBySlug);

router.get('/self/products', authenticate, validate({ query: storeProductsQuerySchema }), storeController.getSelfStoreProducts);
router.get('/self/reviews', authenticate, validate({ query: storeReviewsQuerySchema }), storeController.getSelfStoreReviews);
router.get('/self', authenticate, storeController.getSelfStore);
router.patch('/self', authenticate, uploadFields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
], 'stores'), parseFormData, validate({ body: updateStoreBodySchema }), storeController.updateSelfStore);

router.post('/:id/follow', authenticate, validate({ params: objectIdParamSchema }), storeFollowController.toggle);
router.delete('/:id/follow', authenticate, validate({ params: objectIdParamSchema }), storeFollowController.toggle);

router.post(
    '/',
    authenticate,
    uploadFields([
        { name: 'logo', maxCount: 1 },
        { name: 'banner', maxCount: 1 },
    ], 'stores'),
    parseFormData,
    validate({ body: createStoreBodySchema }),
    storeController.createStore,
);

export default router;

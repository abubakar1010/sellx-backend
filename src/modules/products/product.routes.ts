import { Router } from 'express';
import { authenticate, optionalAuth } from '@/shared/middlewares/authenticate';
import { authorize } from '@/shared/middlewares/authorize';
import { validate } from '@/shared/middlewares/validate';
import { setUploadDir, uploadProductFiles } from '@/shared/middlewares/upload';
import { parseFormData } from '@/shared/middlewares/parseFormData';
import { productController } from './product.controller';
import { resolveCategoryContext, validateByCategory } from './product.middleware';
import {
    listProductsQuerySchema,
    myProductsQuerySchema,
    promoteProductBodySchema,
    markSoldBodySchema,
    reportProductBodySchema,
} from './product.validation';
import { storeIdParamSchema } from '../user/user.validation';

const router = Router();

router.get('/boost-plans', productController.listBoostPlans);

router.get('/public', optionalAuth, validate({ query: listProductsQuerySchema }), productController.listPublic);
router.get('/public/:id', optionalAuth, productController.getPublicDetails);
router.get('/store/:storeId', optionalAuth, validate({ params: storeIdParamSchema, query: listProductsQuerySchema }), productController.listByStore);

router.use(authenticate);

// The body schema depends on the category, so the category is resolved first and
// `validateByCategory` then picks the matching per-category schema.
router.post(
    '/',
    setUploadDir('products'),
    uploadProductFiles,
    parseFormData,
    resolveCategoryContext('create'),
    validateByCategory,
    productController.createMyProduct,
);
router.patch(
    '/:id',
    setUploadDir('products'),
    uploadProductFiles,
    parseFormData,
    resolveCategoryContext('update'),
    validateByCategory,
    productController.updateMyProduct,
);
router.delete('/:id', productController.deleteMyProduct);

router.get('/my', validate({ query: myProductsQuerySchema }), productController.listMyProducts);
router.get('/favorites', productController.listFavorites);
router.post('/:id/mark-sold', validate({ body: markSoldBodySchema }), productController.markAsSold);
router.post('/:id/promote', validate({ body: promoteProductBodySchema }), productController.promote);
// Moderation is an admin action. Without authorize() any authenticated user could
// move any listing from draft to active and set its paid expiry window.
router.patch('/:id/approve', authorize('superAdmin'), productController.approve);

router.post('/:id/favorite', productController.toggleFavorite);
router.post('/:id/report', validate({ body: reportProductBodySchema }), productController.report);

export default router;
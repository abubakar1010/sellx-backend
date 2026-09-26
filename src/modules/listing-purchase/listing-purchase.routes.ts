import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { listingPurchaseController } from './listing-purchase.controller';
import {
    createListingPurchaseBodySchema,
    listListingPurchasesQuerySchema,
} from './listing-purchase.validation';
import { objectIdParamSchema } from '@/modules/user/user.validation';

const router = Router();

router.use(authenticate);

router.post('/', validate({ body: createListingPurchaseBodySchema }), listingPurchaseController.purchase);
router.get('/', validate({ query: listListingPurchasesQuerySchema }), listingPurchaseController.list);
router.get('/active', listingPurchaseController.getActive);
router.get('/:id', validate({ params: objectIdParamSchema }), listingPurchaseController.getById);

export default router;

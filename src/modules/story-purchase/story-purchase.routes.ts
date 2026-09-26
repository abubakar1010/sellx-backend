import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { storyPurchaseController } from './story-purchase.controller';
import {
    createStoryPurchaseBodySchema,
    listStoryPurchasesQuerySchema,
} from './story-purchase.validation';
import { objectIdParamSchema } from '@/modules/user/user.validation';

const router = Router();

router.use(authenticate);

router.post('/', validate({ body: createStoryPurchaseBodySchema }), storyPurchaseController.purchase);
router.get('/', validate({ query: listStoryPurchasesQuerySchema }), storyPurchaseController.list);
router.get('/active', storyPurchaseController.getActive);
router.get('/:id', validate({ params: objectIdParamSchema }), storyPurchaseController.getById);

export default router;

import { Router } from 'express';

import { authenticate } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { uploadSingle } from '@/shared/middlewares/upload';
import { parseFormData } from '@/shared/middlewares/parseFormData';
import { adController } from './ads.controller';
import {
    createAdCampaignBodySchema,
    updateAdCampaignBodySchema,
    listAdsQuerySchema,
    publicAdsQuerySchema,
} from './ads.validation';

const router = Router();

router.get('/packages', adController.listPackages);
router.get('/public', validate({ query: publicAdsQuerySchema }), adController.listPublic);

router.use(authenticate);

router.post(
    '/',
    uploadSingle('thumbnail', 'ads'),
    parseFormData,
    validate({ body: createAdCampaignBodySchema }),
    adController.create,
);
router.get('/', validate({ query: listAdsQuerySchema }), adController.listMy);
router.patch(
    '/:id',
    uploadSingle('thumbnail', 'ads'),
    parseFormData,
    validate({ body: updateAdCampaignBodySchema }),
    adController.update,
);
router.delete('/:id', adController.delete);

export default router;

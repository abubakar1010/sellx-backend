import { Router } from 'express';

import { authenticate } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { parseFormData } from '@/shared/middlewares/parseFormData';
import { setUploadDir, uploadSingleImageMiddleware } from '@/shared/middlewares/upload';
import { onboardingController } from './onboarding.controller';
import {
    completeProfileBodySchema,
    selectCategoriesBodySchema,
} from './onboarding.validation';

const router = Router();

router.use(authenticate);

router.post(
    '/profile',
    setUploadDir('users'),
    uploadSingleImageMiddleware,
    parseFormData,
    validate({ body: completeProfileBodySchema }),
    onboardingController.completeProfile,
);

router.post(
    '/categories',
    validate({ body: selectCategoriesBodySchema }),
    onboardingController.selectCategories,
);

export default router;
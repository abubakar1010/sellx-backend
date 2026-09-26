import { Router } from 'express';
import { z } from 'zod';
import { validate } from '@/shared/middlewares/validate';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { settingSlugEnum } from '@/modules/settings/settings.validation';
import { adminSettingsController } from './settings.controller';

const router = Router();

const listQuerySchema = z.object({
    slug: settingSlugEnum.optional(),
});

router.get('/', validate({ query: listQuerySchema }), adminSettingsController.list);
router.post('/', adminSettingsController.upsert);
router.get('/:id', validate({ params: objectIdParamSchema }), adminSettingsController.getById);

export default router;

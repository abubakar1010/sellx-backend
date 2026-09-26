import { Router } from 'express';
import { settingController } from './settings.controller';

const router = Router();

router.get('/:slug', settingController.getBySlug);

export default router;

import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { activityController } from './activity.controller';
import { activityListQuerySchema } from './activity.validation';

const router = Router();

router.get('/', validate({ query: activityListQuerySchema }), activityController.list);

export default router;

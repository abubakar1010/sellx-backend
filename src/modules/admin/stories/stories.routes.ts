import { Router } from 'express';
import { adminStoriesController } from './stories.controller';

const router = Router();

router.get('/', adminStoriesController.list);
router.get('/stats', adminStoriesController.stats);

export default router;

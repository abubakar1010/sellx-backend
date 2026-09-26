import { Router } from 'express';
import { adminStoryPurchasesController } from './story-purchases.controller';

const router = Router();

router.get('/', adminStoryPurchasesController.list);
router.get('/stats', adminStoryPurchasesController.stats);

export default router;

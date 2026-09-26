import { Router } from 'express';
import { adminListingPurchasesController } from './listing-purchases.controller';

const router = Router();

router.get('/', adminListingPurchasesController.list);
router.get('/stats', adminListingPurchasesController.stats);

export default router;

import { Router } from 'express';
import { adminPaymentsController } from './payments.controller';

const router = Router();

router.get('/', adminPaymentsController.list);
router.get('/stats', adminPaymentsController.stats);

export default router;

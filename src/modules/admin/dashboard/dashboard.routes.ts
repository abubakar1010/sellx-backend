import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { dashboardController } from './dashboard.controller';
import { dashboardSummaryQuerySchema } from './dashboard.validation';

const router = Router();

router.get(
    '/summary',
    validate({ query: dashboardSummaryQuerySchema }),
    dashboardController.getSummary,
);

export default router;

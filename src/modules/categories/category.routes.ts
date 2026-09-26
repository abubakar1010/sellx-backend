import { Router } from 'express';

import { validate } from '@/shared/middlewares/validate';
import { categoryController } from './category.controller';

import { listCategoriesQuerySchema } from './category.validation';

const router = Router();

/* -------------------------------------------------------------------------- */
/*                               Public Routes                                */
/* -------------------------------------------------------------------------- */

// Get all active categories (for general users/frontend display)
router.get(
    '/public',
    validate({ query: listCategoriesQuerySchema }),
    categoryController.listPublicCategories,
);

export default router;

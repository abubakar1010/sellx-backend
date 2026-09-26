import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { filterOptionsController } from './filter-options.controller';
import { filterOptionsQuerySchema, filterModelsQuerySchema } from './filter-options.validation';

const router = Router();

router.get('/options', validate({ query: filterOptionsQuerySchema }), filterOptionsController.getOptions);
router.get('/models', validate({ query: filterModelsQuerySchema }), filterOptionsController.getModels);

export default router;

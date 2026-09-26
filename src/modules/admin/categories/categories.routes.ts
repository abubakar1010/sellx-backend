import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { uploadSingle } from '@/shared/middlewares/upload';
import { parseFormData } from '@/shared/middlewares/parseFormData';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { adminCategoriesController } from './categories.controller';

const router = Router();

router.get('/', adminCategoriesController.list);
router.get('/stats', adminCategoriesController.stats);
router.get('/:id', validate({ params: objectIdParamSchema }), adminCategoriesController.getById);
router.post('/', uploadSingle('thumbnail', 'categories'), parseFormData, adminCategoriesController.create);
router.patch('/:id', validate({ params: objectIdParamSchema }), uploadSingle('thumbnail', 'categories'), parseFormData, adminCategoriesController.update);
router.delete('/:id', validate({ params: objectIdParamSchema }), adminCategoriesController.delete);

export default router;

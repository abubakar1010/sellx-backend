import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { adminStoryPackagesController } from './story-packages.controller';

const router = Router();

router.get('/', adminStoryPackagesController.list);
router.get('/:id', validate({ params: objectIdParamSchema }), adminStoryPackagesController.getById);
router.post('/', adminStoryPackagesController.create);
router.patch('/:id', validate({ params: objectIdParamSchema }), adminStoryPackagesController.update);
router.delete('/:id', validate({ params: objectIdParamSchema }), adminStoryPackagesController.delete);
router.patch('/:id/toggle-status', validate({ params: objectIdParamSchema }), adminStoryPackagesController.toggleStatus);

export default router;

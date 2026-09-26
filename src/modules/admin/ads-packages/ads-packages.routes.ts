import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { adminAdPackagesController } from './ads-packages.controller';

const router = Router();

router.get('/', adminAdPackagesController.list);
router.get('/stats', adminAdPackagesController.stats);
router.get('/:id', validate({ params: objectIdParamSchema }), adminAdPackagesController.getById);
router.post('/', adminAdPackagesController.create);
router.patch('/:id', validate({ params: objectIdParamSchema }), adminAdPackagesController.update);
router.delete('/:id', validate({ params: objectIdParamSchema }), adminAdPackagesController.delete);
router.patch('/:id/toggle-status', validate({ params: objectIdParamSchema }), adminAdPackagesController.toggleStatus);

export default router;

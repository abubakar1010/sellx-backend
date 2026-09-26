import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { adminBoostPlansController } from './boost-plans.controller';

const router = Router();

router.get('/', adminBoostPlansController.list);
router.get('/:id', validate({ params: objectIdParamSchema }), adminBoostPlansController.getById);
router.post('/', adminBoostPlansController.create);
router.patch('/:id', validate({ params: objectIdParamSchema }), adminBoostPlansController.update);
router.delete('/:id', validate({ params: objectIdParamSchema }), adminBoostPlansController.delete);
router.patch('/:id/toggle-status', validate({ params: objectIdParamSchema }), adminBoostPlansController.toggleStatus);

export default router;

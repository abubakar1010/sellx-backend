import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { adminListingPackagesController } from './listing-packages.controller';

const router = Router();

router.get('/', adminListingPackagesController.list);
router.get('/:id', validate({ params: objectIdParamSchema }), adminListingPackagesController.getById);
router.post('/', adminListingPackagesController.create);
router.patch('/:id', validate({ params: objectIdParamSchema }), adminListingPackagesController.update);
router.delete('/:id', validate({ params: objectIdParamSchema }), adminListingPackagesController.delete);
router.patch('/:id/toggle-status', validate({ params: objectIdParamSchema }), adminListingPackagesController.toggleStatus);

export default router;

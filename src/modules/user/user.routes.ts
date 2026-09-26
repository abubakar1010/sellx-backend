import { Router } from 'express';

import { ROLES } from '@/core/constants/roles';
import { validate } from '@/shared/middlewares/validate';
import { authorize } from '@/shared/middlewares/authorize';
import { authenticate } from '@/shared/middlewares/authenticate';
import { uploadSingle } from '@/shared/middlewares/upload';

import { userController } from './user.controller';
import {
    listUsersQuerySchema,
    objectIdParamSchema,
    updateProfileBodySchema,
    updateUserSchema,
} from './user.validation';

const router = Router();

router.get('/:id', validate({ params: objectIdParamSchema }), userController.getPublicProfile);

router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', uploadSingle('avatarURL', 'users'), userController.updateMe);


router.get('/', validate({ query: listUsersQuerySchema }), userController.listUsers);

router.patch(
    '/:id',
    validate({ params: objectIdParamSchema, body: updateUserSchema }),
    userController.updateUser,
);
router.delete(
    '/:id',
    authorize(ROLES.SUPER_ADMIN),
    validate({ params: objectIdParamSchema }),
    userController.deleteUser,
);

// Soft delete self
router.delete('/me', userController.deleteMe);

// Profile switching
router.post('/switch/profile', userController.switchToProfile);
router.post('/switch/store/:storeId', userController.switchToStore);

export default router;

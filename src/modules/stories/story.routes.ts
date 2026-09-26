import { Router } from 'express';
import { authenticate, optionalAuth } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { setUploadDir, uploadImages } from '@/shared/middlewares/upload';
import { parseFormData } from '@/shared/middlewares/parseFormData';
import { storyController } from './story.controller';
import { createStoryBodySchema, updateStoryBodySchema, listStoriesQuerySchema } from './story.validation';
import { objectIdParamSchema } from '../user/user.validation';

const router = Router();

router.get('/', optionalAuth, validate({ query: listStoriesQuerySchema }), storyController.list);
router.get('/:id', optionalAuth, validate({ params: objectIdParamSchema }), storyController.getById);

router.use(authenticate);

router.post('/', setUploadDir('stories'), uploadImages, parseFormData, validate({ body: createStoryBodySchema }), storyController.create);
router.patch('/:id', validate({ params: objectIdParamSchema, body: updateStoryBodySchema }), storyController.update);
router.delete('/:id', validate({ params: objectIdParamSchema }), storyController.delete);

export default router;

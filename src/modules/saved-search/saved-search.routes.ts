import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { savedSearchController } from './saved-search.controller';
import {
    createSavedSearchBodySchema,
    updateSavedSearchBodySchema,
    listSavedSearchesQuerySchema,
    savedSearchIdParamSchema,
} from './saved-search.validation';

const router = Router();

router.use(authenticate);

router.post('/', validate({ body: createSavedSearchBodySchema }), savedSearchController.create);
router.patch('/:id', validate({ params: savedSearchIdParamSchema, body: updateSavedSearchBodySchema }), savedSearchController.update);
router.get('/', validate({ query: listSavedSearchesQuerySchema }), savedSearchController.list);
router.delete('/:id', validate({ params: savedSearchIdParamSchema }), savedSearchController.delete);

export default router;

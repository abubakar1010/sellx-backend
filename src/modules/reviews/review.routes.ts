import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { reviewController } from './review.controller';
import {
    createReviewBodySchema,
    reviewQuerySchema,
    myReviewsQuerySchema,
    updateReviewBodySchema,
} from './review.validation';

const router = Router();

router.post('/', authenticate, validate({ body: createReviewBodySchema }), reviewController.create);
router.get('/', validate({ query: reviewQuerySchema }), reviewController.list);
router.get('/public/user/:userId', reviewController.getPublicUserOverview);
router.get('/my', authenticate, validate({ query: myReviewsQuerySchema }), reviewController.myReviews);
router.patch('/:id', authenticate, validate({ body: updateReviewBodySchema }), reviewController.update);
router.delete('/:id', authenticate, reviewController.delete);

export default router;
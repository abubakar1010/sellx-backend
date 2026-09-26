import { catchAsync } from '@shared/utils/catchAsync';
import { sendResponse } from '@shared/utils/sendResponse';
import { HTTP_STATUS } from '@core/constants/httpStatus';
import { UnauthorizedError, BadRequestError } from '@core/errors';
import { reviewService } from './review.service';
import { serializeReview } from './review.serializer';
import {
    createReviewBodySchema,
    reviewQuerySchema,
    myReviewsQuerySchema,
    updateReviewBodySchema,
} from './review.validation';
import type { Request, Response } from 'express';

const getParamId = (id: unknown): string => {
    if (typeof id === 'string') return id;
    throw new Error('Invalid ID parameter');
};

export const reviewController = {
    create: catchAsync(async (req: Request, res: Response) => {
        const body = createReviewBodySchema.parse(req.body);
        const review = await reviewService.createReview(req.user!.id, body);

        sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Review created successfully',
            data: serializeReview(review as any),
        });
    }),

    list: catchAsync(async (req: Request, res: Response) => {
        const query = reviewQuerySchema.parse(req.query);
        const result = await reviewService.getReviews(query);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Reviews fetched successfully',
            data: {
                rows: result.data.map((r: any) => serializeReview(r)),
                meta: result.meta,
            },
        });
    }),

    getPublicUserOverview: catchAsync(async (req: Request, res: Response) => {
        const overview = await reviewService.getUserReviewsOverview(req.params.userId as string);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Reviews overview fetched successfully',
            data: overview,
        });
    }),

    myReviews: catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?.id;
        if (!userId) throw new UnauthorizedError('Authentication required');

        const query = myReviewsQuerySchema.parse(req.query);

        switch (query.filter) {
            case 'overview': {
                const overview = await reviewService.getMyReviewsOverview(userId);
                return sendResponse(res, {
                    statusCode: HTTP_STATUS.OK,
                    message: 'Overview fetched successfully',
                    data: overview,
                });
            }
            case 'received': {
                const result = await reviewService.getReceivedReviews(userId, query);
                return sendResponse(res, {
                    statusCode: HTTP_STATUS.OK,
                    message: 'Received reviews fetched successfully',
                    data: { rows: result.data, meta: result.meta },
                });
            }
            case 'given': {
                const result = await reviewService.getGivenReviews(userId, query);
                return sendResponse(res, {
                    statusCode: HTTP_STATUS.OK,
                    message: 'Given reviews fetched successfully',
                    data: { rows: result.data, meta: result.meta },
                });
            }
            default:
                throw new BadRequestError('Invalid filter value');
        }
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?.id;
        if (!userId) throw new UnauthorizedError('Authentication required');

        const reviewId = getParamId(req.params.id);
        const body = updateReviewBodySchema.parse(req.body);
        const updated = await reviewService.updateReview(userId, reviewId, body);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Review updated successfully',
            data: serializeReview(updated),
        });
    }),

    delete: catchAsync(async (req: Request, res: Response) => {
        const reviewId = getParamId(req.params.id);
        await reviewService.deleteReview(req.user!.id, reviewId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.NO_CONTENT,
            message: 'Review deleted successfully',
            data: null,
        });
    }),
};
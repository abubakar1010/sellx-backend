import { BadRequestError, UnauthorizedError } from '@/core/errors';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { storeService } from './store.service';
import { serializeStore } from './store.serializer';
import { getFileUrl } from '@/infrastructure/storage/local-storage';
import { storeReviewsQuerySchema, storeProductsQuerySchema } from './store.validation';
import { reviewService } from '../reviews/review.service';
import { serializeReview } from '../reviews/review.serializer';
import { productService } from '../products/product.service';
import { serializeProducts } from '../products/product.serializer';
import { storeFollowService } from './store-follow.service';
import { storeTrackingProducer } from '@/jobs/producers/store-tracking.producer';
import { enqueueInBackground } from '@/jobs/producers/background';

const getUserId = (userId?: string): string => {
    if (!userId) throw new UnauthorizedError('Authentication required');
    return userId;
};

export const storeController = {
    listStores: catchAsync(async (req, res) => {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const result = await storeService.listStores(page, limit);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Stores fetched successfully',
            data: result,
        });
    }),

    createStore: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);

        const files = req.files as Record<string, Express.Multer.File[]> | undefined;
        const payload = { ...req.body };
        if (files?.logo?.[0]) {
            payload.logo = getFileUrl(files.logo[0].filename, 'stores');
        }
        if (files?.banner?.[0]) {
            payload.banner = getFileUrl(files.banner[0].filename, 'stores');
        }

        const store = await storeService.createStore(userId, payload);

        sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Store created successfully',
            data: serializeStore(store as any),
        });
    }),

    getSelfStore: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const store = await storeService.getSelfStore(userId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Store fetched successfully',
            data: serializeStore(store as any),
        });
    }),

    updateSelfStore: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);

        const files = req.files as Record<string, Express.Multer.File[]> | undefined;
        const payload = { ...req.body };
        if (files?.logo?.[0]) {
            payload.logo = getFileUrl(files.logo[0].filename, 'stores');
        }
        if (files?.banner?.[0]) {
            payload.banner = getFileUrl(files.banner[0].filename, 'stores');
        }

        const updated = await storeService.updateSelfStore(userId, payload);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Store updated successfully',
            data: serializeStore(updated as any),
        });
    }),

    getStoreBySlug: catchAsync(async (req, res) => {
        const slug = req.params.slug as string;
        if (!slug) throw new BadRequestError('Store slug is required');

        const store = await storeService.getStoreBySlug(slug);

        enqueueInBackground(
            'store-tracking:store-view',
            storeTrackingProducer.addJob('store-view', {
                storeId: store.id,
                type: 'view',
            }),
        );

        let isFollowing: boolean | undefined;
        if (req.user?.id) {
            isFollowing = await storeFollowService.isFollowing(req.user.id, store.id);
        }

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Store fetched successfully',
            data: serializeStore(store as any, { isFollowing }),
        });
    }),

    getSelfStoreReviews: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const query = storeReviewsQuerySchema.parse(req.query);

        const store = await storeService.getUserStore(userId);
        if (!store) throw new BadRequestError('No store found');

        switch (query.filter) {
            case 'overview': {
                const overview = await reviewService.getStoreReviewsOverview(store.id);
                return sendResponse(res, {
                    statusCode: HTTP_STATUS.OK,
                    message: 'Overview fetched successfully',
                    data: overview,
                });
            }
            case 'received': {
                const result = await reviewService.getReceivedReviewsForStore(store.id, query);
                return sendResponse(res, {
                    statusCode: HTTP_STATUS.OK,
                    message: 'Received reviews fetched successfully',
                    data: {
                        rows: result.data.map((r: any) => serializeReview(r)),
                        meta: result.meta,
                    },
                });
            }
            default:
                throw new BadRequestError('Invalid filter value');
        }
    }),

    getSelfStoreProducts: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const query = storeProductsQuerySchema.parse(req.query);

        const store = await storeService.getUserStore(userId);
        if (!store) throw new BadRequestError('No store found');

        const result = await productService.listStoreProducts(store.id, query);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Store products fetched successfully',
            data: {
                rows: serializeProducts(result.data as any),
                meta: result.meta,
            },
        });
    }),
};

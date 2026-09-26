import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { adminStoresQuerySchema, toggleStoreStatusBodySchema, storeAdsQuerySchema, storeProductsQuerySchema } from './stores.validation';
import { adminStoresService } from './stores.service';
import { addActivityJob } from '@/jobs/producers/activity.producer';
import { objectIdParamSchema } from '@/modules/user/user.validation';

export const adminStoresController = {
    list: catchAsync(async (req: Request, res: Response) => {
        const query = adminStoresQuerySchema.parse(req.query);
        const data = await adminStoresService.list(query);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Stores fetched successfully.',
            data,
        });
    }),

    stats: catchAsync(async (_req: Request, res: Response) => {
        const data = await adminStoresService.getStats();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Store stats fetched successfully.',
            data,
        });
    }),

    detail: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const data = await adminStoresService.getDetail(id);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Store details fetched successfully.',
            data,
        });
    }),

    toggleStatus: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const { status: newStatus } = toggleStoreStatusBodySchema.parse(req.body);
        const updated = await adminStoresService.toggleStatus(id, newStatus);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'store',
            message: `Store "${updated.name}" status changed to ${newStatus}.`,
            metadata: { storeId: id, status: newStatus },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: `Store status updated to ${newStatus}.`,
            data: updated,
        });
    }),

    listAds: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const query = storeAdsQuerySchema.parse(req.query);
        const data = await adminStoresService.listAds(id, query.page, query.limit);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Store ads fetched successfully.',
            data,
        });
    }),

    listPayments: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const query = storeAdsQuerySchema.parse(req.query);
        const data = await adminStoresService.listPayments(id, query.page, query.limit);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Store payments fetched successfully.',
            data,
        });
    }),

    listProducts: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const query = storeProductsQuerySchema.parse(req.query);
        const data = await adminStoresService.listStoreProducts(id, query);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Store products fetched successfully.',
            data,
        });
    }),
};

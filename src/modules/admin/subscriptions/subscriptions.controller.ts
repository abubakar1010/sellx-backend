import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { subscriptionService } from '@/modules/subscriptions/subscription.service';
import {
    createSubscriptionBodySchema,
    updateSubscriptionBodySchema,
} from '@/modules/subscriptions/subscription.validation';
import { objectIdParamSchema } from '@/modules/user/user.validation';

export const adminSubscriptionsController = {
    getById: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const data = await subscriptionService.getById(id);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Subscription fetched successfully.',
            data,
        });
    }),

    list: catchAsync(async (_req: Request, res: Response) => {
        const data = await subscriptionService.getAll();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Subscriptions fetched successfully.',
            data,
        });
    }),

    create: catchAsync(async (req: Request, res: Response) => {
        const body = createSubscriptionBodySchema.parse(req.body);
        const subscription = await subscriptionService.create(body);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Subscription created successfully.',
            data: subscription,
        });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const body = updateSubscriptionBodySchema.parse(req.body);
        const updated = await subscriptionService.update(id, body);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Subscription updated successfully.',
            data: updated,
        });
    }),

    delete: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        await subscriptionService.delete(id);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Subscription deleted successfully.',
            data: null,
        });
    }),

    toggleStatus: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const updated = await subscriptionService.toggleStatus(id);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: `Subscription ${updated.isActive ? 'activated' : 'deactivated'} successfully.`,
            data: updated,
        });
    }),
};

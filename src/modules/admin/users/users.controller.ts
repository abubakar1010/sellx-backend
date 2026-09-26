import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import {
    adminUsersQuerySchema,
    toggleUserStatusBodySchema,
    UserProductsQuery,
    userProductsQuerySchema,
} from './users.validation';
import { adminUsersService } from './users.service';
import { addActivityJob } from '@/jobs/producers/activity.producer';
import { objectIdParamSchema } from '@/modules/user/user.validation';

export const adminUsersController = {
    list: catchAsync(async (req: Request, res: Response) => {
        const query = adminUsersQuerySchema.parse(req.query);
        const data = await adminUsersService.list(query);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Users fetched successfully.',
            data,
        });
    }),

    stats: catchAsync(async (_req: Request, res: Response) => {
        const data = await adminUsersService.getStats();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'User stats fetched successfully.',
            data,
        });
    }),

    toggleStatus: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const { status: newStatus } = toggleUserStatusBodySchema.parse(req.body);
        const updated = await adminUsersService.toggleStatus(id, newStatus);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'user',
            message: `User "${updated.fullName}" was ${newStatus === 'blocked' ? 'blocked' : 'unblocked'}.`,
            metadata: { userId: id, status: newStatus },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: `User ${newStatus === 'blocked' ? 'blocked' : 'activated'} successfully.`,
            data: updated,
        });
    }),

    detail: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const data = await adminUsersService.getDetail(id);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'User details fetched successfully.',
            data,
        });
    }),

    listProducts: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const query = userProductsQuerySchema.parse(req.query);
        const data = await adminUsersService.listUserProducts(id, query);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'User products fetched successfully.',
            data,
        });
    }),
};

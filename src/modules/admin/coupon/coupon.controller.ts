import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { couponService } from '@/modules/coupon/coupon.service';
import {
    createCouponBodySchema,
    updateCouponBodySchema,
} from '@/modules/coupon/coupon.validation';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { addActivityJob } from '@/jobs/producers/activity.producer';

export const adminCouponController = {
    list: catchAsync(async (_req: Request, res: Response) => {
        const data = await couponService.getAll();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Coupons fetched successfully.',
            data,
        });
    }),

    stats: catchAsync(async (_req: Request, res: Response) => {
        const data = await couponService.getStats();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Coupon stats fetched successfully.',
            data,
        });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const data = await couponService.getById(id);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Coupon fetched successfully.',
            data,
        });
    }),

    create: catchAsync(async (req: Request, res: Response) => {
        const body = createCouponBodySchema.parse(req.body);
        const data = await couponService.create(body);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: data._id?.toString() ?? data.id,
            targetType: 'coupon',
            message: `Coupon "${data.code}" created.`,
            metadata: { couponId: data._id?.toString() ?? data.id, code: data.code },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Coupon created successfully.',
            data,
        });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const body = updateCouponBodySchema.parse(req.body);
        const data = await couponService.update(id, body);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'coupon',
            message: `Coupon "${data.code}" updated.`,
            metadata: { couponId: id, code: data.code },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Coupon updated successfully.',
            data,
        });
    }),

    delete: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        await couponService.delete(id);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'coupon',
            message: `Coupon deleted.`,
            metadata: { couponId: id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Coupon deleted successfully.',
            data: null,
        });
    }),

    toggleStatus: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const data = await couponService.toggleStatus(id);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'coupon',
            message: `Coupon "${data.code}" ${data.isActive ? 'activated' : 'deactivated'}.`,
            metadata: { couponId: id, code: data.code, isActive: data.isActive },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: `Coupon ${data.isActive ? 'activated' : 'deactivated'} successfully.`,
            data,
        });
    }),
};

import type { Request, Response } from 'express';
import { z } from 'zod';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { AdPackageModel } from '@/modules/ads/ads.model';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { addActivityJob } from '@/jobs/producers/activity.producer';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { BoostPlanModel } from '@/modules/products/products.model';
import { PaymentTransactionModel } from '@/modules/payments/payment.model';

const createAdPackageBodySchema = z.object({
    name: z.string().trim().min(1).max(100),
    durationDays: z.number().int().min(1),
    price: z.number().min(0),
    adType: z.string().trim().min(1),
});

const updateAdPackageBodySchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    durationDays: z.number().int().min(1).optional(),
    price: z.number().min(0).optional(),
    adType: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
});

export const adminAdPackagesController = {
    stats: catchAsync(async (_req: Request, res: Response) => {
        const [activeBoostPlansCount, boostRevenueResult] = await Promise.all([
            BoostPlanModel.countDocuments({ isActive: true }),
            PaymentTransactionModel.aggregate([
                { $match: { paymentType: 'boost', status: 'approved' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
        ]);

        const boostRevenue = boostRevenueResult.length > 0 ? boostRevenueResult[0].total : 0;

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Ads packages stats fetched successfully.',
            data: { activeBoostPlansCount, boostRevenue },
        });
    }),

    list: catchAsync(async (_req: Request, res: Response) => {
        const data = await AdPackageModel.find().sort({ price: 1 }).lean();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Ad packages fetched successfully.',
            data,
        });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const doc = await AdPackageModel.findById(id).lean();
        if (!doc) throw new NotFoundError('Ad package not found');

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Ad package fetched successfully.',
            data: doc,
        });
    }),

    create: catchAsync(async (req: Request, res: Response) => {
        const body = createAdPackageBodySchema.parse(req.body);

        const existing = await AdPackageModel.findOne({ durationDays: body.durationDays });
        if (existing) throw new BadRequestError('Ad package with this duration already exists');

        const data = await AdPackageModel.create(body);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: data._id?.toString() ?? data.id,
            targetType: 'ad_package',
            message: `Ad package "${data.name}" created.`,
            metadata: { adPackageId: data._id?.toString() ?? data.id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Ad package created successfully.',
            data,
        });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const body = updateAdPackageBodySchema.parse(req.body);

        const updated = await AdPackageModel.findByIdAndUpdate(id, { $set: body }, { new: true });
        if (!updated) throw new NotFoundError('Ad package not found');

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'ad_package',
            message: `Ad package "${updated.name}" updated.`,
            metadata: { adPackageId: id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Ad package updated successfully.',
            data: updated,
        });
    }),

    delete: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const existing = await AdPackageModel.findById(id);
        if (!existing) throw new NotFoundError('Ad package not found');
        await AdPackageModel.deleteOne({ _id: id });

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'ad_package',
            message: `Ad package "${existing.name}" deleted.`,
            metadata: { adPackageId: id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Ad package deleted successfully.',
            data: null,
        });
    }),

    toggleStatus: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const pkg = await AdPackageModel.findById(id);
        if (!pkg) throw new NotFoundError('Ad package not found');

        pkg.isActive = !pkg.isActive;
        await pkg.save();

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'ad_package',
            message: `Ad package "${pkg.name}" ${pkg.isActive ? 'activated' : 'deactivated'}.`,
            metadata: { adPackageId: id, isActive: pkg.isActive },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: `Ad package ${pkg.isActive ? 'activated' : 'deactivated'} successfully.`,
            data: pkg,
        });
    }),
};
